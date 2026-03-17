import { getGeminiClient, MODEL_GROUNDED, MODEL_FAST, MODEL_RESEARCH, MODEL_STRUCTURED } from './client';
import { createPartFromBase64, type Part } from '@google/genai';
import { dailyProtocolSchema, normalizeProtocol, type DailyProtocol, type VerificationResult, type Citation, type QuestionAnswer, type ClarifyingQuestion } from '../schemas/protocol';
import type { UserConfig, AnonymousUserConfig } from '../schemas/user-config';
import { goalSchema, type Goal } from '../schemas/user-config';
import { extractCitations, getGroundingMetadata } from './citations';

export type ImageData = {
  base64: string;
  mimeType: string;
};

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
    schedules: {
      type: 'array',
      description: 'Schedule variants for different days. Each day of the week must appear in exactly one variant. Use multiple variants when user requirements differ by day (e.g., weekdays vs weekends, work days vs off days).',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string', description: 'Human-readable name for this schedule variant, e.g. "Weekday Schedule", "Weekend Schedule"' },
          days: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
            },
            description: 'Days this schedule applies to. All 7 days must be covered exactly once across all variants.',
          },
          wake_time: { type: 'string', description: 'Wake time in HH:MM 24-hour format, e.g. "07:00"' },
          sleep_time: { type: 'string', description: 'Sleep time in HH:MM 24-hour format, e.g. "22:00"' },
          other_events: {
            type: 'array',
            description: 'Simple standalone events that are NOT meals, supplements, or workouts. For grouped activities (morning routine with multiple steps), use routine_events instead.',
            items: {
              type: 'object',
              properties: {
                start_time: { type: 'string', description: 'Start time in HH:MM 24-hour format, e.g. "07:00"' },
                end_time: { type: 'string', description: 'End time in HH:MM 24-hour format, e.g. "08:00"' },
                activity: { type: 'string', description: 'Activity name, e.g. "Commute", "Work", "Reading"' },
                requirement_satisfied: { type: 'string', description: 'Optional: name of requirement this activity satisfies' },
              },
              required: ['start_time', 'end_time', 'activity'],
            },
          },
          routine_events: {
            type: 'array',
            description: 'Grouped activities that form a routine (e.g., Morning Routine, Evening Wind-down). Use routines to group related activities that naturally occur together. Supplements/meals in routines should still exist in their respective arrays - reference them by index.',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Routine name, e.g. "Morning Routine", "Evening Wind-down", "Post-Workout Recovery"' },
                start_time: { type: 'string', description: 'Routine start time in HH:MM 24-hour format' },
                sub_events: {
                  type: 'array',
                  description: 'Ordered list of activities within the routine. Each sub-event has a type, order, and duration.',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string', enum: ['activity', 'supplement', 'meal'], description: 'Type of sub-event' },
                      order: { type: 'integer', minimum: 0, description: 'Sequence order (0-based). Sub-events execute in this order.' },
                      duration_min: { type: 'integer', minimum: 1, description: 'Duration in minutes' },
                      activity: { type: 'string', description: 'Activity name (for type=activity), e.g. "Shower", "Meditate", "Journal"' },
                      supplement_index: { type: 'integer', minimum: 0, description: 'Index into supplements array (for type=supplement). The supplement must exist in supplementation.supplements[].' },
                      meal_index: { type: 'integer', minimum: 0, description: 'Index into meals array (for type=meal). The meal must exist in diet.meals[].' },
                      notes: { type: 'string' },
                    },
                    required: ['type', 'order', 'duration_min'],
                  },
                },
                notes: { type: 'string' },
                requirement_satisfied: { type: 'string', description: 'Optional: name of requirement this routine satisfies' },
              },
              required: ['name', 'start_time', 'sub_events'],
            },
          },
        },
        required: ['days', 'wake_time', 'sleep_time', 'other_events', 'routine_events'],
      },
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
              dosage_amount: { type: 'string', description: 'Numeric amount only, e.g. "500", "2000", "1"' },
              dosage_unit: { type: 'string', description: 'Unit of measurement, e.g. "mg", "g", "mcg", "IU", "capsules"' },
              dosage_notes: { type: 'string', description: 'Optional notes about the dosage, e.g. "standardized to 3%", "elemental magnesium"' },
              time: { type: 'string', description: 'Time in HH:MM 24-hour format. IMPORTANT: If taken with a meal, use EXACTLY the same time as that meal (e.g., if breakfast is at "07:30", set this to "07:30")' },
              timing: { type: 'string', description: 'Context for when to take the supplement, e.g. "Morning with breakfast", "Before bed", "Post-workout"' },
              purpose: { type: 'string' },
              notes: { type: 'string' },
            },
            required: ['name', 'dosage_amount', 'dosage_unit', 'time', 'timing', 'purpose'],
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
              time: { type: 'string', description: 'Workout start time in HH:MM 24-hour format, e.g. "06:00", "17:30"' },
              duration_min: { type: 'integer', minimum: 1 },
              exercises: {
                type: 'array',
                description: 'All exercises in order. Include warmup exercises first (e.g., "Dynamic stretching", 5 min), main workout exercises, then cooldown exercises last (e.g., "Static stretching", 5 min). Warmup/cooldown exercises typically have duration_min instead of sets/reps.',
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
            },
            required: ['name', 'day', 'time', 'duration_min', 'exercises'],
          },
        },
        rest_days: { type: 'array', items: { type: 'string' } },
        progression_notes: { type: 'string' },
        general_notes: { type: 'array', items: { type: 'string' } },
      },
      required: ['program_name', 'days_per_week', 'workouts', 'rest_days', 'progression_notes', 'general_notes'],
    },
  },
  required: ['schedules', 'diet', 'supplementation', 'training'],
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

  // Normalize weights to sum to 1.0 for the AI prompt
  const totalWeight = goals.reduce((acc, g) => acc + g.weight, 0);
  const normalizedGoals = totalWeight > 0
    ? goals.map(g => ({ ...g, weight: g.weight / totalWeight }))
    : goals;
  const goalsText = normalizedGoals
    .map((g) => `- ${g.name} (weight: ${g.weight.toFixed(2)})`)
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
   - Schedule variant(s) with wake/sleep times and other activities
   - A comprehensive diet plan with macros and specific meals (each meal has its own time)
   - A supplementation plan tailored to their goals (each supplement has its own time)
   - A training program appropriate for their fitness level and goals (each workout has a day and time)
3. Ensure all requirements are satisfied where possible.
4. Prioritize adherence - the protocol must be realistic and sustainable.
5. Optimize for the user's stated wellness goals and lifestyle preferences.

## Schedule Architecture Rules

The schedule is EVENT-DRIVEN. Timing information lives in the relevant section:
- **Meals**: Each meal has a "time" field (e.g., breakfast at "07:30")
- **Supplements**: Each supplement has a "time" field (e.g., vitamin D at "07:00")
- **Workouts**: Each workout has a "time" field (e.g., strength training at "06:00")
- **Routines**: Grouped activities that naturally occur together (e.g., morning routine with shower, supplements, breakfast)
- **Other events**: Simple standalone activities (e.g., commute, work block, reading)

## Routine Architecture Rules

Use ROUTINES to group related activities that naturally occur together. This creates a cleaner schedule.

**When to use routines:**
- Morning activities after waking (shower, skincare, morning supplements, breakfast)
- Evening wind-down (meditation, journaling, evening supplements, prep for sleep)
- Post-workout recovery (shower, protein shake, stretching)
- Pre-bed routine (supplements, relaxation)

**Structure:**
- Routine has a "name" and "start_time"
- Sub-events have "type", "order", and "duration_min"
- For supplement sub-events: set type="supplement" and "supplement_index" matching the supplement's position in the supplements array (0-indexed)
- For meal sub-events: set type="meal" and "meal_index" matching the meal's position in the meals array (0-indexed)
- For activities: set type="activity" and provide "activity" name

