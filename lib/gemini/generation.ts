import { getGeminiClient, MODEL_GROUNDED, MODEL_FAST } from './client';
import { dailyProtocolSchema, type DailyProtocol, type VerificationResult } from '../schemas/protocol';
import type { UserConfig, AnonymousUserConfig } from '../schemas/user-config';
import { goalSchema, type Goal } from '../schemas/user-config';

/**
 * Validate and fix corrupted exercise data from Gemini responses.
 * Catches impossibly large sets values that indicate data corruption.
 */
function validateExerciseData(parsed: Record<string, unknown>): void {
  const training = parsed.training as { workouts?: Array<{ exercises?: Array<{ name?: string; sets?: number }> }> } | undefined;
  for (const workout of training?.workouts ?? []) {
    for (const exercise of workout.exercises ?? []) {
      if (exercise.sets !== null && exercise.sets !== undefined) {
        // Catch impossibly large sets values (likely corruption from Gemini)
        if (typeof exercise.sets === 'number' && exercise.sets > 100) {
          console.error(`[validateExerciseData] Detected corrupted sets value: ${exercise.sets} for exercise: ${exercise.name}`);
          // Recover with a reasonable default
          exercise.sets = 3;
        }
      }
    }
  }
}

// Gemini-compatible schema (flat, no $ref or definitions)
export const dailyProtocolGeminiSchema = {
  type: 'object',
  properties: {
    schedule: {
      type: 'object',
      properties: {
        wake_time: { type: 'string', description: 'Wake time in HH:MM 24-hour format, e.g. "07:00"' },
        sleep_time: { type: 'string', description: 'Sleep time in HH:MM 24-hour format, e.g. "22:00"' },
        schedule: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              start_time: { type: 'string', description: 'Start time in HH:MM 24-hour format, e.g. "07:00"' },
              end_time: { type: 'string', description: 'End time in HH:MM 24-hour format, e.g. "08:00"' },
              activity: { type: 'string' },
              requirement_satisfied: { type: 'string' },
            },
            required: ['start_time', 'end_time', 'activity'],
          },
        },
      },
      required: ['wake_time', 'sleep_time', 'schedule'],
    },
    diet: {
      type: 'object',
      properties: {
        daily_calories: { type: 'integer', minimum: 1 },
        protein_target_g: { type: 'number', minimum: 0 },
        carbs_target_g: { type: 'number', minimum: 0 },
        fat_target_g: { type: 'number', minimum: 0 },
        meals: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              time: { type: 'string', description: 'Meal time in HH:MM 24-hour format, e.g. "12:00"' },
              foods: { type: 'array', items: { type: 'string' } },
              calories: { type: 'integer', minimum: 1 },
              protein_g: { type: 'number', minimum: 0 },
              carbs_g: { type: 'number', minimum: 0 },
              fat_g: { type: 'number', minimum: 0 },
              notes: { type: 'string' },
            },
            required: ['name', 'time', 'foods', 'calories', 'protein_g', 'carbs_g', 'fat_g'],
          },
        },
        hydration_oz: { type: 'number', minimum: 0 },
        dietary_notes: { type: 'array', items: { type: 'string' } },
      },
      required: ['daily_calories', 'protein_target_g', 'carbs_target_g', 'fat_target_g', 'meals', 'hydration_oz', 'dietary_notes'],
    },
    supplementation: {
      type: 'object',
      properties: {
        supplements: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              dosage: { type: 'string' },
              timing: { type: 'string' },
              purpose: { type: 'string' },
              notes: { type: 'string' },
            },
            required: ['name', 'dosage', 'timing', 'purpose'],
          },
        },
        general_notes: { type: 'array', items: { type: 'string' } },
      },
      required: ['supplements', 'general_notes'],
    },
    training: {
      type: 'object',
      properties: {
        program_name: { type: 'string' },
        days_per_week: { type: 'integer', minimum: 1, maximum: 7 },
        workouts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              day: { type: 'string' },
              duration_min: { type: 'integer', minimum: 1 },
              exercises: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    sets: { type: 'integer', minimum: 1 },
                    reps: { type: 'string' },
                    duration_min: { type: 'integer', minimum: 1 },
                    rest_sec: { type: 'integer', minimum: 1 },
                    notes: { type: 'string' },
                  },
                  required: ['name'],
                },
              },
              warmup: { type: 'string' },
              cooldown: { type: 'string' },
            },
            required: ['name', 'day', 'duration_min', 'exercises', 'warmup', 'cooldown'],
          },
        },
        rest_days: { type: 'array', items: { type: 'string' } },
        progression_notes: { type: 'string' },
        general_notes: { type: 'array', items: { type: 'string' } },
      },
      required: ['program_name', 'days_per_week', 'workouts', 'rest_days', 'progression_notes', 'general_notes'],
    },
  },
  required: ['schedule', 'diet', 'supplementation', 'training'],
} as const;

