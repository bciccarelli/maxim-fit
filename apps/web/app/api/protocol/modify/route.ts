import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { modifyProtocol, modifyProtocolStream, verifyProtocol, extractPreferenceNotes } from '@/lib/gemini/generation';
import { normalizeProtocol, type DailyProtocol, type Citation } from '@/lib/schemas/protocol';
import { userConfigSchema } from '@/lib/schemas/user-config';
import { SSE_HEADERS } from '@/lib/streaming';
import { getUserTier, isPro } from '@/lib/stripe/subscription';
import { mergeCitations } from '@/lib/gemini/citations';

/**
 * Extract and save preference notes from a user's modification message.
 */
async function saveExtractedNotes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  protocolId: string,
  userMessage: string
) {
  try {
    const notes = await extractPreferenceNotes(userMessage);
    if (notes.length === 0) return;

    const notesToInsert = notes.map((note) => ({
      user_id: userId,
      note,
      source: 'modify',
      protocol_id: protocolId,
    }));

    await supabase.from('user_notes').insert(notesToInsert);
    console.log(`[modify] Extracted ${notes.length} preference notes from user message`);
  } catch (error) {
    // Don't fail the request if note extraction fails
    console.error('[modify] Error extracting preference notes:', error);
  }
}

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

    const protocolData = normalizeProtocol(protocol.protocol_data);
    const config = buildConfig(protocol.user_configs);
    const modifyConfig = config?.success ? config.data : fallbackConfig;

    // Build current scores, falling back to the last verified version if current has no scores
    let currentScores = {
      weighted_goal_score: protocol.weighted_goal_score as number | null,
      viability_score: protocol.viability_score as number | null,
      requirements_met: protocol.requirements_met as boolean | null,
    };

    if (currentScores.weighted_goal_score == null && protocol.version_chain_id) {
      const { data: lastVerified } = await supabase
        .from('protocols')
        .select('weighted_goal_score, viability_score, requirements_met')
        .eq('version_chain_id', protocol.version_chain_id)
        .eq('verified', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (lastVerified) {
        currentScores = {
          weighted_goal_score: lastVerified.weighted_goal_score,
          viability_score: lastVerified.viability_score,
          requirements_met: lastVerified.requirements_met,
        };
      }
    }

    if (useStreaming) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Stream modification generation with two-phase approach
            // Generator yields: { stage: string } | string (text chunks)
            const generator = modifyProtocolStream(protocolData, modifyConfig, userMessage);
            let genResult: IteratorResult<string | { stage: string }, { protocol: DailyProtocol; reasoning: string; citations: Citation[] }>;
            do {
              genResult = await generator.next();
              if (!genResult.done && genResult.value) {
                // Check if it's a stage indicator or a text chunk
                if (typeof genResult.value === 'object' && 'stage' in genResult.value) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ stage: genResult.value.stage })}\n\n`)
                  );
                } else {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ chunk: genResult.value })}\n\n`)
                  );
                }
              }
            } while (!genResult.done);

            const { protocol: modifiedProtocol, reasoning, citations: modifyCitations } = genResult.value;

            // Verify the modified protocol (returns verification citations)
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ stage: 'verifying' })}\n\n`)
            );
            const { verification, citations: verifyCitations } = await verifyProtocol(modifiedProtocol, modifyConfig);

            // Merge citations from modify research and verify operations
            const allCitations = mergeCitations(modifyCitations, verifyCitations);

            // Save proposal with merged citations
            const proposedScoresWithCitations = {
              ...verification,
              citations: allCitations,
            };

            const { data: modification } = await supabase
              .from('protocol_modifications')
              .insert({
                protocol_id: protocolId,
                user_id: user.id,
                user_message: userMessage,
                proposed_protocol_data: modifiedProtocol,
                proposed_scores: proposedScoresWithCitations,
                current_scores: currentScores,
                reasoning,
                status: 'pending',
              })
              .select()
              .single();

            // Extract and save preference notes (non-blocking)
            saveExtractedNotes(supabase, user.id, protocolId, userMessage);

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                done: true,
                result: {
                  modificationId: modification?.id,
                  proposal: { protocol: modifiedProtocol, reasoning, verification, citations: allCitations },
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

    // Non-streaming path - now captures citations
    const { protocol: modifiedProtocol, reasoning, citations: modifyCitations } = await modifyProtocol(
      protocolData,
      modifyConfig,
      userMessage
    );

    const { verification, citations: verifyCitations } = await verifyProtocol(modifiedProtocol, modifyConfig);

    // Merge citations from modify and verify operations
    const allCitations = mergeCitations(modifyCitations, verifyCitations);

    // Save proposal with citations included in proposed_scores
    const proposedScoresWithCitations = {
      ...verification,
      citations: allCitations,
    };

    const { data: modification, error: saveError } = await supabase
      .from('protocol_modifications')
      .insert({
        protocol_id: protocolId,
        user_id: user.id,
        user_message: userMessage,
        proposed_protocol_data: modifiedProtocol,
        proposed_scores: proposedScoresWithCitations,
        current_scores: currentScores,
        reasoning,
        status: 'pending',
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving modification:', saveError);
    }

    // Extract and save preference notes (non-blocking)
    saveExtractedNotes(supabase, user.id, protocolId, userMessage);

    return NextResponse.json({
      modificationId: modification?.id,
      proposal: {
        protocol: modifiedProtocol,
        reasoning,
        verification,
        citations: allCitations,
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
