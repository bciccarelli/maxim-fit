import { getGeminiClient, MODEL_NAME } from './client';
import { dailyProtocolSchema, type DailyProtocol } from '../schemas/protocol';
import type { UserConfig, AnonymousUserConfig } from '../schemas/user-config';

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
      responseSchema: dailyProtocolGeminiSchema,
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
- Genetic Background: ${personal_info.genetic_background}
- Health Conditions: ${personal_info.health_conditions.length > 0 ? personal_info.health_conditions.join(', ') : 'None reported'}
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
5. Consider the user's health conditions and restrictions when making recommendations.

Generate the protocol now.`;
}

type EvaluationResult = {
  requirement_scores: Array<{
    requirement_name: string;
    target: number;
    achieved: number;
    adherence_percent: number;
    suggestions: string;
  }>;
  goal_scores: Array<{
    goal_name: string;
    score: number;
    reasoning: string;
    suggestions: string;
  }>;
  critiques: Array<{
    category: string;
    criticism: string;
    severity: 'minor' | 'moderate' | 'major';
    suggestion: string;
  }>;
  requirements_met: boolean;
  weighted_goal_score: number;
  viability_score: number;
};

const evaluationSchema = {
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
 * Full evaluation with Google Search grounding for authenticated users.
 */
export async function evaluateProtocol(
  protocol: DailyProtocol,
  config: UserConfig | AnonymousUserConfig
): Promise<EvaluationResult> {
  const client = getGeminiClient();

  const prompt = `You are a critical evaluator of health protocols. Analyze the following protocol and provide honest, thorough feedback.

## User Configuration
${JSON.stringify(config, null, 2)}

## Generated Protocol
${JSON.stringify(protocol, null, 2)}

## Evaluation Tasks

1. **Requirement Adherence**: For each requirement, score how well the protocol meets it (0-100%).
2. **Goal Scores**: For each goal, score how well the protocol supports it (0-100) with reasoning.
3. **Critiques**: Identify weaknesses, potential issues, and areas for improvement. Be a devil's advocate.
4. **Overall Viability**: Score how likely this protocol is to be followed long-term (0-100).

Be thorough and honest. A protocol that won't be followed is worthless.`;

  const response = await client.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: 'application/json',
      responseSchema: evaluationSchema,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('No evaluation response from Gemini');
  }

  return JSON.parse(text);
}

/**
 * Parse unstructured text into a structured protocol using Gemini.
 * Useful for importing protocols from other sources or pasted text.
 */
export async function parseProtocolText(text: string): Promise<DailyProtocol> {
  const client = getGeminiClient();

  const prompt = `You are an expert at parsing health and fitness protocols. The user has pasted text that describes a health protocol. Your job is to extract and structure this information into a complete protocol format.

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

## Instructions

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

Parse the protocol now.`;

  const response = await client.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: dailyProtocolGeminiSchema,
    },
  });

  const responseText = response.text;
  if (!responseText) {
    throw new Error('No response from Gemini when parsing protocol');
  }

  const parsed = JSON.parse(responseText);
  return dailyProtocolSchema.parse(parsed);
}