export async function generateProtocol(
  config: UserConfig | AnonymousUserConfig,
  userNotes?: string[]
): Promise<DailyProtocol> {
  const startTime = Date.now();
  const log = (step: string) => console.log(`[gemini:generateProtocol] ${step} @ ${Date.now() - startTime}ms`);

  log('start');
  const client = getGeminiClient();
  log('got client');

  const prompt = buildGenerationPrompt(config, userNotes);
  log(`built prompt (${prompt.length} chars)`);

  log(`calling Gemini API with model: ${MODEL_FAST} (no grounding)...`);
  try {
    const response = await client.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: dailyProtocolGeminiSchema as any,
      },
    });
    log('Gemini API response received');

    const text = response.text;
    if (!text) {
      throw new Error('No response from Gemini');
    }

    log('parsing response');
    const parsed = JSON.parse(text);
    const result = dailyProtocolSchema.parse(parsed);
    log('done');
    return result;
  } catch (error) {
    log(`Gemini API error: ${error instanceof Error ? error.message : 'unknown'}`);
    if (error instanceof Error) {
      console.error('[gemini:generateProtocol] Full error:', error);
    }
    throw error;
  }
}

function buildGenerationPrompt(config: UserConfig | AnonymousUserConfig, userNotes?: string[]): string {
  const { personal_info, goals, requirements } = config;

  const goalsText = goals
    .map((g) => `- ${g.name} (weight: ${g.weight})`)
    .join('\n');

  const requirementsText = requirements.length > 0
    ? requirements.map((r) => `- ${r}`).join('\n')
    : 'No specific requirements provided.';

  const notesText = userNotes && userNotes.length > 0
    ? `\n\n**User Preferences (from previous interactions):**\n${userNotes.map((n) => `- ${n}`).join('\n')}`
    : '';

  return `You are an expert health protocol designer. Create a comprehensive, personalized daily health protocol based on the following user information.

## User Profile

**Personal Information:**
- Age: ${personal_info.age} years
- Weight: ${personal_info.weight_lbs} lbs
- Height: ${personal_info.height_in} inches
- Sex: ${personal_info.sex}
- Lifestyle Considerations: ${personal_info.lifestyle_considerations.length > 0 ? personal_info.lifestyle_considerations.join(', ') : 'None specified'}
- Fitness Level: ${personal_info.fitness_level}
- Dietary Restrictions: ${personal_info.dietary_restrictions.length > 0 ? personal_info.dietary_restrictions.join(', ') : 'None'}

**Goals (weighted by importance):**
${goalsText}

**Requirements:**
${requirementsText}${notesText}

## Instructions

1. Use Google Search to find the latest evidence-based recommendations for this user's specific goals and conditions.
2. Design a complete daily protocol including:
   - A detailed schedule from wake to sleep
   - A comprehensive diet plan with macros and specific meals
   - A supplementation plan tailored to their goals
   - A training program appropriate for their fitness level and goals
3. Ensure all requirements are satisfied where possible.
4. Prioritize adherence - the protocol must be realistic and sustainable.
5. Optimize for the user's stated wellness goals and lifestyle preferences.

IMPORTANT: This is a general wellness protocol, not medical advice. Do not diagnose conditions or recommend treatments for diseases.

Generate the protocol now.`;
}

const verificationSchema = {
  type: 'object',
  properties: {
    requirement_scores: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          requirement_name: { type: 'string' },
          target: { type: 'number' },
          achieved: { type: 'number' },
          adherence_percent: { type: 'number' },
          suggestions: { type: 'string' },
        },
        required: ['requirement_name', 'target', 'achieved', 'adherence_percent', 'suggestions'],
      },
    },
    goal_scores: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          goal_name: { type: 'string' },
          score: { type: 'number' },
          reasoning: { type: 'string' },
          suggestions: { type: 'string' },
        },
        required: ['goal_name', 'score', 'reasoning', 'suggestions'],
      },
    },
    critiques: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          criticism: { type: 'string' },
          severity: { type: 'string', enum: ['minor', 'moderate', 'major'] },
          suggestion: { type: 'string' },
        },
        required: ['category', 'criticism', 'severity', 'suggestion'],
      },
    },
    requirements_met: { type: 'boolean' },
    weighted_goal_score: { type: 'number' },
    viability_score: { type: 'number' },
  },
  required: ['requirement_scores', 'goal_scores', 'critiques', 'requirements_met', 'weighted_goal_score', 'viability_score'],
} as const;

