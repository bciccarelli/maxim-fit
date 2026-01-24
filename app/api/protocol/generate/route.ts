import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateProtocol, evaluateProtocol } from '@/lib/gemini/generation';
import { userConfigSchema, anonymousUserConfigSchema } from '@/lib/schemas/user-config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = await createClient();

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    const isAuthenticated = !!user;

    // Validate config based on auth status
    const configSchema = isAuthenticated ? userConfigSchema : anonymousUserConfigSchema;
    const parseResult = configSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid configuration', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const config = parseResult.data;

    // Generate protocol using Gemini
    const protocol = await generateProtocol(config);

    // Evaluate the protocol
    const evaluation = await evaluateProtocol(protocol, config);

    // Save to database
    const protocolData = {
      user_id: user?.id ?? null,
      protocol_data: protocol,
      weighted_goal_score: evaluation.weighted_goal_score,
      viability_score: evaluation.viability_score,
      requirements_met: evaluation.requirements_met,
      iteration: 0,
      requirement_scores: evaluation.requirement_scores,
      goal_scores: evaluation.goal_scores,
      critiques: evaluation.critiques,
      is_anonymous: !isAuthenticated,
      expires_at: !isAuthenticated
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        : null,
    };

    const { data: savedProtocol, error: saveError } = await supabase
      .from('protocols')
      .insert(protocolData)
      .select()
      .single();

    if (saveError) {
      console.error('Error saving protocol:', saveError);
      // Still return the protocol even if save fails
    }

    return NextResponse.json({
      id: savedProtocol?.id,
      protocol,
      evaluation: {
        requirement_scores: evaluation.requirement_scores,
        goal_scores: evaluation.goal_scores,
        critiques: evaluation.critiques,
        requirements_met: evaluation.requirements_met,
        weighted_goal_score: evaluation.weighted_goal_score,
        viability_score: evaluation.viability_score,
      },
    });
  } catch (error) {
    console.error('Protocol generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate protocol', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
