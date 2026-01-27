# Claude Code Notes

## Mission

Generate a personalized, evidence-based daily health protocol. The protocol must satisfy hard requirements (sleep hours, workout frequency, etc.) while optimizing for weighted goals (muscle gain, longevity, etc.).

## Gemini API

- **Model for grounding + structured output**: `gemini-3-flash-preview` is the only model compatible with both Google Search grounding and structured output. Do not change this model name.

## Project Structure

- `app/` - Next.js App Router pages and API routes
  - `(dashboard)/` - Dashboard layout group (dashboard, create, protocols/[id])
  - `api/protocol/` - API routes (generate, parse, verify, edit, modify, ask, revert, versions, delete, critiques)
- `components/protocol/` - Protocol display and editing components
- `components/forms/` - Wizard and form components
- `components/ui/` - Shared UI primitives (shadcn)
- `lib/gemini/` - Gemini API integration (generation, verification, modification, Q&A)
- `lib/schemas/` - Zod schemas for protocol data and user config
- `lib/supabase/` - Supabase client and database types
- `lib/streaming.ts` - SSE stream creation utility
- `lib/hooks/useSSEStream.ts` - Client-side SSE consumption hook

## Architecture

### Protocol Lifecycle

Protocols follow a **version chain** model. Every change creates a new row in the `protocols` table linked by `version_chain_id`. The `is_current` flag marks the latest version.

Five user-facing actions replace the old optimize/feedback loop:

- **Verify** — AI scores the protocol using Google Search grounding. Updates the current row in-place (sets `verified=true`, stores scores). No new version created.
- **Modify** — AI-assisted changes. User describes what to change, AI researches and proposes a modified protocol with score comparison. User reviews and accepts/rejects. Accepted proposals create a new version with `change_source='ai_modify'`.
- **Ask** — Saved Q&A about the protocol. Uses search grounding. Doesn't modify protocol data. History persisted in `protocol_questions` table.
- **Direct Edit** — Inline editing of protocol fields (schedule, diet, supplements, training). Each section has a "Save changes" button. Creates a new version with `change_source='direct_edit'` and `verified=false`.
- **Version History** — Slide-out drawer showing all versions in a chain. Non-current versions can be reverted (creates new version with `change_source='revert'`).

### Change Sources

Each protocol version tracks how it was created: `generated`, `imported`, `direct_edit`, `ai_modify`, `critique_apply`, or `revert`.

### Verification State

Protocols have a `verified` boolean. Newly generated/imported protocols are auto-verified. Direct edits mark the protocol as unverified, showing a warning banner prompting re-verification.

### Streaming Architecture

AI-powered features (Generate, Modify, Ask) support real-time streaming via Server-Sent Events (SSE).

**Server-side:**
- `lib/gemini/generation.ts` exports `*Stream` async generator functions (`generateProtocolStream`, `modifyProtocolStream`, `askAboutProtocolStream`) that yield text chunks and return the final parsed result.
- `lib/streaming.ts` provides `createSSEStream(generator, onComplete?)` which converts an `AsyncGenerator` into a `ReadableStream` with SSE framing. Chunk format: `data: {"chunk":"..."}\n\n`. Completion: `data: {"done":true,"result":{...}}\n\n`. Errors: `data: {"error":"..."}\n\n`.
- API routes accept `?stream=true` query param. When streaming, they return `new Response(stream, { headers: SSE_HEADERS })`. Non-streaming paths remain unchanged.
- The generate route uses a custom SSE stream (not `createSSEStream`) because it sends `stage` messages (`searching`, `generating`, `evaluating`) alongside text chunks.

**Client-side:**
- `lib/hooks/useSSEStream.ts` provides the `useSSEStream<T>()` hook returning `{ streamedText, result, error, isStreaming, startStream, reset }`.
- `startStream(url, fetchOptions)` fetches with SSE, reads chunks via `getReader()`, accumulates text, and extracts the final result.

### New Protocol Flow

`NewProtocolButton` is a dropdown with two options: "Generate new" (opens `GenerateProtocolDialog`) and "Import existing" (opens `ImportProtocolDialog`). Both complete without page navigation — the dashboard refreshes in place.

