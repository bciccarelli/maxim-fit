import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
loadEnv({ path: resolve(__dirname, '../.env.local') });

async function main() {
  const key = process.env.GEMINI_API_KEY;
  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=200`);
  const data = (await resp.json()) as { models?: Array<{ name: string; supportedGenerationMethods?: string[] }> };
  const gc = (data.models ?? []).filter(
    (m) => m.name.includes('gemini-3') && (m.supportedGenerationMethods ?? []).includes('generateContent'),
  );
  for (const m of gc) console.log(m.name);
}
main();
