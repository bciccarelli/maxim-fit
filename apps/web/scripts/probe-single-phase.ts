/**
 * Probe: single-phase grounding + structured output on gemini-3.1.
 *
 * The two-phase Ask pipeline (research → apply) exists because older Gemini
 * models couldn't combine Google Search grounding with responseSchema in one
 * call. Gemini 3.1 reportedly supports both. This probe tries it and reports
 * what comes back.
 *
 * Run from apps/web: `npx tsx scripts/probe-single-phase.ts`
 */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
loadEnv({ path: resolve(__dirname, '../.env.local') });

import { getGeminiClient } from '../lib/gemini/client';
import { askResultSchema, normalizeGeminiOperations } from '../lib/gemini/generation';
import { validateOperations, protocolOperationSchema, applyOperations, type ProtocolOperation } from '@protocol/shared';
import { normalizeProtocol } from '@protocol/shared/schemas/protocol';
import type { DailyProtocol } from '@protocol/shared/schemas/protocol';

const QUESTION = 'Please add three strength exercises to each of my existing workouts.';
const MODELS_TO_TRY = ['gemini-3.1-pro-preview', 'gemini-3.1-flash-lite-preview'];

const rawProtocol = {
  schedules: [
    {
      label: 'Daily Schedule',
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      wake_time: '06:30',
      sleep_time: '22:00',
      other_events: [],
      routine_events: [],
    },
  ],
  diet: {
    daily_calories: 2400,
    protein_target_g: 180,
    carbs_target_g: 240,
    fat_target_g: 70,
    meals: [
      { name: 'Breakfast', time: '07:30', foods: ['Oats', 'Eggs'], calories: 600, protein_g: 40, carbs_g: 70, fat_g: 18 },
      { name: 'Lunch', time: '13:00', foods: ['Chicken', 'Rice'], calories: 800, protein_g: 60, carbs_g: 90, fat_g: 20 },
      { name: 'Dinner', time: '19:00', foods: ['Salmon', 'Sweet potato'], calories: 1000, protein_g: 80, carbs_g: 80, fat_g: 32 },
    ],
    hydration_oz: 100,
    dietary_notes: [],
  },
  supplementation: {
    supplements: [
      { name: 'Creatine', dosage_amount: '5', dosage_unit: 'g', time: '07:30', timing: 'with breakfast', purpose: 'strength' },
    ],
    general_notes: [],
  },
  training: {
    days_per_week: 3,
    workouts: [
      { name: 'Upper Body', day: 'monday', time: '17:30', duration_min: 45, exercises: [{ name: 'Bench Press', sets: 3, reps: '8-10', notes: null, duration_min: null, rest_sec: 90 }] },
      { name: 'Lower Body', day: 'wednesday', time: '17:30', duration_min: 45, exercises: [{ name: 'Back Squat', sets: 3, reps: '8-10', notes: null, duration_min: null, rest_sec: 120 }] },
      { name: 'Full Body', day: 'friday', time: '17:30', duration_min: 45, exercises: [{ name: 'Deadlift', sets: 3, reps: '5', notes: null, duration_min: null, rest_sec: 180 }] },
    ],
  },
};

function buildPrompt(protocol: DailyProtocol, question: string): string {
  const workoutRefs = protocol.training.workouts
    .map((w) => {
      const exs = w.exercises.map((e) => `    - "${e.name}" → id: "${e.id}"`).join('\n');
      return `  - "${w.name}" (${w.day}) → id: "${w.id}"\n${exs}`;
    })
    .join('\n');

  return `You are a protocol advisor for Maxim. You draft suggested changes to a user's health protocol. Every operation you produce is a proposal the user will review and accept or dismiss. Your answer describes what you are proposing, not what you have done.

## Element ID Reference
### Workouts & Exercises
${workoutRefs || '(none)'}

## Current Protocol
${JSON.stringify(protocol, null, 2)}

## User's Question
${question}

## Instructions

Use Google Search to research the user's request against current evidence-based exercise science, then propose operations.

- For create-exercise ops: set elementType="exercise", elementId="", parentId to the target workout's id (starts with "wk_"), and populate exerciseFields with { name, sets (integer), reps (string like "8-10"), optionally rest_sec, duration_min, notes }.
- **Bulk create rule (strict): if the user asks to add exercises to EVERY workout, emit exactly one create-exercise op per workout id in the reference table above — no fewer, no duplicates on the same parentId.** If the research suggests the volume is aggressive, still emit the full set and surface the caution in your answer text only.

**Exact shape for a create-exercise op:**
\`\`\`json
{
  "op": "create",
  "elementId": "",
  "elementType": "exercise",
  "parentId": "wk_xxxxxxxx",
  "exerciseFields": { "name": "Pull-ups", "sets": 3, "reps": "6-8", "rest_sec": 90 },
  "reason": "Add vertical pull volume to balance pressing."
}
\`\`\`

Return your final output as JSON matching the response schema: { answer, operations[] }.`;
}