`GenerateProtocolDialog` wraps `ProtocolWizard` + `GenerationModal` inside a Dialog. On submit, it streams the generation process with real stage transitions, then closes and navigates to the new protocol via query param.

### Critique Interaction

Evaluation critiques support multi-select via checkboxes in `ProtocolDisplay`. Two actions:
- **Dismiss** — removes selected critiques from the display (persisted via `POST /api/protocol/critiques` with `action: 'dismiss'`).
- **Apply Recommendations** — calls `applyCritiqueSuggestions()` in `lib/gemini/generation.ts`, which performs a lightweight AI modification applying only the selected suggestions. Creates a new protocol version with `change_source: 'critique_apply'`. No full re-evaluation is triggered.

### Ask + Export to Modify

The Ask modal uses streaming (`useSSEStream`) for progressive answer display. The AI prompt is conversational (2-4 sentences, no bullet points unless asked). Responses include a `suggestsModification` boolean.

An "Export to Modify" button appears when there's Q&A history. It builds a context string from the last 3 Q&A pairs and passes it to the Modify modal via `ProtocolActions`, which manages the flow: closes Ask modal → sets prefilled message → opens Modify modal.

The Modify modal accepts an `initialMessage` prop for pre-population and uses streaming to show AI reasoning in real-time before presenting the score comparison and accept/reject options.

### Inline Editing Pattern

All editable sections (Schedule, Diet, Supplements, Training) separate **expand** from **edit**:
- Chevron click toggles read-only detail expansion (e.g., foods list, exercise details)
- Pencil button enters edit mode (shows input fields)
- Both states are independent — editing auto-expands the item
- A global "Save changes" button commits all draft changes as a new protocol version

## UI Style Guide

### Design Philosophy

The interface is a **coach, not a classroom**. It doesn't teach you exercise science or explain why vitamin D matters — it tells you exactly what to do today, with enough underlying rigor that a biohacking enthusiast can interrogate every decision and a beginner can just follow it.

The visual identity should feel like receiving a program from someone who clearly did the homework. Not academic (no one needs to see the papers), not consumer-wellness (no pastel illustrations or "your journey" copy). The aesthetic is **confident, dense, and precise** — a daily briefing you scan in 30 seconds and trust enough to execute.

The target user takes health seriously, or wants to start. The density and precision signal credibility to both ends: a beginner sees authority and follows the plan; an enthusiast sees the numbers, knows the protocol is substantive, and challenges what they disagree with. The modification loop — where users push back, ask questions, and the AI researches and proposes changes — is a first-class interaction, not a settings page buried in a menu.

Four principles, in order:

1. **Execute, then explore.** The default state is a scannable daily protocol. Scores, critiques, and reasoning exist but never compete with the plan itself. A user should be able to open the app in the morning, see their day, and go.
2. **Density over decoration.** Protocol data is the product. Show more data per screen, not more chrome per card. A user should scan their entire daily protocol without scrolling twice.
3. **Precision over polish.** Numbers, times, and dosages must feel exact. Monospace type, right-aligned figures, explicit units. Never round for aesthetics.
4. **Challengeable confidence.** Present the protocol as a strong recommendation, not a tentative suggestion. But make the "I disagree" path obvious and friction-free. When the user pushes back, surface the reasoning — scores, critiques, trade-offs — so the conversation feels like arguing with a well-prepared coach, not overriding a black box.

### Color Palette

The primary color is **forest green**—deep, muted, and organic. It evokes old-growth forest: stability, health, and natural authority. It must never drift toward lime, mint, neon, or teal.

#### CSS Variables (drop-in replacement for `app/globals.css`)

Light mode (`:root`):
- `--background: 60 10% 98%` — warm off-white
- `--foreground: 150 20% 8%`
- `--card: 0 0% 100%`
- `--card-foreground: 150 20% 8%`
- `--popover: 0 0% 100%`
- `--popover-foreground: 150 20% 8%`
- `--primary: 152 45% 23%` — deep forest green
- `--primary-foreground: 60 20% 97%`
- `--secondary: 150 12% 93%`
- `--secondary-foreground: 150 20% 12%`
- `--muted: 150 10% 94%`
- `--muted-foreground: 150 8% 45%`
- `--accent: 150 12% 93%`
- `--accent-foreground: 150 20% 12%`
- `--destructive: 0 72% 51%`
- `--destructive-foreground: 60 20% 97%`
- `--border: 150 12% 89%`
- `--input: 150 12% 89%`
- `--ring: 152 45% 23%`
- `--radius: 0.5rem`