/**
 * Verify a protocol's evidence base using Google Search grounding.
 */
export async function verifyProtocol(
  protocol: DailyProtocol,
  config: UserConfig | AnonymousUserConfig
): Promise<VerificationResult> {
  const client = getGeminiClient();

  const prompt = `You are a critical verifier of health protocols. Verify this protocol's evidence base using current research. Analyze the following protocol and provide honest, thorough feedback.

## User Configuration
${JSON.stringify(config, null, 2)}

## Protocol to Verify
${JSON.stringify(protocol, null, 2)}

## Verification Tasks

1. **Requirement Adherence**: For each requirement, score how well the protocol meets it (0-100%).
2. **Goal Scores**: For each goal, score how well the protocol supports it (0-100) with reasoning based on current evidence.
3. **Critiques**: Identify weaknesses, potential issues, and areas for improvement. Verify claims against current research.
4. **Overall Viability**: Score how likely this protocol is to be followed long-term (0-100).

Be thorough and honest. A protocol that won't be followed is worthless.`;

  const response = await client.models.generateContent({
    model: MODEL_GROUNDED,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: 'application/json',
      responseSchema: verificationSchema as any,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('No verification response from Gemini');
  }

  return JSON.parse(text);
}

const modifyResultSchema = {
  type: 'object',
  properties: {
    ...dailyProtocolGeminiSchema.properties,
    reasoning: { type: 'string', description: 'Explanation of what was changed and why, based on research' },
  },
  required: [...dailyProtocolGeminiSchema.required, 'reasoning'],
} as const;

/**
 * Modify a protocol based on user suggestions, using Google Search grounding.
 */
export async function modifyProtocol(
  protocol: DailyProtocol,
  config: UserConfig | AnonymousUserConfig,
  userMessage: string
): Promise<{ protocol: DailyProtocol; reasoning: string }> {
  const client = getGeminiClient();

  const prompt = `You are an expert health protocol modifier. The user wants to change their protocol. Research their suggestions using current evidence and generate a modified protocol.

## User Configuration
${JSON.stringify(config, null, 2)}

## Current Protocol
${JSON.stringify(protocol, null, 2)}

## User's Requested Changes
${userMessage}

## Instructions

1. Use Google Search to research the user's suggestions and find evidence-based approaches.
2. Modify the protocol to incorporate the user's changes where supported by evidence.
3. If a suggestion conflicts with evidence, adapt it to the closest evidence-based alternative.
4. Maintain the parts of the protocol that work well and aren't affected by the changes.
5. Provide clear reasoning explaining what you changed and why.

Generate the modified protocol with reasoning now.`;

  const response = await client.models.generateContent({
    model: MODEL_GROUNDED,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: 'application/json',
      responseSchema: modifyResultSchema as any,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('No response from Gemini when modifying protocol');
  }

  const parsed = JSON.parse(text);
  validateExerciseData(parsed);
  const protocolData = dailyProtocolSchema.parse(parsed);

  return {
    protocol: protocolData,
    reasoning: parsed.reasoning || 'Protocol modified based on your suggestions.',
  };
}

const askResultSchema = {
  type: 'object',
  properties: {
    answer: { type: 'string', description: 'Short, conversational answer (2-4 sentences) to the user question about their protocol' },
    suggestsModification: { type: 'boolean', description: 'True if the answer implies the user might want to modify their protocol' },
  },
  required: ['answer', 'suggestsModification'],
} as const;

function buildAskPrompt(
  protocol: DailyProtocol,
  config: UserConfig | AnonymousUserConfig,
  question: string
): string {
  return `You are a knowledgeable health coach having a quick chat with the user about their protocol. Answer in 2-4 sentences. Be direct and conversational — no bullet points or formal structure unless specifically asked. If the question suggests a protocol change, briefly note the trade-off and suggest they use the Modify feature to make changes.

## User Configuration
${JSON.stringify(config, null, 2)}

## Current Protocol
${JSON.stringify(protocol, null, 2)}

## User's Question
${question}

Answer concisely now.`;
}

/**
 * Answer a question about a protocol, optionally using search grounding.
 */
export async function askAboutProtocol(
  protocol: DailyProtocol,
  config: UserConfig | AnonymousUserConfig,
  question: string
): Promise<{ answer: string; suggestsModification: boolean }> {
  const client = getGeminiClient();

  const prompt = buildAskPrompt(protocol, config, question);

  const response = await client.models.generateContent({
    model: MODEL_GROUNDED,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: 'application/json',
      responseSchema: askResultSchema as any,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('No response from Gemini when answering question');
  }

  return JSON.parse(text);
}

// Combined schema for parsing protocol text with inferred goals
const protocolWithGoalsGeminiSchema = {
  type: 'object',
  properties: {
    ...dailyProtocolGeminiSchema.properties,
    goals: {
      type: 'array',
      description: 'Health and fitness goals inferred from the protocol. Weights must sum to 1.0.',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Short goal name, e.g. "Muscle Gain", "Fat Loss", "Longevity"' },
          weight: { type: 'number', description: 'Relative importance 0-1. All weights must sum to 1.0.' },
          description: { type: 'string', description: 'Brief description of what this goal entails' },
        },
        required: ['name', 'weight', 'description'],
      },
    },
  },
  required: [...dailyProtocolGeminiSchema.required, 'goals'],
} as const;

type ParseWithGoalsResult = {
  protocol: DailyProtocol;
  goals: Goal[];
};

/**
 * Parse unstructured text into a structured protocol and infer goals using Gemini.
 * Goals may be explicit (stated in the text) or implicit (inferred from the protocol content).
 */
export async function parseProtocolWithGoals(text: string): Promise<ParseWithGoalsResult> {
  const client = getGeminiClient();

  const prompt = `You are an expert at parsing health and fitness protocols. The user has pasted text that describes a health protocol. Your job is to:
1. Extract and structure the protocol information
2. Determine the user's health/fitness goals — both explicit (stated in the text) and implicit (inferred from what the protocol prioritizes)

## User's Pasted Text
${text}

## CRITICAL: Time Format Requirements
ALL times MUST be in 24-hour HH:MM format with leading zeros:
- Correct: "06:00", "07:30", "14:00", "22:00"
- Wrong: "6:00", "7:30 AM", "2pm", "10:00 PM"

Examples:
- 6am → "06:00"
- 7:30am → "07:30"
- 12pm → "12:00"
- 2:30pm → "14:30"
- 10pm → "22:00"

## Protocol Extraction Instructions

1. Extract all relevant information from the text above.
2. Structure it into a complete daily health protocol with:
   - Schedule (wake time, sleep time, daily activities with times in HH:MM format)
   - Diet (calories, macros, meals with nutritional info)
   - Supplementation (supplements with dosage, timing, purpose)
   - Training (workout program with exercises, sets, reps)

3. If information is missing or unclear:
   - For schedule: Use reasonable defaults (e.g., "07:00" wake, "22:00" sleep)
   - For diet: Estimate based on any mentioned foods or goals
   - For supplements: Only include what's explicitly mentioned
   - For training: Structure any mentioned exercises appropriately

4. Make reasonable inferences where the text is ambiguous, but don't invent information that contradicts what's provided.
5. Ensure all required fields are filled with sensible values.
6. REMINDER: All start_time and end_time fields MUST be in HH:MM format (e.g., "06:00", "14:30", "22:00").

## Goal Inference Instructions

Determine the user's goals from the protocol. Look for:
- **Explicit goals**: Anything the user states they want to achieve (e.g., "I want to build muscle", "my goal is fat loss")
- **Implicit goals**: Infer from protocol choices:
  - High protein + heavy resistance training → Muscle Gain
  - Calorie deficit + lots of cardio → Fat Loss
  - Anti-inflammatory foods + antioxidant supplements → Longevity
  - Meditation + sleep hygiene focus → Stress Management
  - Varied training + balanced macros → General Health
  - Specific sport training → Athletic Performance
  - Joint mobility work + stretching → Flexibility/Mobility
  - Heart-healthy foods + zone 2 cardio → Cardiovascular Health

Return 1-5 goals with weights summing to 1.0. Weight the most prominent goal highest.

Parse the protocol and determine goals now.`;

  const response = await client.models.generateContent({
    model: MODEL_GROUNDED,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: protocolWithGoalsGeminiSchema as any,
    },
  });

  const responseText = response.text;
  if (!responseText) {
    throw new Error('No response from Gemini when parsing protocol');
  }

  const parsed = JSON.parse(responseText);

  // Validate protocol
  const protocol = dailyProtocolSchema.parse(parsed);

  // Validate and normalize goals
  const rawGoals = (parsed.goals || []) as Array<{ name: string; weight: number; description?: string }>;
  let goals: Goal[] = rawGoals.map((g) => goalSchema.parse(g));

  // Ensure weights sum to 1.0
  if (goals.length > 0) {
    const sum = goals.reduce((acc, g) => acc + g.weight, 0);
    if (Math.abs(sum - 1.0) > 0.01) {
      goals = goals.map((g) => ({ ...g, weight: g.weight / sum }));
    }
  } else {
    goals = [{ name: 'General Health', weight: 1.0, description: 'Improve overall health' }];
  }

  return { protocol, goals };
}

