import { getGeminiClient, MODEL_NAME } from './client';
import { dailyProtocolSchema, type DailyProtocol, type VerificationResult } from '../schemas/protocol';
import type { UserConfig, AnonymousUserConfig } from '../schemas/user-config';
import { goalSchema, type Goal } from '../schemas/user-config';

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
        daily_calories: { type: 'integer' },
        protein_target_g: { type: 'number' },
        carbs_target_g: { type: 'number' },
        fat_target_g: { type: 'number' },
        meals: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              time: { type: 'string', description: 'Meal time in HH:MM 24-hour format, e.g. "12:00"' },
              foods: { type: 'array', items: { type: 'string' } },
              calories: { type: 'integer' },
              protein_g: { type: 'number' },
              carbs_g: { type: 'number' },
              fat_g: { type: 'number' },
              notes: { type: 'string' },
            },
            required: ['name', 'time', 'foods', 'calories', 'protein_g', 'carbs_g', 'fat_g'],
          },
        },
        hydration_oz: { type: 'number' },
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
        days_per_week: { type: 'integer' },
        workouts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              day: { type: 'string' },
              duration_min: { type: 'integer' },
              exercises: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    sets: { type: 'integer' },
                    reps: { type: 'string' },
                    duration_min: { type: 'integer' },
                    rest_sec: { type: 'integer' },
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
  config: UserConfig | AnonymousUserConfig
): Promise<DailyProtocol> {
  const client = getGeminiClient();

  const prompt = buildGenerationPrompt(config);

  const response = await client.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: 'application/json',
      responseSchema: dailyProtocolGeminiSchema as any,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('No response from Gemini');
  }

  const parsed = JSON.parse(text);
  return dailyProtocolSchema.parse(parsed);
}

function buildGenerationPrompt(config: UserConfig | AnonymousUserConfig): string {
  const { personal_info, goals, requirements } = config;

  const goalsText = goals
    .map((g) => `- ${g.name} (weight: ${g.weight})`)
    .join('\n');

  const requirementsText = requirements.length > 0
    ? requirements.map((r) => `- ${r}`).join('\n')
    : 'No specific requirements provided.';

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
${requirementsText}

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
    model: MODEL_NAME,
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
    model: MODEL_NAME,
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
    model: MODEL_NAME,
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
    model: MODEL_NAME,
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
  config: UserConfig | AnonymousUserConfig
): AsyncGenerator<string, DailyProtocol, unknown> {
  const client = getGeminiClient();
  const prompt = buildGenerationPrompt(config);

  const stream = await client.models.generateContentStream({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: 'application/json',
      responseSchema: dailyProtocolGeminiSchema as any,
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
  return dailyProtocolSchema.parse(parsed);
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
    model: MODEL_NAME,
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
    model: MODEL_NAME,
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

## Instructions
1. Apply each suggestion as directly and minimally as possible.
2. Only change the parts of the protocol that the suggestions address.
3. Keep everything else exactly the same.

Return the updated protocol now.`;

  const response = await client.models.generateContent({
    model: MODEL_NAME,
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

  return dailyProtocolSchema.parse(JSON.parse(text));
}