Dark mode (`.dark`):
- `--background: 155 25% 6%`
- `--foreground: 150 15% 93%`
- `--card: 155 20% 8%`
- `--card-foreground: 150 15% 93%`
- `--popover: 155 20% 8%`
- `--popover-foreground: 150 15% 93%`
- `--primary: 152 40% 48%`
- `--primary-foreground: 155 30% 6%`
- `--secondary: 153 18% 14%`
- `--secondary-foreground: 150 15% 93%`
- `--muted: 153 18% 14%`
- `--muted-foreground: 150 10% 60%`
- `--accent: 153 18% 14%`
- `--accent-foreground: 150 15% 93%`
- `--destructive: 0 62% 35%`
- `--destructive-foreground: 60 20% 97%`
- `--border: 153 18% 16%`
- `--input: 153 18% 16%`
- `--ring: 152 40% 48%`

Semantic status colors (both modes):
- `--success` / `--warning` / `--info` with corresponding foreground variables
- Extended `--forest-50` through `--forest-900` scale for custom accents

Add `success`, `warning`, `info`, and `forest` (50–900) to `tailwind.config.ts` `theme.extend.colors` using the `hsl(var(--name))` pattern.

#### Color Usage Rules

- **Primary actions** (buttons, links, active tabs, focus rings): use `primary`
- **Success states** (requirements met, completed steps): use `success` — never raw `text-green-500`
- **Warning states** (moderate severity, weight imbalance): use `warning` — never raw `text-yellow-500`
- **Error / destructive** (failures, major severity, delete): use `destructive` — never raw `text-red-500`
- **Informational** (neutral callouts, hydration): use `info` — never raw `text-blue-500`
- **Macro nutrient cards**: use `forest-100`/`forest-200` tints, differentiate by opacity or icon — not by assigning a different hue to each macro
- **Never use hardcoded Tailwind color classes** (`text-green-600`, `bg-yellow-50`, `bg-blue-900/30`). Always use the semantic CSS variables.

### Typography

Two font families. No exceptions.

- **Body / UI**: Inter (via `next/font/google`). All prose, labels, navigation, buttons.
- **Data**: JetBrains Mono (via `next/font/google`). All numbers, times, scores, macros, dosages, sets/reps, durations, percentages — anything quantitative. Apply via a `font-mono` utility mapped to JetBrains Mono in `tailwind.config.ts`.

Both fonts must be loaded in `app/layout.tsx` and exposed as CSS variables (`--font-sans`, `--font-mono`).

#### Type Scale

- **Page title (h1)**: `text-3xl font-bold tracking-tight` — one per page, never `text-4xl`
- **Section title (h2)**: `text-lg font-semibold tracking-tight`
- **Card title (h3)**: `text-base font-semibold leading-none tracking-tight` — not `text-2xl`, cards titles should be compact
- **Subsection label (h4)**: `text-xs font-medium uppercase tracking-widest text-muted-foreground` — this is a key differentiator; section labels like "Macros", "Warmup", "Supplements" should feel like form field labels on a medical chart
- **Body**: `text-sm` everywhere. Never `text-base` inside cards — reserve `text-base` for standalone prose paragraphs only (hero text, empty states).
- **Caption / helper**: `text-xs text-muted-foreground`
- **Data values**: `font-mono text-2xl font-semibold` for hero stats; `font-mono text-sm` for inline data (times, grams, reps)
- **Units**: Always separate from the number. Style as `font-mono text-xs text-muted-foreground` immediately after the value. e.g., `<span class="font-mono text-2xl font-semibold">185</span><span class="font-mono text-xs text-muted-foreground ml-0.5">g</span>`. Never "185g" as a single styled string.

#### Type Rules

