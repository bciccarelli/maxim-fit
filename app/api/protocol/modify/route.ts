import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { modifyProtocol, modifyProtocolStream, verifyProtocol } from '@/lib/gemini/generation';
import { dailyProtocolSchema, type DailyProtocol } from '@/lib/schemas/protocol';
import { userConfigSchema } from '@/lib/schemas/user-config';
import { SSE_HEADERS } from '@/lib/streaming';
import { getUserTier, isPro } from '@/lib/stripe/subscription';

function buildConfig(configData: Record<string, unknown> | null) {
  if (!configData) return null;
  return userConfigSchema.safeParse({
    personal_info: configData.personal_info,
    goals: configData.goals,
    requirements: configData.requirements,
    iterations: 1,
  });
}

const fallbackConfig = {
  personal_info: {
    age: 30, weight_lbs: 170, height_in: 70, sex: 'other' as const,
    lifestyle_considerations: [], fitness_level: 'intermediate' as const,
    dietary_restrictions: [],
  },
  goals: [{ name: 'General Health', weight: 1.0, description: 'Improve overall health' }],
  requirements: [],
  iterations: 1,
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const useStreaming = request.nextUrl.searchParams.get('stream') === 'true';

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check Pro subscription
    const tier = await getUserTier(user.id);
    if (!isPro(tier)) {
      return NextResponse.json({
        error: 'AI Modification requires a Pro subscription',
        code: 'UPGRADE_REQUIRED',
        currentTier: tier,
      }, { status: 402 });
    }

    const { protocolId, userMessage } = await request.json();

    if (!protocolId || typeof protocolId !== 'string') {
      return NextResponse.json({ error: 'Protocol ID is required' }, { status: 400 });
    }
    if (!userMessage || typeof userMessage !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Fetch the protocol with config
    const { data: protocol, error: fetchError } = await supabase
      .from('protocols')
      .select('*, user_configs(*)')
      .eq('id', protocolId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !protocol) {
      return NextResponse.json({ error: 'Protocol not found' }, { status: 404 });
    }

    const protocolData = dailyProtocolSchema.parse(protocol.protocol_data);
    const config = buildConfig(protocol.user_configs);
    const modifyConfig = config?.success ? config.data : fallbackConfig;

    const currentScores = {
      weighted_goal_score: protocol.weighted_goal_score,
      viability_score: protocol.viability_score,
      requirements_met: protocol.requirements_met,
    };

    if (useStreaming) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Stream modification generation
            const generator = modifyProtocolStream(protocolData, modifyConfig, userMessage);
            let genResult: IteratorResult<string, { protocol: DailyProtocol; reasoning: string }>;
            do {
              genResult = await generator.next();
              if (!genResult.done && genResult.value) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ chunk: genResult.value })}\n\n`)
                );
              }
            } while (!genResult.done);

            const { protocol: modifiedProtocol, reasoning } = genResult.value;

            // Verify the modified protocol
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ stage: 'verifying' })}\n\n`)
            );
            const verification = await verifyProtocol(modifiedProtocol, modifyConfig);

            // Save proposal
            const { data: modification } = await supabase
              .from('protocol_modifications')
              .insert({
                protocol_id: protocolId,
                user_id: user.id,
                user_message: userMessage,
                proposed_protocol_data: modifiedProtocol,
                proposed_scores: verification,
                current_scores: currentScores,
                reasoning,
                status: 'pending',
              })
              .select()
              .single();

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                done: true,
                result: {
                  modificationId: modification?.id,
                  proposal: { protocol: modifiedProtocol, reasoning, verification },
                  currentScores,
                },
              })}\n\n`)
            );
          } catch (error) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                error: error instanceof Error ? error.message : 'Modification failed',
              })}\n\n`)
            );
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, { headers: SSE_HEADERS });
    }

    // Non-streaming path
    const { protocol: modifiedProtocol, reasoning } = await modifyProtocol(
      protocolData,
      modifyConfig,
      userMessage
    );

    const verification = await verifyProtocol(modifiedProtocol, modifyConfig);

    const { data: modification, error: saveError } = await supabase
      .from('protocol_modifications')
      .insert({
        protocol_id: protocolId,
        user_id: user.id,
        user_message: userMessage,
        proposed_protocol_data: modifiedProtocol,
        proposed_scores: verification,
        current_scores: currentScores,
        reasoning,
        status: 'pending',
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving modification:', saveError);
    }

    return NextResponse.json({
      modificationId: modification?.id,
      proposal: {
        protocol: modifiedProtocol,
        reasoning,
        verification,
      },
      currentScores,
    });
  } catch (error) {
    console.error('Protocol modify error:', error);
    return NextResponse.json(
      { error: 'Failed to modify protocol', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