**IMPORTANT:**
- Supplements/meals in routines MUST still exist in their respective arrays (single source of truth)
- The "supplement_index" / "meal_index" references that item (0-indexed)
- Items referenced by routines are hidden from standalone timeline slots (no duplication in display)
- Sub-event times are computed from routine start_time + cumulative duration

**Example Morning Routine:**
{
  "name": "Morning Routine",
  "start_time": "06:30",
  "sub_events": [
    { "type": "activity", "order": 0, "duration_min": 10, "activity": "Shower & skincare" },
    { "type": "supplement", "order": 1, "duration_min": 2, "supplement_index": 0 },
    { "type": "supplement", "order": 2, "duration_min": 2, "supplement_index": 1 },
    { "type": "meal", "order": 3, "duration_min": 20, "meal_index": 0 }
  ]
}

**Use other_events only for:**
- Commute (e.g., "08:00" - "08:30")
- Work block (e.g., "09:00" - "17:00")
- Simple standalone activities (reading, errands)

## Schedule Variant Rules

Analyze the user's requirements to determine if different schedules are needed for different days:
- If requirements mention work schedule, office hours, weekdays, or weekends, create separate schedule variants (e.g., "Weekday Schedule" for Mon-Fri and "Weekend Schedule" for Sat-Sun)
- Common patterns: "I work 9-5" or "I work Monday to Friday" → weekday schedule differs from weekend
- "I only workout on Mon/Wed/Fri" → schedule might vary on workout vs non-workout days
- If no day-specific requirements exist, create a single schedule with all 7 days

Each schedule variant must specify which days it applies to via the "days" array. All 7 days (monday through sunday) must be covered exactly once across all variants.

## Supplement Timing Rules

When a supplement should be taken WITH a meal:
1. Set the supplement's "time" field to EXACTLY match the meal's time (e.g., if breakfast is at "07:30", vitamin D taken with breakfast should also be "07:30")
2. Use the "timing" field to document the relationship (e.g., "With breakfast")

Common meal-associated supplements (should match meal times):
- Fat-soluble vitamins (A, D, E, K) → take with a meal containing fat
- Omega-3 / Fish oil → take with a meal
- Digestive enzymes → take WITH meals

Standalone supplement timing (separate from meals):
- Magnesium → often before bed
- Melatonin → 30-60 min before sleep
- Pre-workout supplements → before training
- Post-workout supplements (creatine, protein) → after training
- Iron on empty stomach → separate time from meals

IMPORTANT: When supplement timing matches a meal, use EXACTLY the same time. Do NOT create times that differ by only a few minutes.

## Food Preparation Events

When the diet includes foods requiring advance preparation, create prep events in "other_events":

**Overnight prep (evening before):**
- Overnight oats → "Prep: Overnight oats" at ~21:00 the night before
- Marinating 12+ hours → start evening before
- Slow cooker overnight → start before bed

**Same-day prep:**
- Marinating 1-4 hours → 2-4 hours before the meal
- Defrosting frozen items → 4-8 hours before
- Slow cooker (8 hours) → morning prep for dinner

Format for prep events:
- Activity: "Prep: [food name]" (e.g., "Prep: Overnight oats for tomorrow")
- Duration: 5-15 min for simple prep

## Exercise Structure

Each workout's exercises array should include ALL exercises in order:
1. **Warmup exercises FIRST** (e.g., "Dynamic stretching", "Light cardio") - typically duration-based (duration_min: 5)
2. **Main workout exercises** - typically sets/reps-based (sets: 3, reps: "8-12")
3. **Cooldown exercises LAST** (e.g., "Static stretching", "Foam rolling") - typically duration-based (duration_min: 5)

Do NOT use separate warmup/cooldown fields. All exercises go in the exercises array.

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
          questions: {
            type: 'array',
            description: 'Clarifying questions to ask before applying this suggestion. Only include when user input would meaningfully affect implementation.',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Unique identifier (e.g., "c0_q1")' },
                question: { type: 'string', description: 'Clear, concise question' },
                context: { type: 'string', description: 'Why this question matters' },
                options: {
                  type: 'array',
                  description: 'Predefined choices if common options exist',
                  items: {
                    type: 'object',
                    properties: {
                      value: { type: 'string' },
                      label: { type: 'string' },
                    },
                    required: ['value', 'label'],
                  },
                },
                inputType: { type: 'string', enum: ['text', 'select'], description: '"text" for open-ended, "select" for multiple choice' },
              },
              required: ['id', 'question', 'inputType'],
            },
          },
        },
        required: ['category', 'criticism', 'severity', 'suggestion'],
      },
    },
    requirements_met: { type: 'boolean' },
    weighted_goal_score: { type: 'number' },
  },
  required: ['requirement_scores', 'goal_scores', 'critiques', 'requirements_met', 'weighted_goal_score'],
} as const;

/**
 * Format training data as human-readable summary to reduce Gemini misreading JSON.
 */
function formatTrainingSummary(protocol: DailyProtocol): string {
  if (!protocol.training?.workouts?.length) return 'No training workouts defined.';

  return protocol.training.workouts.map(w => {
    const exercises = w.exercises.map(e =>
      `  - ${e.name}: ${e.sets} sets × ${e.reps} reps`
    ).join('\n');
    return `${w.name}:\n${exercises}`;
  }).join('\n\n');
}

/**
 * Verify a protocol's evidence base using Google Search grounding.
 * Returns verification result along with citations from grounding.
 */
