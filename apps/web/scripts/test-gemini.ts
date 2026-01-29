import { config } from 'dotenv';
import { GoogleGenAI } from '@google/genai';

// Load .env.local
config({ path: '.env.local' });

const MODEL_GROUNDED = 'gemini-3-flash-preview';

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY not set');
    process.exit(1);
  }

  console.log('API Key:', apiKey.slice(0, 10) + '...');
  console.log('Model:', MODEL_GROUNDED);

  const client = new GoogleGenAI({ apiKey });

  console.log('\n--- Test 1: Simple prompt (no grounding) ---');
  try {
    const startTime = Date.now();
    const response = await client.models.generateContent({
      model: MODEL_GROUNDED,
      contents: 'Say hello in one word',
    });
    console.log(`Response in ${Date.now() - startTime}ms:`, response.text);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }

  console.log('\n--- Test 2: With Google Search grounding ---');
  try {
    const startTime = Date.now();
    const response = await client.models.generateContent({
      model: MODEL_GROUNDED,
      contents: 'What is the current weather like?',
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    console.log(`Response in ${Date.now() - startTime}ms:`, response.text?.slice(0, 200));
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }

  console.log('\n--- Test 3: With structured output (like protocol generation) ---');
  try {
    const startTime = Date.now();
    const response = await client.models.generateContent({
      model: MODEL_GROUNDED,
      contents: `Create a simple daily schedule for a healthy person. Include wake time, meals, exercise, and sleep.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            wake_time: { type: 'string' },
            sleep_time: { type: 'string' },
            meals: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  time: { type: 'string' },
                },
                required: ['name', 'time'],
              },
            },
          },
          required: ['wake_time', 'sleep_time', 'meals'],
        } as any,
      },
    });
    console.log(`Response in ${Date.now() - startTime}ms`);
    console.log('Result:', response.text?.slice(0, 500));
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

testGemini();
