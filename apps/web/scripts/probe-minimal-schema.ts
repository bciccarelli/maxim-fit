/**
 * Probe: does a MINIMAL top-level responseSchema — enforcing only
 *   { answer: string, operations: array<object> }
 * with no nested op shape — give us structured-output reliability
 * WITHOUT the 30–65k-token bloat we saw from the typed-payload schema?
 *
 * Tests three models × (schema on/off) × grounding on, 2 trials each.
 */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
loadEnv({ path: resolve(__dirname, '../.env.local') });

import { getGeminiClient } from '../lib/gemini/client';
import { buildAskSinglePhasePrompt, normalizeGeminiOperations, extractJsonObject } from '../lib/gemini/generation';
import { validateOperations, protocolOperationSchema, type ProtocolOperation } from '@protocol/shared';
import { normalizeProtocol } from '@protocol/shared/schemas/protocol';
import type { DailyProtocol } from '@protocol/shared/schemas/protocol';

const QUESTION = 'Please add three strength exercises to each of my existing workouts.';
const MODELS = ['gemini-3-flash-preview', 'gemini-3.1-flash-lite-preview', 'gemini-3.1-pro-preview'];
const TRIALS = 2;

const MINIMAL_SCHEMA = {
  type: 'object',
  properties: {
    answer: {
      type: 'string',
      description: 'Conversational explanation of what was proposed and why. Surface concerns here (never by reducing op count).',
    },
    operations: {
      type: 'array',
      description: 'Array of proposed operations. Each op is an object — see the prompt for the exact shape.',
      items: { type: 'object' },
    },
  },
  required: ['answer', 'operations'],
} as const;

const rawProtocol = {
  schedules: [{ label: 'Daily', days: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'], wake_time: '06:30', sleep_time: '22:00', other_events: [], routine_events: [] }],
  diet: { daily_calories: 2400, protein_target_g: 180, carbs_target_g: 240, fat_target_g: 70, meals: [{ name: 'Breakfast', time: '07:30', foods: ['Oats'], calories: 600, protein_g: 40, carbs_g: 70, fat_g: 18 }], hydration_oz: 100, dietary_notes: [] },
  supplementation: { supplements: [{ name: 'Creatine', dosage_amount: '5', dosage_unit: 'g', time: '07:30', timing: 'with breakfast', purpose: 'strength' }], general_notes: [] },
  training: { days_per_week: 3, workouts: [
    { name: 'Upper Body', day: 'monday', time: '17:30', duration_min: 45, exercises: [{ name: 'Bench Press', sets: 3, reps: '8-10', notes: null, duration_min: null, rest_sec: 90 }] },
    { name: 'Lower Body', day: 'wednesday', time: '17:30', duration_min: 45, exercises: [{ name: 'Back Squat', sets: 3, reps: '8-10', notes: null, duration_min: null, rest_sec: 120 }] },
    { name: 'Full Body', day: 'friday', time: '17:30', duration_min: 45, exercises: [{ name: 'Deadlift', sets: 3, reps: '5', notes: null, duration_min: null, rest_sec: 180 }] },
  ] },
};

const stubConfig = { personal_info: { age: 32, sex: 'male', weight_kg: 80, height_cm: 180, activity_level: 'moderate', experience_level: 'intermediate' }, goals: [{ name: 'Muscle Gain', weight: 1.0, description: 'x' }], hard_requirements: [], preferences: [] } as any;

async function run(model: string, withSchema: boolean, trial: number) {
  const client = getGeminiClient();
  const protocol = normalizeProtocol(rawProtocol) as DailyProtocol;
  const prompt = buildAskSinglePhasePrompt(protocol, stubConfig, QUESTION, []);

  const cfg: any = { tools: [{ googleSearch: {} }] };
  if (withSchema) {
    cfg.responseMimeType = 'application/json';
    cfg.responseSchema = MINIMAL_SCHEMA as any;
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await client.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: cfg,
      });
      const u = (response as any).usageMetadata ?? {};
      const gm = (response as any).candidates?.[0]?.groundingMetadata;
      const queries = gm?.webSearchQueries?.length ?? 0;
      const supports = gm?.groundingSupports?.length ?? 0;

      const text = response.text ?? '';
      const parsed = extractJsonObject(text) as { answer?: unknown; operations?: unknown } | null;
      const rawOps = Array.isArray(parsed?.operations) ? parsed!.operations as unknown[] : [];
      if (withSchema && rawOps.length === 0) {
        console.log(`  [raw first 400] ${text.slice(0, 400).replace(/\n/g, '\\n')}`);
      }
      const normalized = normalizeGeminiOperations(rawOps) ?? [];
      const zod: ProtocolOperation[] = [];
      for (const raw of normalized) {
        const r = protocolOperationSchema.safeParse(raw);
        if (r.success) zod.push(r.data);
      }
      const valid = validateOperations(protocol, zod);

      const perWorkout = new Map<string, number>();
      for (const op of valid) {
        if (op.op === 'create' && op.elementType === 'exercise') {
          const pid = (op.parentId as string) ?? '-';
          perWorkout.set(pid, (perWorkout.get(pid) ?? 0) + 1);
        }
      }
      const dist = [...perWorkout.values()].sort().join('+') || '-';
      const schemaTag = withSchema ? 'schema   ' : 'no-schema';
      console.log(
        `${model.padEnd(32)}  ${schemaTag}  T${trial}  ` +
        `ops=${valid.length} dist=${dist.padEnd(7)}  ` +
        `queries=${queries} supports=${supports}  ` +
        `inTok=${String(u.promptTokenCount ?? '?').padStart(4)} outTok=${String(u.candidatesTokenCount ?? '?').padStart(5)} thoughts=${u.thoughtsTokenCount ?? '-'} total=${u.totalTokenCount ?? '?'}`,
      );
      return;
    } catch (err) {
      const msg = (err as Error).message ?? '';
      if (!msg.includes('fetch failed') || attempt === 3) {
        console.log(`${model.padEnd(32)}  ${withSchema ? 'schema   ' : 'no-schema'}  T${trial}  error: ${msg.slice(0, 120)}`);
        return;
      }
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

async function main() {
  console.log('Minimal schema = {answer:string, operations:array<object>} only. Grounding ON. 2 trials each.\n');
  for (const m of MODELS) {
    for (let t = 1; t <= TRIALS; t++) {
      await run(m, false, t);
      await run(m, true, t);
    }
  }
}
main().catch((err) => { console.error(err); process.exit(1); });
