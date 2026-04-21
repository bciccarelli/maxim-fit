/** Integration smoke test against the actual askAboutProtocol function. */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
loadEnv({ path: resolve(__dirname, '../.env.local') });

import { askAboutProtocol } from '../lib/gemini/generation';
import { applyOperations, validateOperations, protocolOperationSchema, type ProtocolOperation } from '@protocol/shared';
import { normalizeProtocol } from '@protocol/shared/schemas/protocol';
import type { DailyProtocol } from '@protocol/shared/schemas/protocol';

const rawProtocol = {
  schedules: [
    { label: 'Daily', days: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'], wake_time: '06:30', sleep_time: '22:00', other_events: [], routine_events: [] },
  ],
  diet: {
    daily_calories: 2400, protein_target_g: 180, carbs_target_g: 240, fat_target_g: 70,
    meals: [
      { name: 'Breakfast', time: '07:30', foods: ['Oats','Eggs'], calories: 600, protein_g: 40, carbs_g: 70, fat_g: 18 },
      { name: 'Lunch', time: '13:00', foods: ['Chicken','Rice'], calories: 800, protein_g: 60, carbs_g: 90, fat_g: 20 },
      { name: 'Dinner', time: '19:00', foods: ['Salmon','Potato'], calories: 1000, protein_g: 80, carbs_g: 80, fat_g: 32 },
    ],
    hydration_oz: 100, dietary_notes: [],
  },
  supplementation: { supplements: [{ name: 'Creatine', dosage_amount: '5', dosage_unit: 'g', time: '07:30', timing: 'with breakfast', purpose: 'strength' }], general_notes: [] },
  training: {
    days_per_week: 3,
    workouts: [
      { name: 'Upper Body', day: 'monday', time: '17:30', duration_min: 45, exercises: [{ name: 'Bench Press', sets: 3, reps: '8-10', notes: null, duration_min: null, rest_sec: 90 }] },
      { name: 'Lower Body', day: 'wednesday', time: '17:30', duration_min: 45, exercises: [{ name: 'Back Squat', sets: 3, reps: '8-10', notes: null, duration_min: null, rest_sec: 120 }] },
      { name: 'Full Body', day: 'friday', time: '17:30', duration_min: 45, exercises: [{ name: 'Deadlift', sets: 3, reps: '5', notes: null, duration_min: null, rest_sec: 180 }] },
    ],
  },
};

const stubConfig = { personal_info: { age: 32, sex: 'male', weight_kg: 80, height_cm: 180, activity_level: 'moderate', experience_level: 'intermediate' }, goals: [{ name: 'Muscle Gain', weight: 1.0, description: 'Hypertrophy' }], hard_requirements: ['3 training days/week'], preferences: [] } as any;

async function main() {
  const protocol = normalizeProtocol(rawProtocol) as DailyProtocol;
  console.log('Workout ids:', protocol.training.workouts.map(w => w.id).join(', '));

  const result = await askAboutProtocol(protocol, stubConfig, 'Please add three strength exercises to each of my existing workouts.', []);

  console.log('\nanswer:', result.answer.slice(0, 200), '...');
  console.log('raw ops:', result.operations?.length ?? 0);
  console.log('citations:', result.citations?.length ?? 0);

  const zod: ProtocolOperation[] = [];
  for (const raw of result.operations ?? []) {
    const r = protocolOperationSchema.safeParse(raw);
    if (r.success) zod.push(r.data);
  }
  const valid = validateOperations(protocol, zod);
  console.log('valid ops:', valid.length);

  const perWorkout = new Map<string, number>();
  for (const op of valid) {
    if (op.op === 'create' && op.elementType === 'exercise') {
      const pid = (op.parentId as string) ?? '(none)';
      perWorkout.set(pid, (perWorkout.get(pid) ?? 0) + 1);
    }
  }
  for (const [pid, n] of perWorkout) console.log(`  parentId=${pid} → ${n}`);

  const after = applyOperations(protocol, valid);
  console.log('\napplied:');
  for (const w of after.training.workouts) {
    console.log(`  ${w.day}: ${w.exercises.length} exercises`);
    for (const ex of w.exercises) console.log(`    - ${ex.name} ${ex.sets ?? '—'}×${ex.reps ?? '—'}`);
  }
}
main().catch((err) => { console.error(err); process.exit(1); });
