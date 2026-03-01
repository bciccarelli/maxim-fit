import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { modifyProtocol, modifyProtocolStream, verifyProtocol, extractPreferenceNotes, type ModifyQuestionsYield, type ModifyStreamResult } from '@/lib/gemini/generation';
import { normalizeProtocol, type DailyProtocol, type Citation, type QuestionAnswer } from '@/lib/schemas/protocol';
import { userConfigSchema } from '@/lib/schemas/user-config';
import { SSE_HEADERS } from '@/lib/streaming';
import { getUserTier, isPro } from '@/lib/stripe/subscription';
import { mergeCitations } from '@/lib/gemini/citations';

/**
 * Extract and save preference notes from a user's modification message.
 * Passes existing preferences to avoid extracting duplicates.
 */
async function saveExtractedNotes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  protocolId: string,
  userMessage: string,
  existingPreferences: string[]
) {
  try {
    const notes = await extractPreferenceNotes(userMessage, existingPreferences);
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

    // Fetch user preferences from user_notes table
    let userPreferences: string[] = [];
    const { data: notes } = await supabase
      .from('user_notes')
      .select('note')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    userPreferences = notes?.map((n) => n.note) ?? [];
    console.log(`[modify] Fetched ${userPreferences.length} user preferences`);

    const { protocolId, userMessage, sessionId, answers } = await request.json() as {
      protocolId?: string;
      userMessage?: string;
      sessionId?: string;
      answers?: QuestionAnswer[];
    };

    // If sessionId is provided, we're continuing from questions
    // Otherwise, we need protocolId and userMessage
    if (sessionId) {
      // Continuing from questions - sessionId is required
      if (typeof sessionId !== 'string') {
        return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
      }
    } else {
      if (!protocolId || typeof protocolId !== 'string') {
        return NextResponse.json({ error: 'Protocol ID is required' }, { status: 400 });
      }
      if (!userMessage || typeof userMessage !== 'string') {
        return NextResponse.json({ error: 'Message is required' }, { status: 400 });
      }
    }

    // If continuing from session, fetch session data
    let session: {
      id: string;
      protocol_id: string;
      user_message: string;
      research_text: string;
      research_citations: Citation[];
    } | null = null;

    let effectiveProtocolId = protocolId;
    let effectiveUserMessage = userMessage;

    if (sessionId) {
      const { data: sessionData, error: sessionError } = await supabase
        .from('modify_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single();

      if (sessionError || !sessionData) {
        return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 });
      }

      // Check if session is expired
      if (new Date(sessionData.expires_at) < new Date()) {
        await supabase.from('modify_sessions').delete().eq('id', sessionId);
        return NextResponse.json({ error: 'Session expired' }, { status: 410 });
      }

      session = {
        id: sessionData.id,
        protocol_id: sessionData.protocol_id,
        user_message: sessionData.user_message,
        research_text: sessionData.research_text,
        research_citations: sessionData.research_citations as Citation[],
      };

      effectiveProtocolId = session.protocol_id;
      effectiveUserMessage = session.user_message;
    }

    // Fetch the protocol with config
    const { data: protocol, error: fetchError } = await supabase
      .from('protocols')
      .select('*, user_configs(*)')
      .eq('id', effectiveProtocolId)
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
      requirements_met: protocol.requirements_met as boolean | null,
    };

    if (currentScores.weighted_goal_score == null && protocol.version_chain_id) {
      const { data: lastVerified } = await supabase
        .from('protocols')
        .select('weighted_goal_score, requirements_met')
        .eq('version_chain_id', protocol.version_chain_id)
        .eq('verified', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (lastVerified) {
        currentScores = {
          weighted_goal_score: lastVerified.weighted_goal_score,
          requirements_met: lastVerified.requirements_met,
        };
      }
    }

    if (useStreaming) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Prepare previous research if continuing from session
            const previousResearch = session ? {
              researchText: session.research_text,
              citations: session.research_citations,
            } : undefined;

            // Stream modification generation with three-phase approach
            // Generator yields: { stage: string } | string (text chunks) | ModifyQuestionsYield
            const generator = modifyProtocolStream(
              protocolData,
              modifyConfig,
              effectiveUserMessage!,
              previousResearch,
              answers,
              userPreferences
            );

            let genResult: IteratorResult<
              string | { stage: string } | ModifyQuestionsYield,
              ModifyStreamResult | null
            >;

            do {
              genResult = await generator.next();
              if (!genResult.done && genResult.value) {
                const value = genResult.value;

                // Check if it's a questions yield (has questions array)
                if (typeof value === 'object' && 'questions' in value) {
                  const questionsYield = value as ModifyQuestionsYield;

                  // Save session for later continuation
                  const { data: newSession } = await supabase
                    .from('modify_sessions')
                    .insert({
                      protocol_id: effectiveProtocolId,
                      user_id: user.id,
                      user_message: effectiveUserMessage,
                      research_text: questionsYield.researchText,
                      research_citations: questionsYield.citations,
                      questions: questionsYield.questions,
                      research_summary: questionsYield.researchSummary,
                      status: 'pending_questions',
                    })
                    .select('id')
                    .single();

                  // Return questions to client
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({
                      questions: questionsYield.questions,
                      citations: questionsYield.citations,
                      researchSummary: questionsYield.researchSummary,
                      sessionId: newSession?.id,
                    })}\n\n`)
                  );

                  controller.close();
                  return;
                }

                // Check if it's a stage indicator
                if (typeof value === 'object' && 'stage' in value) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ stage: value.stage })}\n\n`)
                  );
                } else if (typeof value === 'string') {
                  // Text chunk
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ chunk: value })}\n\n`)
                  );
                }
              }
            } while (!genResult.done);

            // If generator returned null, it means questions were asked (already handled above)
            if (genResult.value === null) {
              controller.close();
              return;
            }

            const { protocol: modifiedProtocol, reasoning, citations: modifyCitations } = genResult.value;

            // Clean up session if we used one
            if (session) {
              await supabase.from('modify_sessions').delete().eq('id', session.id);
            }

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
                protocol_id: effectiveProtocolId,
                user_id: user.id,
                user_message: effectiveUserMessage,
                proposed_protocol_data: modifiedProtocol,
                proposed_scores: proposedScoresWithCitations,
                current_scores: currentScores,
                reasoning,
                status: 'pending',
              })
              .select()
              .single();

            // Extract and save preference notes (non-blocking)
            saveExtractedNotes(supabase, user.id, effectiveProtocolId!, effectiveUserMessage!, userPreferences);

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
    // Note: Non-streaming path doesn't support session continuation (questions flow)
    // If sessionId is provided, the streaming path should be used
    if (!effectiveUserMessage) {
      return NextResponse.json({ error: 'Message is required for non-streaming modify' }, { status: 400 });
    }

    const { protocol: modifiedProtocol, reasoning, citations: modifyCitations } = await modifyProtocol(
      protocolData,
      modifyConfig,
      effectiveUserMessage,
      userPreferences
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
        protocol_id: effectiveProtocolId,
        user_id: user.id,
        user_message: effectiveUserMessage,
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
    saveExtractedNotes(supabase, user.id, effectiveProtocolId!, effectiveUserMessage, userPreferences);

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