- Weights: Only `font-medium` (500), `font-semibold` (600), `font-bold` (700). Never `font-black` or `font-thin`. Reserve `font-bold` for page titles only — everything else is `font-semibold` or `font-medium`.
- Never use italic for body text. Italic is acceptable only in blockquotes or suggestion text.
- Headings inside cards must not compete with page headings. Card titles at `text-base`, not `text-2xl`.

### Data Presentation

This is a protocol tool. Numbers are the product. Treat them accordingly.

#### Numeric Display

- All numeric values use `font-mono`. No exceptions. This includes: times (`06:30`), calories (`2,450`), macros (`185g`), scores (`8.4`), sets/reps (`3 x 10`), durations (`45 min`), dosages (`2000 IU`), percentages (`73%`).
- Large format (stat cards): `font-mono text-2xl font-semibold` with unit in `text-xs text-muted-foreground`
- Inline format (tables, lists): `font-mono text-sm`
- Right-align numbers in any column or grid layout using `text-right tabular-nums`
- Use `tabular-nums` on all numeric displays so digits align vertically
- Format calories with commas: `2,450` not `2450`
- Always show one decimal for scores: `8.4` not `8`

#### Time Display

- 24-hour format preferred: `06:30`, `14:00`, `22:00`
- Time ranges with en-dash: `06:30 – 07:15` (use ` – ` with spaces, not `-`)
- Times in `font-mono text-sm text-muted-foreground`

#### Macro Breakdown

- Always in this order: Protein, Carbs, Fat
- Compact inline format: `P 185g · C 220g · F 65g` — using middle dot separator, all in `font-mono text-xs`
- Never spell out "Protein: 185g, Carbohydrates: 220g" in data-dense contexts

### Component Guidelines

#### Buttons
- Primary action (Generate, Save): `variant="default"` — solid forest green
- Secondary action (Normalize, Add Example): `variant="outline"`
- Destructive action (Remove, Delete): `variant="ghost"` with `text-destructive` — only use solid red for confirming irreversible actions
- Navigational: `variant="link"` with `text-primary`
- Icon-only buttons: `size="icon"` with `aria-label`
- Max two buttons side by side; use `outline` for the lesser action
- Button text is always sentence case ("Generate protocol"), never title case ("Generate Protocol") or ALL CAPS

#### Cards
- Default: `rounded-lg border bg-card` — no shadows. Zero. Not even `shadow-sm` on standard cards.
- Section cards (Schedule, Diet, Training, Supplements): add a `border-l-2 border-l-primary` left accent to distinguish from generic cards. This is the signature visual element.
- Inset sections: `bg-muted/50` with no border
- Highlighted / active cards: `bg-primary/5 border-primary/20`
- Stat cards: `bg-muted rounded-lg p-4` — no border, no shadow, just a tinted rectangle with a number

#### Left-Border Accent Pattern

This is the defining visual motif. Use a `border-l-2` on:
- Section-level cards (`border-l-primary`)
- Warning callouts (`border-l-warning`)
- Error callouts (`border-l-destructive`)
- Info callouts (`border-l-info`)
- Critique items (`border-l-warning` for moderate, `border-l-destructive` for major)

This replaces background-tinted callout boxes for most use cases. A callout is a `border-l-2 border-l-warning pl-4 py-2` with text, not a `bg-warning/10 rounded-lg p-3`.

#### Inputs & Forms
- Use `Input` component with `border-input` and `focus-visible:ring-ring`
- Labels: `Label` component (`text-xs font-medium uppercase tracking-widest text-muted-foreground`) — same style as subsection labels
- Validation errors: `text-sm text-destructive` below the input
- Field groups: `space-y-4`; form sections: `space-y-6`
- Numeric inputs (weight, age, calories): add `font-mono` to the input class

#### Status Indicators
- Severity badges: `px-2 py-0.5 rounded text-xs font-medium font-mono`
  - Major: `bg-destructive/15 text-destructive`
  - Moderate: `bg-warning/15 text-warning`
  - Minor: `bg-muted text-muted-foreground`
- Completion: `CheckCircle` + `text-success`; `XCircle` + `text-destructive`; `AlertCircle` + `text-warning`
- Scores: `font-mono font-semibold text-2xl` inside `bg-muted rounded-lg` box — unit label below in `text-xs uppercase tracking-widest text-muted-foreground`

