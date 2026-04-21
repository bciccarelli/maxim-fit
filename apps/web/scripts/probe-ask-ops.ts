/**
 * Probe: does Gemini produce valid create-exercise ops when asked to
 * "add exercises to each of my workouts"?
 *
 * Prints raw Gemini ops, post-normalization ops, and post-validation ops
 * so we can see exactly where they fall off.
 *
 * Run from apps/web: `npx tsx scripts/probe-ask-ops.ts`
 */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';

loadEnv({ path: resolve(__dirname, '../.env.local') });

import { getGeminiClient, MODEL_STRUCTURED } from '../lib/gemini/client';
import {
  askResearch,
  buildAskApplyPrompt,
  askResultSchema,
  normalizeGeminiOperations,
} from '../lib/gemini/generation';
import { validateOperations, protocolOperationSchema, applyOperations, type ProtocolOperation } from '@protocol/shared';
import { normalizeProtocol } from '@protocol/shared/schemas/protocol';
import type { DailyProtocol } from '@protocol/shared/schemas/protocol';

const question = 'Please add three strength exercises to each of my existing workouts.';

// Minimal but realistic protocol — 3 workouts, each with 1 exercise, all ids assigned
// by normalizeProtocol.
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
      {
        name: 'Upper Body',
        day: 'monday',
        time: '17:30',
        duration_min: 45,
        exercises: [{ name: 'Bench Press', sets: 3, reps: '8-10', notes: null, duration_min: null, rest_sec: 90 }],
      },
      {
        name: 'Lower Body',
        day: 'wednesday',
        time: '17:30',
        duration_min: 45,
        exercises: [{ name: 'Back Squat', sets: 3, reps: '8-10', notes: null, duration_min: null, rest_sec: 120 }],
      },
      {
        name: 'Full Body',
        day: 'friday',
        time: '17:30',
        duration_min: 45,
        exercises: [{ name: 'Deadlift', sets: 3, reps: '5', notes: null, duration_min: null, rest_sec: 180 }],
      },
    ],
  },
};

const stubConfig = {
  personal_info: { age: 32, sex: 'male', weight_kg: 80, height_cm: 180, activity_level: 'moderate', experience_level: 'intermediate' },
  goals: [{ name: 'Muscle Gain', weight: 1.0, description: 'Hypertrophy focus' }],
  hard_requirements: ['At least 3 training days per week'],
  preferences: [],
} as any;

async function main() {
  const protocol = normalizeProtocol(rawProtocol) as DailyProtocol;

  console.log('=== PROTOCOL WORKOUT IDS ===');
  for (const w of protocol.training.workouts) {
    console.log(`  ${w.id}  day=${w.day}  name="${w.name}"  exercises=${w.exercises.length}`);
  }

  console.log('\n=== USER QUESTION ===');
  console.log(question);

  console.log('\n=== PHASE 1: RESEARCH ===');
  const research = await askResearch(protocol, stubConfig, question, [], null);
  console.log('Research text (first 300 chars):', research.researchText.slice(0, 300));

  console.log('\n=== PHASE 2: APPLY (raw Gemini call) ===');
  const client = getGeminiClient();
  const prompt = buildAskApplyPrompt(protocol, stubConfig, question, [], research.researchText);
  let response: any;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      response = await client.models.generateContent({
        model: MODEL_STRUCTURED,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: askResultSchema as any,
        },
      });
      break;
    } catch (err) {
      console.log(`[attempt ${attempt}/3] Phase 2 fetch failed: ${(err as Error).message}`);
      if (attempt === 3) throw err;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }

  const text = response.text!;
  const parsed = JSON.parse(text);

  console.log('\n--- Raw Gemini answer ---');
  console.log(parsed.answer);

  console.log('\n--- Raw Gemini operations ---');
  console.log(JSON.stringify(parsed.operations, null, 2));

  const normalized = normalizeGeminiOperations(parsed.operations ?? []);
  console.log('\n--- After normalizeGeminiOperations ---');
  console.log(JSON.stringify(normalized, null, 2));

  // Zod parse
  const zodParsed: ProtocolOperation[] = [];
  for (const raw of normalized ?? []) {
    const r = protocolOperationSchema.safeParse(raw);
    if (r.success) zodParsed.push(r.data);
    else console.log('ZOD FAIL:', JSON.stringify(raw), '→', JSON.stringify(r.error.flatten()));
  }
  console.log(`\n--- After Zod parse: ${zodParsed.length}/${normalized?.length ?? 0} passed ---`);

  const valid = validateOperations(protocol, zodParsed);
  console.log(`\n--- After validateOperations: ${valid.length}/${zodParsed.length} passed ---`);
  console.log(JSON.stringify(valid, null, 2));

  console.log('\n=== SUMMARY ===');
  const createExerciseOps = valid.filter((op) => op.op === 'create' && op.elementType === 'exercise');
  console.log(`create-exercise ops that survived: ${createExerciseOps.length}`);
  const perWorkout = new Map<string, number>();
  for (const op of createExerciseOps) {
    if (op.op === 'create') {
      const pid = (op.parentId as string | undefined) ?? '(none)';
      perWorkout.set(pid, (perWorkout.get(pid) ?? 0) + 1);
    }
  }
  for (const [pid, n] of perWorkout) {
    console.log(`  parentId=${pid} → ${n} exercise(s)`);
  }

  console.log('\n=== APPLY OPERATIONS (end-to-end) ===');
  const after = applyOperations(protocol, valid);
  for (const w of after.training.workouts) {
    console.log(`  ${w.id}  ${w.day}  "${w.name}"  exercises: ${w.exercises.length}`);
    for (const ex of w.exercises) console.log(`      - ${ex.name}  sets=${ex.sets}  reps=${ex.reps ?? '?'}`);
  }
}

main().catch((err) => {
  console.error('Probe failed:', err);
  process.exit(1);
});
