/**
 * Probe: apply the "deterministic protocol editor" reframe with explicit
 * override clauses, then test across three models:
 *   - gemini-3-flash-preview       (3.0 flash)
 *   - gemini-3.1-flash-lite-preview
 *   - gemini-3.1-pro-preview
 *
 * For each, run 2 trials: grounding on + no schema (the config that worked
 * on flash-lite previously). Report per-workout op counts + token usage.
 */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
loadEnv({ path: resolve(__dirname, '../.env.local') });

import { getGeminiClient } from '../lib/gemini/client';
import { normalizeGeminiOperations } from '../lib/gemini/generation';
import { validateOperations, protocolOperationSchema, applyOperations, type ProtocolOperation } from '@protocol/shared';
import { normalizeProtocol } from '@protocol/shared/schemas/protocol';
import type { DailyProtocol } from '@protocol/shared/schemas/protocol';

const QUESTION = 'Please add three strength exercises to each of my existing workouts.';
const MODELS = ['gemini-3-flash-preview', 'gemini-3.1-flash-lite-preview', 'gemini-3.1-pro-preview'];
const TRIALS_PER_MODEL = 2;

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

function buildReframedPrompt(protocol: DailyProtocol, question: string): string {
  const workoutRefs = protocol.training.workouts
    .map((w) => {
      const exs = w.exercises.map((e) => `    - "${e.name}" → id: "${e.id}"`).join('\n');
      return `  - "${w.name}" (${w.day}) → id: "${w.id}"\n${exs}`;
    })
    .join('\n');

  return `You are a deterministic protocol editor for Maxim. Your job is to emit exactly the operations the user requests against their health protocol. You do NOT second-guess the user's intent, reduce scope, phase in changes, or limit the number of operations you emit. If you have a concern (training volume, recovery, overtraining, injury risk, dosage, anything), surface it in the "answer" field only — never by producing fewer operations than the user asked for.

## Literal-count rule
- If the user asks to add N exercises to each of their M workouts, emit exactly N × M create-exercise ops.
- If the user asks for a change on every workout/meal/supplement, emit one op per target — do not consolidate, do not phase.
- You may use Google Search to research what specific exercises/supplements/foods to propose, but the *number* of operations is set by the user, not by the research.

## Element ID Reference
### Workouts & Exercises
${workoutRefs || '(none)'}

## Current Protocol
${JSON.stringify(protocol, null, 2)}

## User's Question
${question}

## Instructions

Use Google Search to research the user's request against current evidence-based exercise science, then emit operations.

For create-exercise ops:
- elementType: "exercise"
- elementId: ""
- parentId: the target workout's id from the reference table (starts with "wk_")
- exerciseFields: { name (descriptive, no placeholders), sets (integer), reps (string like "8-10"), optionally rest_sec, duration_min, notes }
- reason: one short sentence

**Bulk create rule (strict): one create-exercise op per workout × count requested. If the user asks for three exercises on three workouts, emit nine ops — no fewer.** If the research text argues the volume is aggressive, surface that in the answer; keep emitting all nine.

**Exact op shape:**
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

Return your final output as JSON: { answer: string, operations: [ ... ] }. Wrap only in a \`\`\`json code fence if needed.`;
}

function extractJson(text: string): any {
  try { return JSON.parse(text); } catch {}
  const fenced = text.match(/\`\`\`(?:json)?\s*([\s\S]*?)\`\`\`/);
  if (fenced) { try { return JSON.parse(fenced[1].trim()); } catch {} }
  const m = text.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

async function runOne(model: string, trial: number) {
  const client = getGeminiClient();
  const protocol = normalizeProtocol(rawProtocol) as DailyProtocol;
  const prompt = buildReframedPrompt(protocol, QUESTION);

  let response: any;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      response = await client.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { tools: [{ googleSearch: {} }] },
      });
      break;
    } catch (err) {
      const msg = (err as Error).message ?? '';
      if (!msg.includes('fetch failed') || attempt === 3) { throw err; }
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }

  const u = (response as any).usageMetadata ?? {};
  const text = response.text ?? '';
  const parsed = extractJson(text);
  const ops = Array.isArray(parsed?.operations) ? parsed.operations : [];
  const normalized = normalizeGeminiOperations(ops) ?? [];
  const zod: ProtocolOperation[] = [];
  for (const raw of normalized) {
    const r = protocolOperationSchema.safeParse(raw);
    if (r.success) zod.push(r.data);
  }
  const valid = validateOperations(protocol, zod);

  const perWorkout = new Map<string, number>();
  for (const op of valid) {
    if (op.op === 'create' && op.elementType === 'exercise') {
      const pid = (op.parentId as string | undefined) ?? '(none)';
      perWorkout.set(pid, (perWorkout.get(pid) ?? 0) + 1);
    }
  }
  const dist = [...perWorkout.values()].sort().join('+') || '(none)';

  console.log(
    `${model.padEnd(32)}  trial ${trial}  ops=${valid.length}  dist=${dist}  ` +
    `promptTok=${u.promptTokenCount ?? '?'}  outTok=${u.candidatesTokenCount ?? '?'}  ` +
    `thoughtsTok=${u.thoughtsTokenCount ?? '-'}  total=${u.totalTokenCount ?? '?'}`,
  );

  // Brief preview of the answer
  if (parsed?.answer) {
    const ans = String(parsed.answer).replace(/\s+/g, ' ').slice(0, 140);
    console.log(`  answer: ${ans}…`);
  } else if (text) {
    console.log(`  (no parsed answer) first 100: ${text.slice(0, 100).replace(/\s+/g, ' ')}`);
  }
}

async function main() {
  console.log('Reframed prompt — grounding on, no schema. 2 trials per model.\n');
  for (const m of MODELS) {
    for (let t = 1; t <= TRIALS_PER_MODEL; t++) {
      try {
        await runOne(m, t);
      } catch (err) {
        console.log(`${m.padEnd(32)}  trial ${t}  error: ${(err as Error).message?.slice(0, 150)}`);
      }
    }
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
