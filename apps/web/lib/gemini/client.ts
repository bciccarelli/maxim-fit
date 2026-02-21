import { GoogleGenAI } from '@google/genai';

// Fast model for initial generation (no grounding needed)
export const MODEL_FAST = 'gemini-2.5-flash-lite';

// Model with grounding + structured output for verification/modification
export const MODEL_GROUNDED = 'gemini-3-flash-preview';

// Phase 1: Research with grounding, no structured output
export const MODEL_RESEARCH = 'gemini-3-flash-preview';

// Phase 2: Structured output with Pro model, no grounding
export const MODEL_STRUCTURED = 'gemini-3-pro-preview';


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
