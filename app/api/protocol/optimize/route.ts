import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateProtocol, evaluateProtocol } from '@/lib/gemini/generation';
import { userConfigSchema } from '@/lib/schemas/user-config';
import { dailyProtocolSchema, type Critique } from '@/lib/schemas/protocol';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication - optimization is only for authenticated users
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required for optimization' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { config, currentProtocol, critiques = [], iteration, isPureIteration = false } = body;

    // Validate config
    const parseResult = userConfigSchema.safeParse(config);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid configuration', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const validConfig = parseResult.data;

    // Validate current protocol
    const protocolResult = dailyProtocolSchema.safeParse(currentProtocol);
    if (!protocolResult.success) {
      return NextResponse.json(
        { error: 'Invalid protocol', details: protocolResult.error.flatten() },
        { status: 400 }
      );
    }

    // Generate optimized protocol with critique context
    const optimizedProtocol = await generateOptimizedProtocol(
      validConfig,
      protocolResult.data,
      (critiques ?? []) as Critique[],
      iteration,
      isPureIteration
    );

    // Evaluate the optimized protocol
    const evaluation = await evaluateProtocol(optimizedProtocol, validConfig);

    // Save optimized protocol
    const { data: savedProtocol, error: saveError } = await supabase
      .from('protocols')
      .insert({
        user_id: user.id,
        protocol_data: optimizedProtocol,
        weighted_goal_score: evaluation.weighted_goal_score,
        viability_score: evaluation.viability_score,
        requirements_met: evaluation.requirements_met,
        iteration: iteration + 1,
        requirement_scores: evaluation.requirement_scores,
        goal_scores: evaluation.goal_scores,
        critiques: evaluation.critiques,
        is_anonymous: false,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving optimized protocol:', saveError);
    }

    // Save criticisms for tracking
    if (evaluation.critiques.length > 0) {
      const criticismRecords = evaluation.critiques.map((critique) => ({
        protocol_id: savedProtocol?.id,
        user_id: user.id,
        category: critique.category,
        criticism: critique.criticism,
        severity: critique.severity,
        suggestion: critique.suggestion,
        iteration_added: iteration + 1,
      }));

      await supabase.from('criticisms').insert(criticismRecords);
    }

    return NextResponse.json({
      id: savedProtocol?.id,
      protocol: optimizedProtocol,
      evaluation: {
        requirement_scores: evaluation.requirement_scores,
        goal_scores: evaluation.goal_scores,
        critiques: evaluation.critiques,
        requirements_met: evaluation.requirements_met,
        weighted_goal_score: evaluation.weighted_goal_score,
        viability_score: evaluation.viability_score,
      },
      iteration: iteration + 1,
    });
  } catch (error) {
    console.error('Protocol optimization error:', error);
    return NextResponse.json(
      { error: 'Failed to optimize protocol', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Gemini-compatible schema (flat, no $ref or definitions)
const dailyProtocolGeminiSchema = {
  type: 'object',
  properties: {
    schedule: {
      type: 'object',
      properties: {
        wake_time: { type: 'string' },
        sleep_time: { type: 'string' },
        schedule: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              start_time: { type: 'string' },
              end_time: { type: 'string' },
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
              time: { type: 'string' },
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

async function generateOptimizedProtocol(
  config: ReturnType<typeof userConfigSchema.parse>,
  currentProtocol: ReturnType<typeof dailyProtocolSchema.parse>,
  critiques: Critique[],
  iteration: number,
  isPureIteration: boolean
) {
  const { GoogleGenAI } = await import('@google/genai');

  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  let prompt: string;

  if (isPureIteration) {
    prompt = `You are an expert health protocol optimizer. This is iteration ${iteration + 1} of the optimization process.

## User Configuration
${JSON.stringify(config, null, 2)}

## Current Protocol
${JSON.stringify(currentProtocol, null, 2)}

## Instructions

You are performing a pure re-evaluation of this protocol. No specific user feedback has been provided — your job is to find improvements independently.

1. Re-evaluate the entire protocol holistically against the user's goals and requirements.
2. Use Google Search to find the latest evidence-based health, nutrition, training, and supplementation recommendations.
3. Identify areas where the protocol can be improved — look for suboptimal timing, missing synergies, outdated practices, or better alternatives.
4. Improve the protocol while maintaining what already works well.
5. Ensure the protocol remains realistic and sustainable.
6. Do not sacrifice viability for perfectionism.

Generate the optimized protocol now.`;
  } else {
    const critiquesText = critiques
      .map((c) => `- [${c.severity.toUpperCase()}] ${c.category}: ${c.criticism}\n  Suggestion: ${c.suggestion}`)
      .join('\n');

    prompt = `You are an expert health protocol optimizer. This is iteration ${iteration + 1} of the optimization process.

## User Configuration
${JSON.stringify(config, null, 2)}

## Current Protocol
${JSON.stringify(currentProtocol, null, 2)}

## Critiques to Address
${critiquesText}

## Instructions

1. Carefully analyze each critique and its severity level. Pay special attention to critiques marked with [USER FEEDBACK] — these come directly from the user and should be prioritized.
2. Use Google Search to find evidence-based solutions for the identified issues.
3. Generate an improved protocol that addresses the critiques while maintaining what works well.
4. Prioritize addressing major critiques first, then moderate, then minor.
5. Ensure the protocol remains realistic and sustainable.
6. Do not sacrifice viability for perfectionism.

Generate the optimized protocol now.`;
  }

  const response = await client.models.generateContent({
    model: 'gemini-3-flash-preview',
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

  return dailyProtocolSchema.parse(JSON.parse(text));
}