// ---------------------------------------------------------------------------
// Streaming variants
// ---------------------------------------------------------------------------

/**
 * Stream protocol generation. Yields text chunks, returns parsed DailyProtocol.
 */
export async function* generateProtocolStream(
  config: UserConfig | AnonymousUserConfig,
  userNotes?: string[]
): AsyncGenerator<string, DailyProtocol, unknown> {
  const startTime = Date.now();
  const log = (step: string) => console.log(`[gemini:generateProtocolStream] ${step} @ ${Date.now() - startTime}ms`);

  log('start');
  const client = getGeminiClient();
  const prompt = buildGenerationPrompt(config, userNotes);
  log(`built prompt, calling Gemini stream API with model: ${MODEL_FAST} (no grounding)...`);

  const stream = await client.models.generateContentStream({
    model: MODEL_FAST,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: dailyProtocolGeminiSchema as any,
    },
  });
  log('stream created, waiting for first chunk...');

  let fullText = '';
  let chunkCount = 0;
  let firstChunkTime: number | null = null;
  for await (const chunk of stream) {
    if (firstChunkTime === null) {
      firstChunkTime = Date.now() - startTime;
      log(`first chunk received @ ${firstChunkTime}ms`);
    }
    chunkCount++;
    const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (text) {
      fullText += text;
      yield text;
    }
  }
  log(`stream complete (${chunkCount} chunks, ${fullText.length} chars)`);

  log('parsing response');
  const parsed = JSON.parse(fullText);
  const result = dailyProtocolSchema.parse(parsed);
  log('done');
  return result;
}

