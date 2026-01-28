import { GoogleGenAI } from '@google/genai';

// Fast model for initial generation (no grounding needed)
export const MODEL_FAST = 'gemini-2.5-flash-lite';

// Model with grounding + structured output for verification/modification
export const MODEL_GROUNDED = 'gemini-3-flash-preview';


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