#### Modals
- Overlay: `bg-background/80 backdrop-blur-sm`
- Modal card: centered, `max-w-lg`, standard Card
- Active state: `bg-primary/10 border border-primary/20`
- Completed state: `bg-success/10 text-success`

#### Tables and Lists

Protocol data (meals, exercises, supplements) should use a **list with implicit grid** pattern, not traditional cards:

```
<div class="divide-y divide-border">
  <div class="flex items-baseline justify-between py-3">
    <span class="text-sm font-medium">Bench Press</span>
    <span class="font-mono text-sm text-muted-foreground">3 x 10</span>
  </div>
  ...
</div>
```

Use `divide-y` to separate rows. This is denser and more scannable than stacking bordered cards.

### Spacing & Layout

- Page container: `container mx-auto px-4 py-8`
- Section gaps: `space-y-8` between major sections (schedule/diet/training/supplements); `space-y-3` within sections — tighter internal spacing than the gap between sections creates clear grouping
- Card padding: `p-5` (not `p-6` — slightly tighter feels more professional)
- Grid layouts: `grid-cols-1 md:grid-cols-2` or `md:grid-cols-3` with `gap-3`
- Max content width: `max-w-4xl mx-auto` for protocol display; `max-w-xl mx-auto` for forms (narrower than typical — forces focus)
- Border radius: `rounded-lg` (cards), `rounded-md` (buttons/inputs), `rounded-sm` (badges, tab triggers). Only `rounded-full` for timeline dots and avatar circles.
- Horizontal rules: Use `<Separator />` or `border-t` between major card sections. Don't rely on spacing alone to separate content groups inside a card.

### Motion

Minimal and functional. Never decorative.

- **Only transition**: `transition-colors duration-150 ease-out`. No `transition-all`. No `duration-300`. No spring/bounce.
- **Loading**: `animate-spin` on `Loader2` icon only. No skeleton screens, no shimmer effects, no progress bars.
- **Page transitions**: None. Instant navigation.
- **Hover states**: Color change only (`hover:bg-muted`, `hover:text-primary`). No scale, no translate, no shadow changes.
- **Focus rings**: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`. No custom focus animations.

### Iconography

- **Library**: Lucide React only. No additional icon libraries.
- **Sizes**: `h-4 w-4` inline with text; `h-5 w-5` in card titles and status indicators; `h-8 w-8` modal hero only. Never larger than `h-8 w-8`.
- **Color**: Semantic classes only (`text-primary`, `text-success`, `text-warning`, `text-destructive`, `text-info`, `text-muted-foreground`)
- **Placement**: Left of text with `gap-2`. One icon per card title, one per status badge.
- **Usage limit**: Icons are labels, not decoration. If an icon doesn't help the user identify a section or status faster, remove it. Never use more than one icon per line of text.

### Do's and Don'ts

**Do:**
- Use `font-mono` for every number, time, dosage, and score
- Use `uppercase tracking-widest text-xs` for section/category labels
- Use `border-l-2` accent pattern for callouts and section cards
- Use `divide-y` for data lists instead of stacked cards
- Separate numeric values from their units with distinct styling
- Right-align numbers in grids and columns
- Keep card titles at `text-base`, not `text-2xl`
- Use `transition-colors duration-150` exclusively for interactive elements
- Support dark mode via CSS variables

**Don't:**
- Use hardcoded Tailwind color classes (`text-green-600`, `bg-yellow-100`, etc.)
- Add shadows to cards — use borders and left-accents instead
- Add gradients, glows, animated backgrounds, or decorative patterns
- Use more than two font weights in a single component
- Use `font-black`, `font-thin`, or italic body text
- Use emoji in the UI
- Use `text-2xl` or larger for card titles — that's for page titles and stat values only
- Create color-only status distinctions without an icon or text label (accessibility)
- Use saturated or bright accent colors — the palette is deliberately muted
- Use `rounded-full` on cards or buttons
- Use `transition-all` or `duration-300` — the UI should feel instant, not animated
- Use skeleton loaders or shimmer effects — a spinner with a text label is sufficient
- Spell out data that can be abbreviated (`P 185g` not `Protein: 185 grams`)