export async function verifyProtocol(
  protocol: DailyProtocol,
  config: UserConfig | AnonymousUserConfig
): Promise<{ verification: VerificationResult; citations: Citation[] }> {
  const client = getGeminiClient();

  const prompt = `You are a critical verifier of health protocols. Verify this protocol's evidence base using current research. Analyze the following protocol and provide honest, thorough feedback.

## User Configuration
${JSON.stringify(config, null, 2)}

## Protocol to Verify
${JSON.stringify(protocol, null, 2)}

## Training Data Reference
The following is a human-readable summary of the training section for clarity:

${formatTrainingSummary(protocol)}

## Verification Tasks

1. **Requirement Adherence**: For each requirement, score how well the protocol meets it (0-100%).
2. **Goal Scores**: For each goal, score how well the protocol supports it (0-100) with reasoning based on current evidence.
3. **Critiques**: Identify weaknesses, potential issues, and areas for improvement. Verify claims against current research.

   For each critique, determine if applying the suggestion requires user input. If so, generate 1-3 clarifying questions. Include questions when:
   - The suggestion has multiple valid approaches (e.g., "reduce training" could mean fewer days OR shorter sessions)
   - User preferences would significantly affect implementation (e.g., equipment availability, food preferences)
   - Research shows trade-offs the user should choose between

   DO NOT generate questions for straightforward suggestions with one clear implementation path.

   Question format:
   - id: unique identifier (e.g., "c0_q1" for critique 0, question 1)
   - question: clear, concise question
   - context: 1 sentence explaining why this matters (optional)
   - options: provide if there are common research-backed choices (use inputType: "select")
   - inputType: "text" for open-ended, "select" for multiple choice

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

  // Extract citations from grounding metadata
  const groundingMetadata = getGroundingMetadata(response);
  const citations = extractCitations(groundingMetadata, 'verify');

  return {
    verification: JSON.parse(text),
    citations,
  };
}

const modifyResultSchema = {
  type: 'object',
  properties: {
    ...dailyProtocolGeminiSchema.properties,
    reasoning: { type: 'string', description: 'Explanation of what was changed and why, based on research' },
  },
  required: [...dailyProtocolGeminiSchema.required, 'reasoning'],
} as const;

// ---------------------------------------------------------------------------
// Questions Analysis Schema (Phase 2 of new Modify flow)
// ---------------------------------------------------------------------------

const questionsAnalysisSchema = {
  type: 'object',
  properties: {
    hasQuestions: { type: 'boolean', description: 'True if clarifying questions are needed before making the modification' },
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Unique identifier for this question' },
          question: { type: 'string', description: 'The clarifying question to ask the user' },
          context: { type: 'string', description: 'Why this question matters for the modification' },
          options: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                value: { type: 'string', description: 'Value to store if selected' },
                label: { type: 'string', description: 'Display label for this option' },
              },
              required: ['value', 'label'],
            },
          },
          inputType: { type: 'string', enum: ['text', 'select'], description: 'Type of input: text for free-form, select for multiple choice' },
        },
        required: ['id', 'question', 'inputType'],
      },
    },
    researchSummary: { type: 'string', description: 'Brief 1-2 sentence summary of what the research found' },
  },
  required: ['hasQuestions', 'questions', 'researchSummary'],
} as const;

// ---------------------------------------------------------------------------
// Two-Phase Modification: Research + Apply
// ---------------------------------------------------------------------------

/**
 * Build prompt for Phase 1: Research the user's modification request.
 * Uses Google Search grounding, returns free-form prose (no structured output).
 */
function buildResearchPrompt(
  protocol: DailyProtocol,
  config: UserConfig | AnonymousUserConfig,
  userMessage: string,
  userPreferences?: string[]
): string {
  const preferencesSection = userPreferences && userPreferences.length > 0
    ? `\n\n## User Preferences (from previous interactions)
These are established preferences the user has expressed. Research should respect these constraints:
${userPreferences.map((p) => `- ${p}`).join('\n')}`
    : '';

  return `You are a health research specialist. Research the user's protocol modification request using Google Search.

## User Configuration
${JSON.stringify(config, null, 2)}${preferencesSection}

## Current Protocol Summary
- Wake: ${protocol.schedules[0]?.wake_time || 'N/A'}, Sleep: ${protocol.schedules[0]?.sleep_time || 'N/A'}
- Daily calories: ${protocol.diet.daily_calories}, Protein: ${protocol.diet.protein_target_g}g
- Training: ${protocol.training.program_name} (${protocol.training.days_per_week}x/week)
- Supplements: ${protocol.supplementation.supplements.map(s => s.name).join(', ') || 'None'}

## User's Requested Changes
${userMessage}

## Instructions

Use Google Search to research the user's request. Provide:

**Research Findings**:
- Current evidence-based recommendations for their request
- Relevant dosages, timings, or protocols from studies
- Any conflicts with their existing protocol

**Implementation Recommendations**:
- Specific changes to make based on the evidence
- Adjustments to other protocol areas if needed
- Timing or interaction considerations

**Cautions**:
- Potential risks or contraindications
- What to monitor or avoid

## Routine Research Guidance

If the user mentions "routine", "collect", "group", "organize", "morning tasks", or "evening tasks":
- Research how to structure morning/evening routines for health optimization
- Consider what activities naturally group together (shower, skincare, supplements, meals)
- Research optimal timing and sequencing for routine activities
- Note: The protocol uses routine_events with sub_events that reference supplements/meals by index
- Recommend which existing supplements/meals/activities should be grouped into which routine

Write clear, organized prose. Do NOT output JSON.`;
}

/**
 * Build prompt for Phase 2: Apply research findings to modify the protocol.
 * Uses structured output, no grounding (relies on Phase 1 research).
 */
function buildApplyPrompt(
  protocol: DailyProtocol,
  config: UserConfig | AnonymousUserConfig,
  userMessage: string,
  researchText: string,
  userPreferences?: string[]
): string {
  const preferencesSection = userPreferences && userPreferences.length > 0
    ? `\n\n## User Preferences (MUST be respected)
These are established preferences from previous interactions. The modification MUST respect these:
${userPreferences.map((p) => `- ${p}`).join('\n')}`
    : '';

  return `You are an expert health protocol modifier. Apply the research findings to modify the user's protocol.${preferencesSection}

## User Configuration
${JSON.stringify(config, null, 2)}

## Current Protocol
${JSON.stringify(protocol, null, 2)}

## User's Requested Changes
${userMessage}

## Research Findings (from evidence-based search)
${researchText}

## Instructions

1. Modify the protocol incorporating the research findings above.
2. If research suggests adjustments to the user's request, implement the evidence-based version.
3. Maintain unaffected parts of the protocol exactly as they are.
4. Provide clear reasoning explaining what you changed and why, referencing the research.

## Routine Detection

**CRITICAL:** If the user's request mentions ANY of these keywords:
- "routine", "morning routine", "evening routine", "night routine"
- "collect", "group", "organize", "combine", "bundle"
- "morning tasks", "evening tasks", "night tasks"
- "habit stack"

Then you MUST:
1. Create proper routine_events with sub_events (do NOT just rename other_events)
2. Reference supplements by supplement_index (0-indexed position in supplements array)
3. Reference meals by meal_index (0-indexed position in meals array)
4. Remove standalone other_events that are now grouped into the routine
5. Keep supplements and meals in their respective arrays (they are the single source of truth)

**Example:** User says "collect my morning tasks into a routine"
- Find morning supplements (e.g., supplements[0], supplements[1])
- Find morning activities (e.g., shower, skincare)
- Create: routine_events[0] = { name: "Morning Routine", start_time: "07:00", sub_events: [...] }
- Do NOT create: other_events named "Morning Routine" - that's wrong

## Routine Validation

When outputting routine_events, verify:
- All supplement_index values exist (< supplements.length)
- All meal_index values exist (< meals.length)
- Sub-events have sequential order values (0, 1, 2, ...)
- Activities that are part of routines are NOT duplicated in other_events

## Supplement Timing Rules

When a supplement should be taken WITH a meal:
1. Set the supplement's "time" field to EXACTLY match the meal's time
2. Use the "timing" field to document the relationship (e.g., "With breakfast")

Common meal-associated supplements (should match meal times):
- Fat-soluble vitamins (A, D, E, K), Omega-3/Fish oil, Digestive enzymes

Standalone supplements (separate times):
- Magnesium → before bed
- Melatonin → 30-60 min before sleep
- Pre/post-workout supplements → around training
- Iron on empty stomach → separate time from meals

IMPORTANT: When supplement timing matches a meal, use EXACTLY the same time. Do NOT create times that differ by only a few minutes.

## Food Preparation Events

When adding or modifying foods that require advance prep, create prep events in "other_events":

- Overnight oats → "Prep: Overnight oats" at ~21:00 the night before
- Marinating → "Prep: Marinate [food]" hours before the meal
- Slow cooker meals → "Prep: Start slow cooker" in the morning for dinner

## Schedule Architecture Rules

The schedule is EVENT-DRIVEN. Timing information lives in the relevant section:
- **Meals**: Each meal has a "time" field - keep meals in the diet.meals array
- **Supplements**: Each supplement has a "time" field - keep supplements in the supplementation.supplements array
- **Routines**: Grouped activities in schedules[].routine_events - reference meals/supplements by index
- **Other events**: Simple standalone activities in schedules[].other_events

## Routine Architecture Rules

Use ROUTINES to group related activities that naturally occur together. This creates a cleaner schedule.

**When to use routines:**
- Morning activities after waking (shower, skincare, morning supplements, breakfast)
- Evening wind-down (meditation, journaling, evening supplements, prep for sleep)
- Post-workout recovery (shower, protein shake, stretching)
- Pre-bed routine (supplements, relaxation)

**Structure:**
- Routine has "name" and "start_time"
- Sub-events have "type", "order", and "duration_min"
- For supplement sub-events: set type="supplement" and "supplement_index" matching the supplement's position in the supplements array (0-indexed)
- For meal sub-events: set type="meal" and "meal_index" matching the meal's position in the meals array (0-indexed)
- For activities: set type="activity" and provide "activity" name

**CRITICAL - When creating routines:**
1. Supplements/meals in routines MUST STILL EXIST in their respective arrays (diet.meals[], supplementation.supplements[])
2. The routine's sub_event uses "supplement_index" or "meal_index" to REFERENCE that item (0-indexed)
3. Do NOT remove supplements/meals from their arrays when adding them to routines
4. Do NOT rename other_events to include "routine" - create actual routine_events
5. Sub-event times are computed from routine start_time + cumulative duration

**Example Morning Routine:**
If supplements[0] is "Vitamin D" and supplements[1] is "Fish Oil", and meals[0] is "Breakfast":
{
  "name": "Morning Routine",
  "start_time": "06:30",
  "sub_events": [
    { "type": "activity", "order": 0, "duration_min": 10, "activity": "Shower & skincare" },
    { "type": "supplement", "order": 1, "duration_min": 2, "supplement_index": 0 },
    { "type": "supplement", "order": 2, "duration_min": 2, "supplement_index": 1 },
    { "type": "meal", "order": 3, "duration_min": 20, "meal_index": 0 }
  ]
}

Generate the modified protocol with reasoning now.`;
}

/**
 * Build prompt for Phase 2: Analyze if clarifying questions are needed.
 */
function buildQuestionsPrompt(
  protocol: DailyProtocol,
  config: UserConfig | AnonymousUserConfig,
  userMessage: string,
  researchText: string,
  userPreferences?: string[]
): string {
  const goalsText = config.goals.map(g => g.name).join(', ') || 'General health';
  const requirementsText = config.requirements.length > 0 ? config.requirements.join(', ') : 'None specified';

  const preferencesSection = userPreferences && userPreferences.length > 0
    ? `\n\n## Known User Preferences
The following preferences are already known. DO NOT ask questions about topics covered by these preferences:
${userPreferences.map((p) => `- ${p}`).join('\n')}`
    : '';

  return `You are a health protocol assistant. Analyze the user's modification request and the research findings to determine if you need any clarifying information before making changes.

## User's Request
${userMessage}

## Research Findings
${researchText}${preferencesSection}

## Current Protocol Summary
- Goals: ${goalsText}
- Requirements: ${requirementsText}
- Wake: ${protocol.schedules[0]?.wake_time || 'N/A'}, Sleep: ${protocol.schedules[0]?.sleep_time || 'N/A'}
- Training: ${protocol.training.program_name} (${protocol.training.days_per_week}x/week)

## Instructions

Analyze whether you have enough information to make the requested modification. Ask clarifying questions ONLY if:

1. **The request is ambiguous** (e.g., "add more cardio" - how much? what type? when?)
2. **There are multiple valid approaches** the research supports (e.g., supplement timing could be morning or evening with trade-offs)
3. **User preferences would significantly affect the recommendation** (e.g., equipment availability, dietary preferences)
4. **The research suggests important trade-offs** the user should choose between

DO NOT ask questions if:
1. The request is clear and specific (e.g., "change wake time to 6am")
2. There's an obvious best practice to follow from the research
3. **The question is already answered by a known user preference**
4. The questions would be pedantic or unnecessary
5. You're just being overly cautious

If you have questions, provide 1-3 focused questions maximum. For each question:
- Write a clear, concise question
- Provide context explaining why this matters (1 sentence)
- If there are common options from the research, provide them as choices (use inputType: "select")
- For open-ended questions, use inputType: "text"

Generate unique IDs for each question (use format: "q1", "q2", "q3").

Always provide a brief researchSummary (1-2 sentences) of what the research found, regardless of whether you have questions.`;
}

/**
 * Build prompt for Phase 3: Apply research with user answers to generate modified protocol.
 */
function buildApplyPromptWithAnswers(
  protocol: DailyProtocol,
  config: UserConfig | AnonymousUserConfig,
  userMessage: string,
  researchText: string,
  answers: QuestionAnswer[],
  userPreferences?: string[]
): string {
  const answersText = answers.length > 0
    ? `\n\n## User's Answers to Clarifying Questions\n${answers.map(a => `- ${a.questionId}: ${a.answer}`).join('\n')}`
    : '';

  const preferencesSection = userPreferences && userPreferences.length > 0
    ? `\n\n## User Preferences (MUST be respected)
These are established preferences from previous interactions. The modification MUST respect these:
${userPreferences.map((p) => `- ${p}`).join('\n')}`
    : '';

  return `You are an expert health protocol modifier. Apply the research findings to modify the user's protocol, incorporating their answers to clarifying questions.${preferencesSection}

## User Configuration
${JSON.stringify(config, null, 2)}

## Current Protocol
${JSON.stringify(protocol, null, 2)}

## User's Requested Changes
${userMessage}

## Research Findings (from evidence-based search)
${researchText}${answersText}

## Instructions

1. Modify the protocol incorporating the research findings and user's answers.
2. If research suggests adjustments to the user's request, implement the evidence-based version.
3. Maintain unaffected parts of the protocol exactly as they are.
4. Provide clear reasoning explaining what you changed and why, referencing the research and user preferences.

## Routine Detection

**CRITICAL:** If the user's request mentions ANY of these keywords:
- "routine", "morning routine", "evening routine", "night routine"
- "collect", "group", "organize", "combine", "bundle"
- "morning tasks", "evening tasks", "night tasks"
- "habit stack"

Then you MUST:
1. Create proper routine_events with sub_events (do NOT just rename other_events)
2. Reference supplements by supplement_index (0-indexed position in supplements array)
3. Reference meals by meal_index (0-indexed position in meals array)
4. Remove standalone other_events that are now grouped into the routine
5. Keep supplements and meals in their respective arrays (they are the single source of truth)

**Example:** User says "collect my morning tasks into a routine"
- Find morning supplements (e.g., supplements[0], supplements[1])
- Find morning activities (e.g., shower, skincare)
- Create: routine_events[0] = { name: "Morning Routine", start_time: "07:00", sub_events: [...] }
- Do NOT create: other_events named "Morning Routine" - that's wrong

## Routine Validation

When outputting routine_events, verify:
- All supplement_index values exist (< supplements.length)
- All meal_index values exist (< meals.length)
- Sub-events have sequential order values (0, 1, 2, ...)
- Activities that are part of routines are NOT duplicated in other_events

## Supplement Timing Rules

When a supplement should be taken WITH a meal:
1. Set the supplement's "time" field to EXACTLY match the meal's time
2. Use the "timing" field to document the relationship (e.g., "With breakfast")

Common meal-associated supplements (should match meal times):
- Fat-soluble vitamins (A, D, E, K), Omega-3/Fish oil, Digestive enzymes

Standalone supplements (separate times):
- Magnesium → before bed
- Melatonin → 30-60 min before sleep
- Pre/post-workout supplements → around training
- Iron on empty stomach → separate time from meals

IMPORTANT: When supplement timing matches a meal, use EXACTLY the same time. Do NOT create times that differ by only a few minutes.

## Food Preparation Events

When adding or modifying foods that require advance prep, create prep events in "other_events":

- Overnight oats → "Prep: Overnight oats" at ~21:00 the night before
- Marinating → "Prep: Marinate [food]" hours before the meal
- Slow cooker meals → "Prep: Start slow cooker" in the morning for dinner

## Schedule Architecture Rules

The schedule is EVENT-DRIVEN. Timing information lives in the relevant section:
- **Meals**: Each meal has a "time" field - keep meals in the diet.meals array
- **Supplements**: Each supplement has a "time" field - keep supplements in the supplementation.supplements array
- **Routines**: Grouped activities in schedules[].routine_events - reference meals/supplements by index
- **Other events**: Simple standalone activities in schedules[].other_events

## Routine Architecture Rules

Use ROUTINES to group related activities that naturally occur together. This creates a cleaner schedule.

**When to use routines:**
- Morning activities after waking (shower, skincare, morning supplements, breakfast)
- Evening wind-down (meditation, journaling, evening supplements, prep for sleep)
- Post-workout recovery (shower, protein shake, stretching)
- Pre-bed routine (supplements, relaxation)

**Structure:**
- Routine has "name" and "start_time"
- Sub-events have "type", "order", and "duration_min"
- For supplement sub-events: set type="supplement" and "supplement_index" matching the supplement's position in the supplements array (0-indexed)
- For meal sub-events: set type="meal" and "meal_index" matching the meal's position in the meals array (0-indexed)
- For activities: set type="activity" and provide "activity" name

**CRITICAL - When creating routines:**
1. Supplements/meals in routines MUST STILL EXIST in their respective arrays (diet.meals[], supplementation.supplements[])
2. The routine's sub_event uses "supplement_index" or "meal_index" to REFERENCE that item (0-indexed)
3. Do NOT remove supplements/meals from their arrays when adding them to routines
4. Do NOT rename other_events to include "routine" - create actual routine_events
5. Sub-event times are computed from routine start_time + cumulative duration

**Example Morning Routine:**
If supplements[0] is "Vitamin D" and supplements[1] is "Fish Oil", and meals[0] is "Breakfast":
{
  "name": "Morning Routine",
  "start_time": "06:30",
  "sub_events": [
    { "type": "activity", "order": 0, "duration_min": 10, "activity": "Shower & skincare" },
    { "type": "supplement", "order": 1, "duration_min": 2, "supplement_index": 0 },
    { "type": "supplement", "order": 2, "duration_min": 2, "supplement_index": 1 },
    { "type": "meal", "order": 3, "duration_min": 20, "meal_index": 0 }
  ]
}

Generate the modified protocol with reasoning now.`;
}