/**
 * Stream protocol modification. Yields text chunks, returns modified protocol + reasoning.
 */
export async function* modifyProtocolStream(
  protocol: DailyProtocol,
  config: UserConfig | AnonymousUserConfig,
  userMessage: string
): AsyncGenerator<string, { protocol: DailyProtocol; reasoning: string }, unknown> {
  const client = getGeminiClient();

  const prompt = `You are an expert health protocol modifier. The user wants to change their protocol. Research their suggestions using current evidence and generate a modified protocol.

## User Configuration
${JSON.stringify(config, null, 2)}

## Current Protocol
${JSON.stringify(protocol, null, 2)}

## User's Requested Changes
${userMessage}

## Instructions

1. Use Google Search to research the user's suggestions and find evidence-based approaches.
2. Modify the protocol to incorporate the user's changes where supported by evidence.
3. If a suggestion conflicts with evidence, adapt it to the closest evidence-based alternative.
4. Maintain the parts of the protocol that work well and aren't affected by the changes.
5. Provide clear reasoning explaining what you changed and why.

Generate the modified protocol with reasoning now.`;

  const stream = await client.models.generateContentStream({
    model: MODEL_GROUNDED,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: 'application/json',
      responseSchema: modifyResultSchema as any,
    },
  });

  let fullText = '';
  for await (const chunk of stream) {
    const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (text) {
      fullText += text;
      yield text;
    }
  }

  const parsed = JSON.parse(fullText);
  validateExerciseData(parsed);
  const protocolData = dailyProtocolSchema.parse(parsed);

  return {
    protocol: protocolData,
    reasoning: parsed.reasoning || 'Protocol modified based on your suggestions.',
  };
}

