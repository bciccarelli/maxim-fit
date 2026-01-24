import { GoogleGenAI } from '@google/genai';

// CRITICAL: Only this model supports grounding + structured output
export const MODEL_NAME = 'gemini-3-flash-preview';

let client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}
