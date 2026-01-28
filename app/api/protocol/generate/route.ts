import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateProtocol, generateProtocolStream, verifyProtocol } from '@/lib/gemini/generation';
import { userConfigSchema, anonymousUserConfigSchema, type UserConfig, type AnonymousUserConfig } from '@/lib/schemas/user-config';
import { SSE_HEADERS } from '@/lib/streaming';
import type { DailyProtocol } from '@/lib/schemas/protocol';

function generateProtocolName(goals: { name: string; weight: number }[]): string {
  const topGoals = [...goals].sort((a, b) => b.weight - a.weight).slice(0, 2).map(g => g.name);
  return topGoals.join(' + ') + ' Protocol';
}

// Simple placeholder verification for anonymous users - no AI call, instant response
function getPlaceholderVerification(config: UserConfig | AnonymousUserConfig) {
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

async function saveProtocol(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string | null | undefined,
  isAuthenticated: boolean,
  protocol: DailyProtocol,
  verification: ReturnType<typeof getPlaceholderVerification> | Awaited<ReturnType<typeof verifyProtocol>>,
  name: string | null,
) {
  const startTime = Date.now();
  const log = (step: string) => console.log(`[saveProtocol] ${step} @ ${Date.now() - startTime}ms`);

  log('start');
  const protocolData = {
    user_id: userId ?? null,
    protocol_data: protocol,
    name,
    weighted_goal_score: verification.weighted_goal_score,
    viability_score: verification.viability_score,
    requirements_met: verification.requirements_met,
    iteration: 0,
    requirement_scores: verification.requirement_scores,
    goal_scores: verification.goal_scores,
    critiques: verification.critiques,
    is_anonymous: !isAuthenticated,
    expires_at: !isAuthenticated
      ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      : null,
    version: 1,
    is_current: true,
    change_source: 'generated',
    verified: isAuthenticated,
    verified_at: isAuthenticated ? new Date().toISOString() : null,
  };

  log('inserting protocol');
  const { data: savedProtocol, error: saveError } = await supabase
    .from('protocols')
    .insert(protocolData)
    .select()
    .single();
  log('insert complete');

  if (saveError) {
    console.error('Error saving protocol:', saveError);
  }

  if (savedProtocol) {
    log('updating version_chain_id');
    await supabase
      .from('protocols')
      .update({ version_chain_id: savedProtocol.id })
      .eq('id', savedProtocol.id);
    log('update complete');
  }

  log('done');
  return savedProtocol;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const log = (step: string) => console.log(`[generate] ${step} @ ${Date.now() - startTime}ms`);

  try {
    log('start');
    const body = await request.json();
    log('parsed body');

    const supabase = await createClient();
    log('created supabase client');

    const useStreaming = request.nextUrl.searchParams.get('stream') === 'true';

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    log(`auth check complete (authenticated: ${!!user})`);
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

    if (useStreaming) {
      log('using streaming path');
      const encoder = new TextEncoder();
      const streamStartTime = startTime;
      const streamLog = (step: string) => console.log(`[generate:stream] ${step} @ ${Date.now() - streamStartTime}ms`);

      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Stage 1: Stream generation
            streamLog('starting generation');
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ stage: 'generating' })}\n\n`)
            );

            const generator = generateProtocolStream(config);
            let genResult: IteratorResult<string, DailyProtocol>;
            let chunkCount = 0;
            do {
              genResult = await generator.next();
              if (!genResult.done && genResult.value) {
                chunkCount++;
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ chunk: genResult.value })}\n\n`)
                );
              }
            } while (!genResult.done);

            streamLog(`generation complete (${chunkCount} chunks)`);
            const protocol = genResult.value;

            // Stage 2: Verification
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ stage: 'evaluating' })}\n\n`)
            );

            streamLog('starting verification');
            const verification = isAuthenticated
              ? await verifyProtocol(protocol, config)
              : getPlaceholderVerification(config);
            streamLog('verification complete');

            // Stage 3: Save
            streamLog('starting save');
            const protocolName = generateProtocolName(config.goals);
            const savedProtocol = await saveProtocol(supabase, user?.id, isAuthenticated, protocol, verification, protocolName);
            streamLog('save complete');

            // Stage 4: Complete
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                done: true,
                result: {
                  id: savedProtocol?.id,
                  protocol,
                  evaluation: {
                    requirement_scores: verification.requirement_scores,
                    goal_scores: verification.goal_scores,
                    critiques: verification.critiques,
                    requirements_met: verification.requirements_met,
                    weighted_goal_score: verification.weighted_goal_score,
                    viability_score: verification.viability_score,
                  },
                },
              })}\n\n`)
            );
            streamLog('response sent');
          } catch (error) {
            streamLog(`error: ${error instanceof Error ? error.message : 'unknown'}`);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                error: error instanceof Error ? error.message : 'Generation failed',
              })}\n\n`)
            );
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, { headers: SSE_HEADERS });
    }

    // Non-streaming path (existing behavior)
    log('using non-streaming path');
    log('starting generation');
    const protocol = await generateProtocol(config);
    log('generation complete');

    log('starting verification');
    const verification = isAuthenticated
      ? await verifyProtocol(protocol, config)
      : getPlaceholderVerification(config);
    log('verification complete');

    log('starting save');
    const protocolName = generateProtocolName(config.goals);
    const savedProtocol = await saveProtocol(supabase, user?.id, isAuthenticated, protocol, verification, protocolName);
    log('save complete');

    log('sending response');
    return NextResponse.json({
      id: savedProtocol?.id,
      protocol,
      evaluation: {
        requirement_scores: verification.requirement_scores,
        goal_scores: verification.goal_scores,
        critiques: verification.critiques,
        requirements_met: verification.requirements_met,
        weighted_goal_score: verification.weighted_goal_score,
        viability_score: verification.viability_score,
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
