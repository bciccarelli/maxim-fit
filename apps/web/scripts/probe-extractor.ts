/** Unit-ish test: does extractJsonObject handle the failure modes we'd expect from Gemini? */
import { extractJsonObject } from '../lib/gemini/generation';

const cases: Array<{ label: string; input: string; expectKeys?: string[] }> = [
  { label: 'pure JSON', input: '{"answer":"hi","operations":[]}', expectKeys: ['answer', 'operations'] },
  { label: 'fenced json', input: '```json\n{"answer":"hi","operations":[]}\n```', expectKeys: ['answer', 'operations'] },
  { label: 'fenced no-lang', input: '```\n{"answer":"hi","operations":[]}\n```', expectKeys: ['answer', 'operations'] },
  { label: 'prose before fence', input: 'Here is my proposal.\n\n```json\n{"answer":"hi","operations":[]}\n```', expectKeys: ['answer', 'operations'] },
  { label: 'prose after fence', input: '```json\n{"answer":"hi","operations":[]}\n```\n\nLet me know if you want changes.', expectKeys: ['answer', 'operations'] },
  { label: 'two fences, JSON second', input: '```\nsome unrelated block\n```\n\n```json\n{"answer":"hi","operations":[]}\n```', expectKeys: ['answer', 'operations'] },
  { label: 'two fences, JSON first', input: '```json\n{"answer":"hi","operations":[]}\n```\n\n```\nmore info\n```', expectKeys: ['answer', 'operations'] },
  { label: 'trailing comma', input: '{"answer":"hi","operations":[{"op":"delete"},]}', expectKeys: ['answer', 'operations'] },
  { label: 'braces in answer string', input: '{"answer":"use {name} as placeholder — ok?","operations":[]}', expectKeys: ['answer', 'operations'] },
  { label: 'escaped quote in answer', input: '{"answer":"she said \\"hi\\"","operations":[]}', expectKeys: ['answer', 'operations'] },
  { label: 'no JSON at all', input: 'Sorry, I cannot answer that question.', expectKeys: undefined },
  { label: 'bare array (wrong shape)', input: '[{"op":"delete","elementId":"ml_1"}]', expectKeys: undefined },
  { label: 'prose with stray braces but JSON fenced', input: 'I considered {bench, squat} — here is the plan.\n\n```json\n{"answer":"hi","operations":[{"op":"delete","elementId":"ml_1","elementType":"meal","parentId":"","reason":"r"}]}\n```', expectKeys: ['answer', 'operations'] },
  { label: 'JSON preceded by one-line note', input: 'Quick note: I used research.\n{"answer":"hi","operations":[]}', expectKeys: ['answer', 'operations'] },
  { label: 'nested JSON in answer field', input: '```json\n{"answer":"here is the diff: {\\"foo\\": 1}","operations":[]}\n```', expectKeys: ['answer', 'operations'] },
];

let pass = 0, fail = 0;
for (const c of cases) {
  const result = extractJsonObject(c.input) as Record<string, unknown> | null;
  const got = result && typeof result === 'object' ? Object.keys(result).sort().join(',') : null;
  const ok = c.expectKeys
    ? c.expectKeys.sort().join(',') === got
    : got === null;
  if (ok) { pass++; console.log(`  ✓ ${c.label}`); }
  else { fail++; console.log(`  ✗ ${c.label} — got keys: ${got}`); console.log(`     input: ${c.input.replace(/\n/g, '\\n').slice(0, 120)}`); }
}
console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail === 0 ? 0 : 1);
