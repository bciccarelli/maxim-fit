import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import {
  researchModification,
  analyzeForQuestions,
  applyResearchToProtocol,
  verifyProtocol,
  extractPreferenceNotes,
} from '@/lib/gemini/generation';
import { normalizeProtocol, type DailyProtocol, type Citation, type QuestionAnswer } from '@/lib/schemas/protocol';
import { userConfigSchema } from '@/lib/schemas/user-config';
import { getUserTier, isPro } from '@/lib/stripe/subscription';
import { mergeCitations } from '@/lib/gemini/citations';

// Service role client for internal server-to-server calls (bypasses RLS)
function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type JobStatus = 'pending' | 'researching' | 'research_complete' | 'awaiting_answers' | 'applying' | 'completed' | 'failed';

interface ModifyJob {
  id: string;
  user_id: string;
  protocol_id: string;
  user_message: string;
  status: JobStatus;
  research_text: string | null;
  research_citations: Citation[];
  research_summary: string | null;
  questions: unknown | null;
  user_answers: QuestionAnswer[] | null;
  modification_id: string | null;
  error_message: string | null;
  current_stage: string | null;
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

/**
 * Trigger the next phase of processing.
 * This creates a new request to continue processing without blocking the current one.
 */
async function triggerNextPhase(jobId: string, baseUrl: string) {
  try {
    // Fire and forget - don't await
    fetch(`${baseUrl}/api/protocol/modify/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, internal: true }),
    }).catch(err => console.error('[process] Error triggering next phase:', err));
  } catch (error) {
    console.error('[process] Error triggering next phase:', error);
  }
}

/**
 * POST /api/protocol/modify/process
 *
 * Processes a single phase of the modify job.
 * Self-invokes for the next phase to stay within Vercel timeout limits.
 *
 * Phase transitions:
 * - pending → researching → research_complete
 * - research_complete → awaiting_answers (if questions) or applying
 * - awaiting_answers → applying (after user answers)
 * - applying → completed
 */
export async function POST(request: NextRequest) {
  const baseUrl = request.nextUrl.origin;

  try {
    let supabase = await createClient();
    const body = await request.json() as { jobId?: string; internal?: boolean };
    const { jobId, internal } = body;

    if (!jobId || typeof jobId !== 'string') {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    // For internal calls, use service role client to bypass RLS
    // For external calls, use user-scoped client and verify ownership
    let userId: string;

    if (internal) {
      // Internal call - use service role client (bypasses RLS)
      supabase = createServiceClient();
      const { data: job } = await supabase
        .from('modify_jobs')
        .select('user_id')
        .eq('id', jobId)
        .single();

      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      userId = job.user_id;
    } else {
      // External call - verify auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
      userId = user.id;

      // Check Pro subscription
      const tier = await getUserTier(user.id);
      if (!isPro(tier)) {
        return NextResponse.json({
          error: 'AI Modification requires a Pro subscription',
          code: 'UPGRADE_REQUIRED',
        }, { status: 402 });
      }
    }

    // Fetch the job
    const { data: job, error: jobError } = await supabase
      .from('modify_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', userId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const modifyJob = job as ModifyJob;

    // Check if job is already complete or failed
    if (modifyJob.status === 'completed' || modifyJob.status === 'failed') {
      return NextResponse.json({
        jobId: modifyJob.id,
        status: modifyJob.status,
        message: 'Job already finished',
      });
    }

    // Check if job is waiting for user answers
    if (modifyJob.status === 'awaiting_answers' && !modifyJob.user_answers) {
      return NextResponse.json({
        jobId: modifyJob.id,
        status: modifyJob.status,
        message: 'Waiting for user answers',
      });
    }

    // Fetch protocol with config
    const { data: protocol, error: protocolError } = await supabase
      .from('protocols')
      .select('*, user_configs(*)')
      .eq('id', modifyJob.protocol_id)
      .eq('user_id', userId)
      .single();

    if (protocolError || !protocol) {
      await updateJobFailed(supabase, jobId, 'Protocol not found');
      return NextResponse.json({ error: 'Protocol not found' }, { status: 404 });
    }

    const protocolData = normalizeProtocol(protocol.protocol_data);
    const config = buildConfig(protocol.user_configs);
    const modifyConfig = config?.success ? config.data : fallbackConfig;

    // Process based on current status
    switch (modifyJob.status) {
      case 'pending':
      case 'researching': {
        // Phase 1: Research
        await supabase
          .from('modify_jobs')
          .update({ status: 'researching', current_stage: 'researching', updated_at: new Date().toISOString() })
          .eq('id', jobId);

        try {
          const research = await researchModification(
            protocolData,
            modifyConfig,
            modifyJob.user_message
          );

          // Phase 1.5: Analyze for questions
          const questionsResult = await analyzeForQuestions(
            protocolData,
            modifyConfig,
            modifyJob.user_message,
            research.researchText
          );

          if (questionsResult.hasQuestions && questionsResult.questions.length > 0) {
            // Save research and questions, wait for user answers
            await supabase
              .from('modify_jobs')
              .update({
                status: 'awaiting_answers',
                current_stage: 'awaiting_answers',
                research_text: research.researchText,
                research_citations: research.citations,
                research_summary: questionsResult.researchSummary,
                questions: questionsResult.questions,
                updated_at: new Date().toISOString(),
              })
              .eq('id', jobId);

            return NextResponse.json({
              jobId,
              status: 'awaiting_answers',
              questions: questionsResult.questions,
              researchSummary: questionsResult.researchSummary,
              citations: research.citations,
            });
          }

          // No questions - save research and continue to apply phase
          await supabase
            .from('modify_jobs')
            .update({
              status: 'research_complete',
              current_stage: 'research_complete',
              research_text: research.researchText,
              research_citations: research.citations,
              research_summary: questionsResult.researchSummary,
              updated_at: new Date().toISOString(),
            })
            .eq('id', jobId);

          // Trigger apply phase
          triggerNextPhase(jobId, baseUrl);

          return NextResponse.json({
            jobId,
            status: 'research_complete',
            message: 'Research complete, applying changes',
          });

        } catch (error) {
          console.error('[process] Research phase error:', error);
          await updateJobFailed(supabase, jobId, error instanceof Error ? error.message : 'Research failed');
          return NextResponse.json({ error: 'Research phase failed' }, { status: 500 });
        }
      }

      case 'research_complete':
      case 'awaiting_answers':
      case 'applying': {
        // Phase 3: Apply research to protocol
        await supabase
          .from('modify_jobs')
          .update({ status: 'applying', current_stage: 'applying', updated_at: new Date().toISOString() })
          .eq('id', jobId);

        try {
          if (!modifyJob.research_text) {
            throw new Error('No research text available');
          }

          const result = await applyResearchToProtocol(
            protocolData,
            modifyConfig,
            modifyJob.user_message,
            modifyJob.research_text,
            undefined, // userPreferences
            modifyJob.user_answers || undefined
          );

          // Update stage before verification
          await supabase
            .from('modify_jobs')
            .update({ current_stage: 'verifying', updated_at: new Date().toISOString() })
            .eq('id', jobId);

          // Verify the modified protocol
          const { verification, citations: verifyCitations } = await verifyProtocol(result.protocol, modifyConfig);

          // Merge citations
          const allCitations = mergeCitations(modifyJob.research_citations || [], verifyCitations);

          // Build current scores
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

          // Save the modification proposal
          const proposedScoresWithCitations = {
            ...verification,
            citations: allCitations,
          };

          const { data: modification } = await supabase
            .from('protocol_modifications')
            .insert({
              protocol_id: modifyJob.protocol_id,
              user_id: userId,
              user_message: modifyJob.user_message,
              proposed_protocol_data: result.protocol,
              proposed_scores: proposedScoresWithCitations,
              current_scores: currentScores,
              reasoning: result.reasoning,
              status: 'pending',
            })
            .select()
            .single();

          // Update job as completed
          await supabase
            .from('modify_jobs')
            .update({
              status: 'completed',
              current_stage: 'completed',
              modification_id: modification?.id,
              updated_at: new Date().toISOString(),
            })
            .eq('id', jobId);

          // Extract and save preference notes (non-blocking)
          extractPreferenceNotes(modifyJob.user_message).then(async notes => {
            if (notes.length > 0) {
              const notesToInsert = notes.map((note) => ({
                user_id: userId,
                note,
                source: 'modify',
                protocol_id: modifyJob.protocol_id,
              }));
              await supabase.from('user_notes').insert(notesToInsert);
            }
          }).catch(err => console.error('[process] Error extracting notes:', err));

          // TODO: Send push notification
          // await sendModifyCompletionNotification(userId, jobId, true);

          return NextResponse.json({
            jobId,
            status: 'completed',
            modificationId: modification?.id,
            proposal: {
              protocol: result.protocol,
              reasoning: result.reasoning,
              verification,
              citations: allCitations,
            },
            currentScores,
          });

        } catch (error) {
          console.error('[process] Apply phase error:', error);
          await updateJobFailed(supabase, jobId, error instanceof Error ? error.message : 'Apply phase failed');
          return NextResponse.json({ error: 'Apply phase failed' }, { status: 500 });
        }
      }

      default:
        return NextResponse.json({
          error: `Unknown job status: ${modifyJob.status}`,
        }, { status: 400 });
    }

  } catch (error) {
    console.error('[process] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Processing failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function updateJobFailed(
  supabase: Awaited<ReturnType<typeof createClient>>,
  jobId: string,
  errorMessage: string
) {
  await supabase
    .from('modify_jobs')
    .update({
      status: 'failed',
      current_stage: 'failed',
      error_message: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);
}
