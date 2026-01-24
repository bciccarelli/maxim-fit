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
    const { config, currentProtocol, critiques, iteration } = body;

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
      critiques as Critique[],
      iteration
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

async function generateOptimizedProtocol(
  config: ReturnType<typeof userConfigSchema.parse>,
  currentProtocol: ReturnType<typeof dailyProtocolSchema.parse>,
  critiques: Critique[],
  iteration: number
) {
  const { GoogleGenAI } = await import('@google/genai');
  const { zodToJsonSchema } = await import('zod-to-json-schema');

  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const jsonSchema = zodToJsonSchema(dailyProtocolSchema);

  const critiquesText = critiques
    .map((c) => `- [${c.severity.toUpperCase()}] ${c.category}: ${c.criticism}\n  Suggestion: ${c.suggestion}`)
    .join('\n');

  const prompt = `You are an expert health protocol optimizer. This is iteration ${iteration + 1} of the optimization process.

## User Configuration
${JSON.stringify(config, null, 2)}

## Current Protocol
${JSON.stringify(currentProtocol, null, 2)}

## Critiques to Address
${critiquesText}

## Instructions

1. Carefully analyze each critique and its severity level.
2. Use Google Search to find evidence-based solutions for the identified issues.
3. Generate an improved protocol that addresses the critiques while maintaining what works well.
4. Prioritize addressing major critiques first, then moderate, then minor.
5. Ensure the protocol remains realistic and sustainable.
6. Do not sacrifice viability for perfectionism.

Generate the optimized protocol now.`;

  const response = await client.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: 'application/json',
      responseJsonSchema: jsonSchema,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('No response from Gemini');
  }

  return dailyProtocolSchema.parse(JSON.parse(text));
}
