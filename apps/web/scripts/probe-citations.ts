/**
 * Probe: when do the different Gemini 3 models actually invoke Google Search?
 * Dumps groundingMetadata so we can see search queries + retrieval chunks.
 *
 * Tests three prompt variants against three models:
 *   A) current production prompt (just "you MAY use Google Search")
 *   B) soft directive ("research your answer before proposing")
 *   C) hard directive ("you MUST call Google Search at least once per request")
 */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
loadEnv({ path: resolve(__dirname, '../.env.local') });

import { getGeminiClient } from '../lib/gemini/client';
import { normalizeProtocol } from '@protocol/shared/schemas/protocol';
import type { DailyProtocol } from '@protocol/shared/schemas/protocol';

const QUESTION_STRUCTURAL = 'Please add three strength exercises to each of my existing workouts.';
const QUESTION_NUANCED = 'Is creatine safe for long-term daily use? Should I cycle off?';
const MODELS = ['gemini-3-flash-preview', 'gemini-3.1-flash-lite-preview', 'gemini-3.1-pro-preview'];

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

const PROMPT_A_MAY = (protocol: DailyProtocol, question: string) =>
`You are a deterministic protocol editor. Propose ops in JSON { answer, operations[] }. You may use Google Search.

Protocol: ${JSON.stringify(protocol.training.workouts.map(w => ({ id: w.id, name: w.name })))}
Question: ${question}`;

const PROMPT_B_SOFT = (protocol: DailyProtocol, question: string) =>
`You are a deterministic protocol editor. Propose ops in JSON { answer, operations[] }.

**Research first**: before proposing changes or answering, search Google for current evidence-based guidance on the user's question. Cite the sources.

Protocol: ${JSON.stringify(protocol.training.workouts.map(w => ({ id: w.id, name: w.name })))}
Question: ${question}`;

const PROMPT_C_HARD = (protocol: DailyProtocol, question: string) =>
`You are a deterministic protocol editor. Propose ops in JSON { answer, operations[] }.

**Search requirement**: You MUST invoke Google Search at least once before answering, even if you already know the answer. This is a non-negotiable requirement. Issue at least one search query that targets the user's specific question (e.g. study names, protocol specifics, current consensus), then ground your answer in what you retrieved.

Protocol: ${JSON.stringify(protocol.training.workouts.map(w => ({ id: w.id, name: w.name })))}
Question: ${question}`;

async function probe(model: string, promptLabel: string, prompt: string) {
  const client = getGeminiClient();
  try {
    const response = await client.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { tools: [{ googleSearch: {} }] },
    });
    const u = (response as any).usageMetadata ?? {};
    const gm = (response as any).candidates?.[0]?.groundingMetadata;
    const queries: string[] = gm?.webSearchQueries ?? [];
    const chunks: any[] = gm?.groundingChunks ?? [];
    const supports: any[] = gm?.groundingSupports ?? [];

    console.log(
      `${model.padEnd(32)}  ${promptLabel.padEnd(8)}  ` +
      `queries=${queries.length}  chunks=${chunks.length}  supports=${supports.length}  ` +
      `inTok=${u.promptTokenCount ?? '?'}  outTok=${u.candidatesTokenCount ?? '?'}  toolTok=${u.toolUsePromptTokenCount ?? '-'}`,
    );
    if (queries.length) for (const q of queries) console.log(`  • ${q}`);
  } catch (err) {
    console.log(`${model.padEnd(32)}  ${promptLabel.padEnd(8)}  error: ${(err as Error).message?.slice(0, 150)}`);
  }
}

async function main() {
  const protocol = normalizeProtocol(rawProtocol) as DailyProtocol;
  for (const question of [QUESTION_STRUCTURAL, QUESTION_NUANCED]) {
    console.log(`\n════════ QUESTION: ${question} ════════`);
    for (const model of MODELS) {
      await probe(model, 'A-may', PROMPT_A_MAY(protocol, question));
      await probe(model, 'B-soft', PROMPT_B_SOFT(protocol, question));
      await probe(model, 'C-hard', PROMPT_C_HARD(protocol, question));
    }
  }
}
main().catch((err) => { console.error(err); process.exit(1); });