async function tryModel(model: string, withGrounding: boolean, withSchema: boolean) {
  console.log(`\n━━━━━ MODEL: ${model} | grounding=${withGrounding} | schema=${withSchema} ━━━━━`);
  const client = getGeminiClient();
  const protocol = normalizeProtocol(rawProtocol) as DailyProtocol;
  const prompt = buildPrompt(protocol, QUESTION);

  const cfg: any = {};
  if (withGrounding) cfg.tools = [{ googleSearch: {} }];
  if (withSchema) {
    cfg.responseMimeType = 'application/json';
    cfg.responseSchema = askResultSchema as any;
  }

  try {
    let response: any;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = await client.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: cfg,
        });
        break;
      } catch (err) {
        const msg = (err as Error).message ?? '';
        if (!msg.includes('fetch failed') || attempt === 3) throw err;
        console.log(`  [retry ${attempt}/3 after fetch failed]`);
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }

    const text = response.text;
    if (!text) {
      console.log('[empty response]');
      return;
    }

    console.log('--- raw text (first 400 chars) ---');
    console.log(text.slice(0, 400));

    // Try to parse as JSON
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Strip ```json ... ``` fences if present, then extract a JSON object
      const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      const candidate = fenced ? fenced[1] : text;
      try {
        parsed = JSON.parse(candidate.trim());
      } catch {
        const m = candidate.match(/\{[\s\S]*\}/);
        if (m) {
          try { parsed = JSON.parse(m[0]); } catch { /* fall through */ }
        }
      }
    }

    if (!parsed) {
      console.log('[could not parse JSON from response]');
      return;
    }

    const normalized = normalizeGeminiOperations(Array.isArray(parsed.operations) ? parsed.operations : []);
    const zodParsed: ProtocolOperation[] = [];
    for (const raw of normalized ?? []) {
      const r = protocolOperationSchema.safeParse(raw);
      if (r.success) zodParsed.push(r.data);
    }
    const valid = validateOperations(protocol, zodParsed);

    console.log(`--- counts: raw=${parsed.operations?.length ?? 0}, normalized=${normalized?.length ?? 0}, zod=${zodParsed.length}, valid=${valid.length} ---`);

    const perWorkout = new Map<string, number>();
    for (const op of valid) {
      if (op.op === 'create' && op.elementType === 'exercise') {
        const pid = (op.parentId as string | undefined) ?? '(none)';
        perWorkout.set(pid, (perWorkout.get(pid) ?? 0) + 1);
      }
    }
    for (const [pid, n] of perWorkout) console.log(`  parentId=${pid} → ${n} exercise(s)`);

    // Grounding metadata
    const groundingMeta = (response as any).candidates?.[0]?.groundingMetadata;
    if (groundingMeta?.webSearchQueries?.length) {
      console.log('--- search queries ---');
      for (const q of groundingMeta.webSearchQueries) console.log(`  • ${q}`);
    }

    const after = applyOperations(protocol, valid);
    console.log('--- applied result ---');
    for (const w of after.training.workouts) {
      console.log(`  ${w.id} ${w.day} exercises: ${w.exercises.length}`);
      for (const ex of w.exercises) console.log(`      - ${ex.name} sets=${ex.sets ?? '—'} reps=${ex.reps ?? '—'}`);
    }
  } catch (err) {
    console.log(`[error] ${(err as Error).message?.slice(0, 500)}`);
  }
}

async function main() {
  for (const model of MODELS_TO_TRY) {
    // 1: grounding + schema (the real question)
    await tryModel(model, true, true);
    // 2: grounding only, no schema — baseline for what the model does with freedom
    await tryModel(model, true, false);
    // 3: schema only, no grounding — baseline (equivalent to current Phase 2)
    await tryModel(model, false, true);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
