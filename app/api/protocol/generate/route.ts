import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateProtocol, evaluateProtocol } from '@/lib/gemini/generation';
import { userConfigSchema, anonymousUserConfigSchema, type UserConfig, type AnonymousUserConfig } from '@/lib/schemas/user-config';

// Simple placeholder evaluation for anonymous users - no AI call, instant response
function getPlaceholderEvaluation(config: UserConfig | AnonymousUserConfig) {
  return {
    requirement_scores: config.requirements.map((req) => ({
      requirement_name: req,
      target: 100,
      achieved: 85,
      adherence_percent: 85,
      suggestions: 'Sign in for detailed analysis',
    })),
    goal_scores: config.goals.map((goal) => ({
      goal_name: goal.name,
      score: 80 + Math.floor(Math.random() * 15), // 80-94
      reasoning: 'Protocol aligned with this goal',
      suggestions: 'Sign in for personalized recommendations',
    })),
    critiques: [],
    requirements_met: true,
    weighted_goal_score: 85,
    viability_score: 82,
  };
}

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

    // Evaluate the protocol - skip AI evaluation for anonymous users (instant)
    const evaluation = isAuthenticated
      ? await evaluateProtocol(protocol, config)
      : getPlaceholderEvaluation(config);

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
