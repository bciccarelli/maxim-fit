/**
 * Probe: measure token usage for a representative Ask call across models +
 * configurations. Prints promptTokenCount / candidatesTokenCount / thoughtsTokenCount.
 *
 * Run from apps/web: `npx tsx scripts/probe-tokens.ts`
 */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
loadEnv({ path: resolve(__dirname, '../.env.local') });

import { getGeminiClient, MODEL_STRUCTURED, MODEL_RESEARCH, MODEL_GROUNDED } from '../lib/gemini/client';
import { askResultSchema } from '../lib/gemini/generation';
import { normalizeProtocol } from '@protocol/shared/schemas/protocol';
import type { DailyProtocol } from '@protocol/shared/schemas/protocol';

const QUESTION = 'Please add three strength exercises to each of my existing workouts.';

const rawProtocol = {
  schedules: [
    {
      label: 'Daily Schedule',
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      wake_time: '06:30',
      sleep_time: '22:00',
      other_events: [
        { start_time: '21:00', end_time: '21:30', activity: 'Wind-down reading', requirement_satisfied: null },
      ],
      routine_events: [],
    },
  ],
  diet: {
    daily_calories: 2400,
    protein_target_g: 180,
    carbs_target_g: 240,
    fat_target_g: 70,
    meals: [
      { name: 'Breakfast', time: '07:30', foods: ['Oats 80g', 'Eggs x3', 'Berries 100g'], calories: 600, protein_g: 40, carbs_g: 70, fat_g: 18 },
      { name: 'Lunch', time: '13:00', foods: ['Chicken breast 200g', 'Rice 150g', 'Veg 200g'], calories: 800, protein_g: 60, carbs_g: 90, fat_g: 20 },
      { name: 'Dinner', time: '19:00', foods: ['Salmon 200g', 'Sweet potato 300g', 'Spinach 100g'], calories: 1000, protein_g: 80, carbs_g: 80, fat_g: 32 },
    ],
    hydration_oz: 100,
    dietary_notes: ['High protein distribution', 'Mediterranean base'],
  },
  supplementation: {
    supplements: [
      { name: 'Creatine', dosage_amount: '5', dosage_unit: 'g', time: '07:30', timing: 'with breakfast', purpose: 'strength' },
      { name: 'Vitamin D', dosage_amount: '2000', dosage_unit: 'IU', time: '07:30', timing: 'with breakfast', purpose: 'immune + bone' },
      { name: 'Magnesium Glycinate', dosage_amount: '300', dosage_unit: 'mg', time: '21:30', timing: 'before bed', purpose: 'sleep + recovery' },
    ],
    general_notes: [],
  },
  training: {
    days_per_week: 3,
    workouts: [
      { name: 'Upper Body', day: 'monday', time: '17:30', duration_min: 45, exercises: [{ name: 'Bench Press', sets: 3, reps: '8-10', rest_sec: 90, notes: null, duration_min: null }] },
      { name: 'Lower Body', day: 'wednesday', time: '17:30', duration_min: 45, exercises: [{ name: 'Back Squat', sets: 3, reps: '8-10', rest_sec: 120, notes: null, duration_min: null }] },
      { name: 'Full Body', day: 'friday', time: '17:30', duration_min: 45, exercises: [{ name: 'Deadlift', sets: 3, reps: '5', rest_sec: 180, notes: null, duration_min: null }] },
    ],
  },
};

const stubConfig = {
  personal_info: { age: 32, sex: 'male', weight_kg: 80, height_cm: 180, activity_level: 'moderate', experience_level: 'intermediate' },
  goals: [{ name: 'Muscle Gain', weight: 0.7, description: 'Hypertrophy' }, { name: 'Longevity', weight: 0.3, description: 'Healthspan' }],
  hard_requirements: ['At least 3 training days per week', 'Protein >= 1.6g/kg'],
  preferences: [],
} as any;

function buildPrompt(protocol: DailyProtocol, question: string): string {
  const workoutRefs = protocol.training.workouts.map((w) => {
    const exs = w.exercises.map((e) => `  - "${e.name}" → id: "${e.id}"`).join('\n');
    return `- "${w.name}" → id: "${w.id}"\n${exs}`;
  }).join('\n');
  return `You are a protocol advisor for Maxim.

## User Configuration
${JSON.stringify(stubConfig, null, 2)}

## Element ID Reference
### Workouts & Exercises
${workoutRefs}

## Current Protocol
${JSON.stringify(protocol, null, 2)}

## User's Question
${question}

Propose operations as JSON: { answer, operations[] with op, elementId, elementType, parentId, exerciseFields?, supplementFields?, mealFields?, workoutFields?, otherEventFields?, reason }.`;
}

async function measure(label: string, model: string, withGrounding: boolean, withSchema: boolean) {
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
    const response = await client.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: cfg,
    });
    const u = (response as any).usageMetadata ?? {};
    const prompt_chars = prompt.length;
    console.log(
      `${label.padEnd(60)} promptChars=${String(prompt_chars).padStart(5)}  ` +
      `promptTok=${String(u.promptTokenCount ?? '?').padStart(5)}  ` +
      `outputTok=${String(u.candidatesTokenCount ?? '?').padStart(4)}  ` +
      `thoughtsTok=${String(u.thoughtsTokenCount ?? '-').padStart(5)}  ` +
      `total=${String(u.totalTokenCount ?? '?').padStart(5)}`,
    );
  } catch (err) {
    console.log(`${label.padEnd(60)} error: ${(err as Error).message?.slice(0, 120)}`);
  }
}

async function main() {
  console.log(`Prompt built for protocol with 3 workouts, 3 exercises (1 each), 3 meals, 3 supplements.\n`);
  await measure('Phase 1 research (grounded flash-lite)', MODEL_RESEARCH, true, false);
  await measure('Phase 2 apply (Pro structured)', MODEL_STRUCTURED, false, true);
  await measure('Single-phase Pro (grounding+schema)', 'gemini-3.1-pro-preview', true, true);
  await measure('Single-phase flash-lite (grounding only)', 'gemini-3.1-flash-lite-preview', true, false);
  await measure('Single-phase flash-lite (grounding+schema)', 'gemini-3.1-flash-lite-preview', true, true);
}

main().catch((err) => { console.error(err); process.exit(1); });