/**
 * Phase 2: Analyze research and determine if clarifying questions are needed.
 * Returns questions to ask the user, or empty array if none needed.
 */
export async function analyzeForQuestions(
  protocol: DailyProtocol,
  config: UserConfig | AnonymousUserConfig,
  userMessage: string,
  researchText: string,
  userPreferences?: string[]
): Promise<{ hasQuestions: boolean; questions: ClarifyingQuestion[]; researchSummary: string }> {
  const client = getGeminiClient();

  const prompt = buildQuestionsPrompt(protocol, config, userMessage, researchText, userPreferences);

  const response = await client.models.generateContent({
    model: MODEL_GROUNDED, // Using Flash for questions analysis
    contents: prompt,
    config: {
      thinkingConfig: { thinkingBudget: 4096 },
      responseMimeType: 'application/json',
      responseSchema: questionsAnalysisSchema as any,
      // NO grounding - uses research from Phase 1
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('No response from Gemini during questions analysis');
  }

  const parsed = JSON.parse(text);
  return {
    hasQuestions: parsed.hasQuestions || false,
    questions: (parsed.questions || []).map((q: Record<string, unknown>) => ({
      id: q.id || `q${Math.random().toString(36).slice(2, 8)}`,
      question: q.question || '',
      context: q.context || null,
      options: q.options || null,
      inputType: q.inputType || 'text',
    })),
    researchSummary: parsed.researchSummary || 'Research completed.',
  };
}

/**
 * Phase 1: Research the user's modification request using Google Search grounding.
 * Returns unstructured research text with citations.
 */
export async function researchModification(
  protocol: DailyProtocol,
  config: UserConfig | AnonymousUserConfig,
  userMessage: string,
  userPreferences?: string[]
): Promise<{ researchText: string; citations: Citation[] }> {
  const client = getGeminiClient();

  const prompt = buildResearchPrompt(protocol, config, userMessage, userPreferences);

  const response = await client.models.generateContent({
    model: MODEL_RESEARCH,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      thinkingConfig: { thinkingBudget: 8192 },
      // NO responseMimeType or responseSchema - free-form text output
    },
  });

  const researchText = response.text || '';
  if (!researchText) {
    throw new Error('No response from Gemini during research phase');
  }

  // Extract citations from grounding metadata
  const groundingMetadata = getGroundingMetadata(response);
  const citations = extractCitations(groundingMetadata, 'modify');

  return { researchText, citations };
}

/**
 * Phase 2: Apply research findings to generate structured protocol modification.
 * Uses structured output with Pro model, no grounding.
 * Exported for use in job-based async processing.
 * @param answers - Optional user answers to clarifying questions from Phase 1.5
 */
export async function applyResearchToProtocol(
  protocol: DailyProtocol,
  config: UserConfig | AnonymousUserConfig,
  userMessage: string,
  researchText: string,
  userPreferences?: string[],
  answers?: QuestionAnswer[]
): Promise<{ protocol: DailyProtocol; reasoning: string }> {
  const client = getGeminiClient();

  // Use the version with answers if provided
  const prompt = answers && answers.length > 0
    ? buildApplyPromptWithAnswers(protocol, config, userMessage, researchText, answers)
    : buildApplyPrompt(protocol, config, userMessage, researchText, userPreferences);

  const response = await client.models.generateContent({
    model: MODEL_STRUCTURED,
    contents: prompt,
    config: {
      thinkingConfig: { thinkingBudget: 8192 },
      responseMimeType: 'application/json',
      responseSchema: modifyResultSchema as any,
      // NO tools - no grounding in this phase
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('No response from Gemini when applying research to protocol');
  }

  const parsed = JSON.parse(text);
  validateExerciseData(parsed);
  const protocolData = dailyProtocolSchema.parse(parsed);

  return {
    protocol: protocolData,
    reasoning: parsed.reasoning || 'Protocol modified based on research.',
  };
}

/**
 * Modify a protocol based on user suggestions using two-phase approach:
 * Phase 1: Research with Google Search grounding (citations)
 * Phase 2: Apply research with structured output (Pro model)
 * Returns modified protocol, reasoning, and citations from grounding.
 */
export async function modifyProtocol(
  protocol: DailyProtocol,
  config: UserConfig | AnonymousUserConfig,
  userMessage: string,
  userPreferences?: string[]
): Promise<{ protocol: DailyProtocol; reasoning: string; citations: Citation[] }> {
  // Phase 1: Research with grounding
  const research = await researchModification(protocol, config, userMessage, userPreferences);

  // Phase 2: Apply research with structured output
  const result = await applyResearchToProtocol(protocol, config, userMessage, research.researchText, userPreferences);

  return {
    ...result,
    citations: research.citations,
  };
}

const chatOperationGeminiSchema = {
  type: 'object',
  properties: {
    op: {
      type: 'string',
      enum: ['modify', 'delete', 'create'],
      description: 'The type of operation: modify (change fields), delete (remove element), create (add new element)',
    },
    elementId: {
      type: 'string',
      description: 'The ID of the existing element to modify or delete (e.g., "ex_a1b2c3d4"). REQUIRED for modify and delete. Set to "" for create.',
    },
    elementType: {
      type: 'string',
      enum: ['meal', 'supplement', 'workout', 'exercise', 'other_event', 'routine_event'],
      description: 'The type of protocol element this operation targets.',
    },
    parentId: {
      type: 'string',
      description: 'For create operations on nested elements (e.g., exercise within workout), the parent element ID. Set to "" if not applicable.',
    },
    fields: {
      type: 'object',
      description: 'For modify: the fields to change (partial update, e.g. {"name": "New Name", "sets": 4}). For create: the complete element data. For delete: set to empty object {}. Use the same field names as the protocol JSON above.',
    },
    reason: {
      type: 'string',
      description: 'Brief human-readable explanation of why this change is suggested.',
    },
  },
  required: ['op', 'elementId', 'elementType', 'parentId', 'fields', 'reason'],
} as const;

const askResultSchema = {
  type: 'object',
  properties: {
    answer: { type: 'string', description: 'Direct, conversational answer to the user question about their protocol. Prefer brevity but expand when the question warrants a fuller explanation.' },
    suggestsModification: { type: 'boolean', description: 'True if the answer implies the user might want to modify their protocol' },
    operations: {
      type: 'array',
      description: 'Array of specific operations to modify the protocol. IMPORTANT: You MUST include operations whenever the user asks to change, add, remove, swap, replace, adjust, or modify anything in their protocol. Each operation targets a specific element by its ID. Return an empty array only if the user is asking a pure information question with no implied change.',
      items: chatOperationGeminiSchema,
    },
  },
  required: ['answer', 'suggestsModification', 'operations'],
} as const;

export type QAHistoryItem = { question: string; answer: string };

function buildAskPrompt(
  protocol: DailyProtocol,
  config: UserConfig | AnonymousUserConfig,
  question: string,
  history: QAHistoryItem[] = [],
  hasImage = false
): string {
  const historySection = history.length > 0
    ? `## Previous Conversation
${history.map(qa => `User: ${qa.question}\nAssistant: ${qa.answer}`).join('\n\n')}

`
    : '';

  const imageContext = hasImage
    ? `

The user has attached an image to this question. Analyze the image in the context of their health protocol and question. If the image shows food, a nutrition label, a workout, supplements, or any health-related content, provide relevant analysis. Consider how the image relates to their goals and current protocol.`
    : '';

  return `You are a knowledgeable health coach. Answer questions about the user's protocol using current research and evidence.

IMPORTANT: Use Google Search to verify any health claims, supplement recommendations, exercise science, or nutritional guidance. Ground your response in current research and cite your sources.

Be direct and conversational — no bullet points or formal structure unless specifically asked. Prefer brevity: a few sentences is often enough. But if the question asks "why" or involves trade-offs, research, or nuance, give a fuller answer. If the question suggests a protocol change, note the trade-off but focus on answering the question directly.${imageContext}

## User Configuration
${JSON.stringify(config, null, 2)}

## Current Protocol
${JSON.stringify(protocol, null, 2)}

## Inline Protocol Operations (IMPORTANT)
Every element in the protocol has an "id" field (e.g., "ml_a1b2c3d4" for a meal, "sp_x7k2p9qr" for a supplement).

**You MUST populate the "operations" array whenever the user asks to change, add, remove, swap, replace, update, or adjust anything in their protocol.** This includes requests like "change X to Y", "add Z", "remove W", "swap A for B", "increase my protein", etc. The user expects actionable changes, not just advice.

Operation types:
- **modify**: Change specific fields of an existing element. Set elementId to the element's id. Only include the fields that change in "fields".
- **delete**: Remove an element. Set elementId to the element's id.
- **create**: Add a new element. Set elementType and provide complete data in "fields" (no id — it's auto-assigned). For exercises, set parentId to the workout's id.

Examples:
- User: "Swap creatine for beta-alanine" → delete the creatine supplement by id + create a new supplement with beta-alanine data
- User: "Change my bench press to 4 sets" → modify the bench press exercise by id, fields: {"sets": 4}
- User: "Add a 10-minute morning walk" → create a new other_event with the walk data
- User: "Remove the evening stretching" → delete the stretching event by id

Return an empty operations array only for pure information questions like "why is creatine beneficial?" or "what are the benefits of my current schedule?".

${historySection}## User's Question
${question}

Answer now, using Google Search to verify your claims.`;
}

export type AskAboutProtocolResult = {
  answer: string;
  suggestsModification: boolean;
  citations: Citation[];
  operations?: Array<Record<string, unknown>>;
};

/**
 * Answer a question about a protocol, optionally using search grounding.
 * Supports multimodal input with optional image.
 * Returns answer, modification suggestion flag, citations, and optional inline operations.
 */
export async function askAboutProtocol(
  protocol: DailyProtocol,
  config: UserConfig | AnonymousUserConfig,
  question: string,
  history: QAHistoryItem[] = [],
  image?: ImageData | null
): Promise<AskAboutProtocolResult> {
  const client = getGeminiClient();

  const prompt = buildAskPrompt(protocol, config, question, history, !!image);

  // Build multimodal content with text and optional image
  const parts: Part[] = [{ text: prompt }];
  if (image) {
    parts.push(createPartFromBase64(image.base64, image.mimeType));
  }

  const response = await client.models.generateContent({
    model: MODEL_GROUNDED,
    contents: [{ role: 'user', parts }],
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

  // Extract citations from grounding metadata
  const groundingMetadata = getGroundingMetadata(response);
  const citations = extractCitations(groundingMetadata, 'ask');

  const parsed = JSON.parse(text);

  // Normalize Gemini operations to match our Zod schemas
  let operations: Array<Record<string, unknown>> | undefined;
  if (Array.isArray(parsed.operations) && parsed.operations.length > 0) {
    const normalized = parsed.operations
      .map((op: Record<string, unknown>) => {
        // Strip empty sentinel strings Gemini uses for non-applicable fields
        const clean = { ...op };
        if (clean.elementId === '') delete clean.elementId;
        if (clean.parentId === '') delete clean.parentId;

        // Map "fields" to "data" for create ops
        if (clean.op === 'create' && clean.fields && !clean.data) {
          const { fields, ...rest } = clean;
          return { ...rest, data: fields };
        }
        return clean;
      })
      // Filter out delete/modify ops that have no elementId, and modify ops with empty fields
      .filter((op: Record<string, unknown>) => {
        if (op.op === 'modify' || op.op === 'delete') {
          if (!op.elementId) return false;
        }
        if (op.op === 'modify' && op.fields && Object.keys(op.fields as object).length === 0) {
          return false;
        }
        return true;
      });

    if (normalized.length > 0) operations = normalized;
  }

  return {
    answer: parsed.answer,
    suggestsModification: parsed.suggestsModification,
    citations,
    operations,
  };
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
   - Schedule variants (wake time, sleep time, and "other_events" for activities that aren't meals/supplements/workouts)
   - Diet (calories, macros, meals - each meal has its own "time" field)
   - Supplementation (supplements with dosage, timing, purpose - each supplement has its own "time" field)
   - Training (workout program with exercises, sets, reps - each workout has "day" and "time" fields)

3. If information is missing or unclear:
   - For schedule: Use reasonable defaults (e.g., "07:00" wake, "22:00" sleep)
   - For diet: Estimate based on any mentioned foods or goals
   - For supplements: Only include what's explicitly mentioned, add a "time" field based on the timing context
   - For training: Structure any mentioned exercises appropriately, add a "time" field for when the workout starts

4. Make reasonable inferences where the text is ambiguous, but don't invent information that contradicts what's provided.
5. Ensure all required fields are filled with sensible values.
6. REMINDER: All time fields MUST be in HH:MM format (e.g., "06:00", "14:30", "22:00").
7. IMPORTANT: Meals, supplements, and workouts have their own "time" fields. DO NOT duplicate them in "other_events". Only include activities like morning routine, commute, work, wind down, etc. in "other_events".

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
    if (text && typeof text === 'string') {
      // Stop on corrupted chunks (binary metadata rendered as hex/zeros)
      // Once corruption starts, it won't recover - break immediately
      if (/^[0-9a-f]{20,}$/i.test(text) || /^[\x00-\x1f]+$/.test(text)) {
        console.warn('[generateProtocolStream] Corrupted chunk detected, stopping stream');
        break;
      }
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

// Type for questions result yielded during streaming
export type ModifyQuestionsYield = {
  questions: ClarifyingQuestion[];
  citations: Citation[];
  researchSummary: string;
  researchText: string;  // Stored for session
};

// Type for the final result of modify stream
export type ModifyStreamResult = {
  protocol: DailyProtocol;
  reasoning: string;
  citations: Citation[];
};

/**
 * Stream protocol modification with three-phase approach.
 * Yields stage indicators, text chunks, and optionally questions.
 *
 * Phase 1 (Research): Uses non-streaming to get grounding metadata/citations with thinking.
 * Phase 2 (Questions): Analyzes if clarifying questions needed with thinking.
 * Phase 3 (Apply): Uses true streaming with thinking since no grounding is needed.
 *
 * If questions are needed, yields a questions object and the generator completes.
 * The API route should save the session and wait for user answers.
 * When answers are provided, call this again with previousResearch and answers.
 */
export async function* modifyProtocolStream(
  protocol: DailyProtocol,
  config: UserConfig | AnonymousUserConfig,
  userMessage: string,
  previousResearch?: { researchText: string; citations: Citation[] },
  answers?: QuestionAnswer[],
  userPreferences?: string[]
): AsyncGenerator<
  string | { stage: string } | ModifyQuestionsYield,
  ModifyStreamResult | null,
  unknown
> {
  let research: { researchText: string; citations: Citation[] };

  if (previousResearch) {
    // === SKIP PHASE 1 - Use cached research from session ===
    research = previousResearch;
  } else {
    // === PHASE 1: Research with grounding + thinking ===
    yield { stage: 'researching' };

    // Non-streaming call to get citations (streaming API doesn't provide grounding metadata)
    research = await researchModification(protocol, config, userMessage, userPreferences);

    // Simulate streaming the research text for UX
    const researchChunkSize = 30;
    for (let i = 0; i < research.researchText.length; i += researchChunkSize) {
      yield research.researchText.slice(i, i + researchChunkSize);
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // === PHASE 2: Questions analysis (only if no answers provided) ===
    if (!answers) {
      yield { stage: 'analyzing' };

      const questionsResult = await analyzeForQuestions(protocol, config, userMessage, research.researchText, userPreferences);

      if (questionsResult.hasQuestions && questionsResult.questions.length > 0) {
        // Yield questions and exit - client will call back with answers
        yield {
          questions: questionsResult.questions,
          citations: research.citations,
          researchSummary: questionsResult.researchSummary,
          researchText: research.researchText,
        };
        return null;  // Signal that we're waiting for answers
      }
    }
  }

  // === PHASE 3: Apply research with structured output (true streaming) ===
  yield { stage: 'modifying' };

  const client = getGeminiClient();

  // Use the version with answers if provided
  const applyPrompt = answers && answers.length > 0
    ? buildApplyPromptWithAnswers(protocol, config, userMessage, research.researchText, answers, userPreferences)
    : buildApplyPrompt(protocol, config, userMessage, research.researchText, userPreferences);

  const stream = await client.models.generateContentStream({
    model: MODEL_STRUCTURED,
    contents: applyPrompt,
    config: {
      thinkingConfig: { thinkingBudget: 8192 },
      responseMimeType: 'application/json',
      responseSchema: modifyResultSchema as any,
      // NO tools - no grounding in this phase
    },
  });

  let fullText = '';
  for await (const chunk of stream) {
    const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (text && typeof text === 'string') {
      // Stop on corrupted chunks (binary metadata rendered as hex/zeros)
      // Once corruption starts, it won't recover - break immediately
      if (/^[0-9a-f]{20,}$/i.test(text) || /^[\x00-\x1f]+$/.test(text)) {
        console.warn('[modifyProtocolStream] Corrupted chunk detected, stopping stream');
        break;
      }
      fullText += text;
      yield text;
    }
  }

  // Sanitize and parse the final result
  fullText = fullText.trim();

  // Fix trailing commas before closing braces/brackets (common LLM output issue)
  fullText = fullText.replace(/,(\s*[}\]])/g, '$1');

  let parsed;
  try {
    parsed = JSON.parse(fullText);
  } catch (e) {
    const error = e as SyntaxError;
    const positionMatch = error.message.match(/position (\d+)/);
    const position = positionMatch ? parseInt(positionMatch[1]) : 0;

    // Extract context around the error for debugging
    const start = Math.max(0, position - 100);
    const end = Math.min(fullText.length, position + 100);
    const context = fullText.slice(start, end);
    const marker = ' '.repeat(Math.min(100, position - start)) + '^';

    console.error('[modifyProtocolStream] JSON parse error:', {
      message: error.message,
      position,
      fullTextLength: fullText.length,
      context: `\n${context}\n${marker}`,
    });

    throw new Error('Failed to parse modified protocol. The AI generated invalid JSON. Please try again.');
  }

  validateExerciseData(parsed);
  const protocolData = dailyProtocolSchema.parse(parsed);

  return {
    protocol: protocolData,
    reasoning: parsed.reasoning || 'Protocol modified based on research.',
    citations: research.citations,
  };
}

/**
 * Stream answer to a question about the protocol. Yields text chunks, returns answer with citations.
 * Supports multimodal input with optional image.
 *
 * Note: Gemini's streaming API (generateContentStream) does not provide grounding metadata.
 * We use non-streaming internally to get citations, then simulate streaming by yielding
 * the answer in chunks. This preserves the streaming UX while ensuring citations are available.
 * See: https://github.com/BerriAI/litellm/issues/10237
 */
export async function* askAboutProtocolStream(
  protocol: DailyProtocol,
  config: UserConfig | AnonymousUserConfig,
  question: string,
  history: QAHistoryItem[] = [],
  image?: ImageData | null
): AsyncGenerator<string, AskAboutProtocolResult, unknown> {
  // Use non-streaming call to get citations (streaming API doesn't provide grounding metadata)
  const result = await askAboutProtocol(protocol, config, question, history, image);

  // Simulate streaming by yielding the answer in chunks for better UX
  const chunkSize = 15; // Characters per chunk - balances smoothness vs overhead
  const answer = result.answer;

  for (let i = 0; i < answer.length; i += chunkSize) {
    const chunk = answer.slice(i, i + chunkSize);
    yield chunk;
    // Small delay between chunks for natural streaming appearance
    await new Promise(resolve => setTimeout(resolve, 15));
  }

  return result;
}

// ---------------------------------------------------------------------------
// Meal Slot Generation (Macro Targets + Timing)
// ---------------------------------------------------------------------------

const mealSlotsSchema = {
  type: 'object',
  properties: {
    meal_slots: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Meal name with context (e.g., "Pre-Workout Breakfast", "Post-Workout Recovery")' },
          time: { type: 'string', description: 'Optimal time in HH:MM 24-hour format' },
          timing_context: { type: 'string', description: 'Why this timing matters (e.g., "45-60 min before training for steady energy")' },
          target_calories: { type: 'integer', minimum: 1 },
          target_protein_g: { type: 'number', minimum: 0 },
          target_carbs_g: { type: 'number', minimum: 0 },
          target_fat_g: { type: 'number', minimum: 0 },
          notes: { type: 'string', description: 'Nutritional guidance for this meal slot (e.g., "Higher carbs for workout fuel, low fat for fast digestion")' },
        },
        required: ['name', 'time', 'target_calories', 'target_protein_g', 'target_carbs_g', 'target_fat_g'],
      },
    },
    reasoning: { type: 'string', description: 'Brief explanation of the overall meal timing strategy' },
    timing_strategy: { type: 'string', description: 'Summary of nutrient timing principles applied' },
  },
  required: ['meal_slots', 'reasoning', 'timing_strategy'],
} as const;

export interface MealGenerationInput {
  dailyCalories: number;
  proteinTargetG: number;
  carbsTargetG: number;
  fatTargetG: number;
  mealCount: number;
  preferences?: string;
  exclusions?: string;
  dietaryRestrictions?: string[];
  schedule: { wakeTime: string; sleepTime: string };
  workoutTimes?: string[];
  goals?: string;
}

function buildMealSlotPrompt(input: MealGenerationInput): string {
  const {
    dailyCalories,
    proteinTargetG,
    carbsTargetG,
    fatTargetG,
    mealCount,
    dietaryRestrictions,
    schedule,
    workoutTimes,
    goals,
  } = input;

  const restrictionsText = dietaryRestrictions && dietaryRestrictions.length > 0
    ? dietaryRestrictions.join(', ')
    : 'None';

  const workoutText = workoutTimes && workoutTimes.length > 0
    ? workoutTimes.join(', ')
    : 'Flexible / not specified';

  return `You are an expert sports nutritionist creating a MEAL TIMING AND MACRO FRAMEWORK.

IMPORTANT: Do NOT prescribe specific foods. The user will choose their own foods within the macro targets.

## Daily Macro Targets
- Total Calories: ${dailyCalories}
- Total Protein: ${proteinTargetG}g
- Total Carbs: ${carbsTargetG}g
- Total Fat: ${fatTargetG}g

## Schedule Context
- Wake time: ${schedule.wakeTime}
- Sleep time: ${schedule.sleepTime}
- Workout times: ${workoutText}

## User Goals
${goals || 'General health and fitness'}

## Dietary Restrictions
${restrictionsText}

## Instructions

Create exactly ${mealCount} MEAL SLOTS with macro targets distributed strategically:

1. **Optimal Timing**: Space meals between wake (${schedule.wakeTime}) and sleep (${schedule.sleepTime}) based on:
   - Circadian rhythm and digestion patterns
   - Workout schedule (if provided)
   - Protein distribution research (~${Math.round(proteinTargetG / mealCount)}g per meal for muscle protein synthesis)

2. **Macro Distribution**: Distribute daily macros across slots:
   - Protein: Even distribution for optimal MPS
   - Carbs: Higher around workouts, lower in evening
   - Fat: Moderate throughout, can be higher when carbs are lower

3. **For Each Slot, Provide**:
   - name: Descriptive name (e.g., "Pre-Workout Breakfast", "Post-Workout Recovery", "Evening Meal")
   - time: Optimal time in HH:MM format
   - timing_context: WHY this timing (e.g., "45-60 min before training for steady energy without GI distress")
   - target_calories, target_protein_g, target_carbs_g, target_fat_g: Macro targets for this slot
   - notes: Nutritional guidance (e.g., "Higher carbs, moderate protein, low fat for fast digestion")

4. **Macro Totals Must Equal**:
   - Total calories: ${dailyCalories} (within 2%)
   - Total protein: ${proteinTargetG}g (within 2%)
   - Total carbs: ${carbsTargetG}g (within 2%)
   - Total fat: ${fatTargetG}g (within 2%)

DO NOT include specific food recommendations. Only provide timing, macro targets, and nutritional guidance.

Generate the meal slot framework now.`;
}

import type { Meal } from '../schemas/protocol';

export interface MealSlotResult {
  meals: Meal[];
  reasoning: string;
  timingStrategy: string;
}

/**
 * Stream meal slot generation. Outputs macro targets + timing, NOT specific foods.
 * Yields text chunks, returns meal slots converted to Meal[] format.
 */
export async function* generateMealsStream(
  input: MealGenerationInput
): AsyncGenerator<string, MealSlotResult, unknown> {
  const client = getGeminiClient();
  const prompt = buildMealSlotPrompt(input);

  const stream = await client.models.generateContentStream({
    model: MODEL_GROUNDED,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: 'application/json',
      responseSchema: mealSlotsSchema as any,
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

  // Convert meal slots to Meal[] format with target fields populated
  const meals: Meal[] = (parsed.meal_slots || []).map((slot: Record<string, unknown>) => ({
    name: String(slot.name || 'Meal'),
    time: String(slot.time || '12:00'),
    foods: [], // Empty - user fills in their own foods
    calories: Math.max(1, Math.round(Number(slot.target_calories) || 0)),
    protein_g: Math.max(0, Number(slot.target_protein_g) || 0),
    carbs_g: Math.max(0, Number(slot.target_carbs_g) || 0),
    fat_g: Math.max(0, Number(slot.target_fat_g) || 0),
    notes: slot.notes ? String(slot.notes) : null,
    // Slot-specific fields
    timing_context: slot.timing_context ? String(slot.timing_context) : null,
    target_calories: Math.max(1, Math.round(Number(slot.target_calories) || 0)),
    target_protein_g: Math.max(0, Number(slot.target_protein_g) || 0),
    target_carbs_g: Math.max(0, Number(slot.target_carbs_g) || 0),
    target_fat_g: Math.max(0, Number(slot.target_fat_g) || 0),
  }));

  return {
    meals,
    reasoning: parsed.reasoning || 'Meal slots generated based on your macro targets and schedule.',
    timingStrategy: parsed.timing_strategy || '',
  };
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
5. When adding supplements taken with meals, set the supplement's "time" to EXACTLY match the meal's time.
6. When adding foods requiring advance prep (overnight oats, marinating), add a prep event in "other_events".

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
 * Extract ACTUAL preference notes from a user's modification request.
 * Only extracts stable preferences, NOT modification requests.
 * Returns an array of concise preference statements.
 */
export async function extractPreferenceNotes(
  userMessage: string,
  existingPreferences?: string[]
): Promise<string[]> {
  const client = getGeminiClient();

  const existingSection = existingPreferences && existingPreferences.length > 0
    ? `\n\n## Existing Preferences (avoid duplicates)
${existingPreferences.map((p) => `- ${p}`).join('\n')}`
    : '';

  const prompt = `Analyze the following user message about modifying their health protocol. Extract ONLY stable preferences - NOT modification requests.

## What IS a preference (extract these):
- Lifestyle constraints: "I prefer morning workouts", "I'm a morning person", "I work night shifts"
- Equipment/access: "I only have dumbbells at home", "I have a full gym", "No access to a pool"
- Time constraints: "I need to be done by 8pm", "I only have 30 minutes to exercise"
- Dietary restrictions: "I'm vegetarian", "I'm lactose intolerant", "I don't eat pork"
- Physical limitations: "I have a bad knee", "I can't do high impact exercises"
- General preferences: "I prefer outdoor activities", "I don't like running", "I enjoy swimming"

## What is NOT a preference (DO NOT extract):
- Modification requests: "Can we add more protein?", "Reduce the carbs", "Add creatine"
- One-time changes: "Change wake time to 6am", "Move my workout to evening today"
- Questions: "Should I take vitamin D?", "Is this enough protein?"
- Complaints: "This is too hard", "I don't have time for all this"

## Examples:
- "Can we reduce the protein?" → DO NOT EXTRACT (this is a request, not a preference)
- "I prefer lower protein because I have kidney concerns" → EXTRACT: "Has kidney concerns affecting protein intake"
- "Add more cardio" → DO NOT EXTRACT (this is a request)
- "I enjoy running and want to do more of it" → EXTRACT: "Enjoys running"
- "Change my workout to 6am" → DO NOT EXTRACT (this is a one-time change)
- "I'm a morning person and do best working out early" → EXTRACT: "Morning person, prefers early workouts"
- "Add creatine to my supplements" → DO NOT EXTRACT (this is a request)
- "I prefer taking supplements with meals rather than separately" → EXTRACT: "Prefers taking supplements with meals"
${existingSection}

## User message:
${userMessage}

Extract ONLY genuine preferences. If none exist, return an empty array. DO NOT create preferences from modification requests.`;

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
    const notes = Array.isArray(parsed.notes)
      ? parsed.notes.filter((n: unknown) => typeof n === 'string' && n.length > 0)
      : [];

    // Filter out duplicates against existing preferences
    if (existingPreferences && existingPreferences.length > 0) {
      const lowerExisting = existingPreferences.map(p => p.toLowerCase());
      return notes.filter((note: string) =>
        !lowerExisting.some(existing =>
          existing.includes(note.toLowerCase()) || note.toLowerCase().includes(existing)
        )
      );
    }

    return notes;
  } catch (error) {
    console.error('[extractPreferenceNotes] Error:', error);
    return [];
  }
}