/**
 * Stream answer to a question about the protocol. Yields text chunks, returns answer.
 */
export async function* askAboutProtocolStream(
  protocol: DailyProtocol,
  config: UserConfig | AnonymousUserConfig,
  question: string
): AsyncGenerator<string, { answer: string; suggestsModification: boolean }, unknown> {
  const client = getGeminiClient();
  const prompt = buildAskPrompt(protocol, config, question);

  const stream = await client.models.generateContentStream({
    model: MODEL_GROUNDED,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: 'application/json',
      responseSchema: askResultSchema as any,
    },
  });

  let fullText = '';
  for await (const chunk of stream) {
    const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (text) {
      fullText += text;
      yield text;
    }
  }

  return JSON.parse(fullText);
}

// ---------------------------------------------------------------------------
// Critique application (lightweight modify without re-evaluation)
// ---------------------------------------------------------------------------

const critiqueSuggestionsSchema = {
  ...dailyProtocolGeminiSchema,
} as const;

/**
 * Apply specific critique suggestions to a protocol without full re-evaluation.
 */
export async function applyCritiqueSuggestions(
  protocol: DailyProtocol,
  suggestions: string[]
): Promise<DailyProtocol> {
  const client = getGeminiClient();

  const suggestionsText = suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n');

  const prompt = `You are a health protocol editor. Apply ONLY these specific improvement suggestions to the protocol below. Do not make any other changes. Do not re-evaluate or re-score the protocol.

## Current Protocol
${JSON.stringify(protocol, null, 2)}

## Suggestions to Apply
${suggestionsText}

## CRITICAL: Data Preservation Rules
- Exercise fields (sets, reps, duration_min, rest_sec, notes) must be preserved EXACTLY as-is unless the suggestion specifically addresses them
- "sets" is always an integer (e.g., 3 or 4), never a combined value
- "reps" is always a string (e.g., "8-12" or "10"), separate from sets
- Do NOT combine or concatenate numeric values
- If an exercise has sets: 3 and reps: "8-12", keep them as separate fields
- Copy all exercise data verbatim unless explicitly changing it

## Instructions
1. Apply each suggestion as directly and minimally as possible.
2. Only change the parts of the protocol that the suggestions specifically address.
3. For training exercises: preserve all existing values for sets, reps, duration_min, rest_sec, and notes unless the suggestion explicitly asks to change them.
4. Keep everything else EXACTLY the same - copy values directly from the input.

Return the updated protocol now.`;

  const response = await client.models.generateContent({
    model: MODEL_GROUNDED,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: critiqueSuggestionsSchema as any,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('No response from Gemini when applying critique suggestions');
  }

  const parsed = JSON.parse(text);
  validateExerciseData(parsed);
  return dailyProtocolSchema.parse(parsed);
}

// ---------------------------------------------------------------------------
// Preference Note Extraction
// ---------------------------------------------------------------------------

const noteExtractionSchema = {
  type: 'object',
  properties: {
    notes: {
      type: 'array',
      items: { type: 'string' },
      description: 'Preference notes extracted from the user message. Each note should be a concise statement about what the user prefers or dislikes.',
    },
  },
  required: ['notes'],
} as const;

/**
 * Extract preference notes from a user's modification request.
 * Returns an array of concise preference statements.
 */
export async function extractPreferenceNotes(userMessage: string): Promise<string[]> {
  const client = getGeminiClient();

  const prompt = `Analyze the following user message about modifying their health protocol. Extract any preferences, likes, dislikes, or constraints they mention. Return them as concise, reusable preference notes.

Only extract clear preferences - don't make assumptions. If no preferences are expressed, return an empty array.

Examples of preferences to extract:
- "I prefer morning workouts" → "Prefers morning workouts"
- "I don't like running" → "Dislikes running"
- "Can we reduce the protein?" → "Prefers lower protein intake"
- "I need to be done by 8pm" → "Needs to finish activities by 8pm"

User message:
${userMessage}

Extract preference notes now.`;

  try {
    const response = await client.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: noteExtractionSchema as any,
      },
    });

    const text = response.text;
    if (!text) {
      return [];
    }

    const parsed = JSON.parse(text);
    return Array.isArray(parsed.notes) ? parsed.notes.filter((n: unknown) => typeof n === 'string' && n.length > 0) : [];
  } catch (error) {
    console.error('[extractPreferenceNotes] Error:', error);
    return [];
  }
}
