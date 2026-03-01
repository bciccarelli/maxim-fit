import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/protocol/modify/status/[jobId]
 *
 * Returns the current status of a modify job.
 * Used for polling when SSE connection is unavailable.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const supabase = await createClient();
    const { jobId } = await params;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!jobId || typeof jobId !== 'string') {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    // Fetch the job with modification details if completed
    const { data: job, error: jobError } = await supabase
      .from('modify_jobs')
      .select(`
        id,
        status,
        current_stage,
        research_summary,
        research_citations,
        questions,
        modification_id,
        error_message,
        created_at,
        updated_at
      `)
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Base response
    const response: Record<string, unknown> = {
      jobId: job.id,
      status: job.status,
      stage: job.current_stage,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
    };

    // Add phase-specific data
    switch (job.status) {
      case 'awaiting_answers':
        response.questions = job.questions;
        response.researchSummary = job.research_summary;
        response.citations = job.research_citations;
        break;

      case 'completed':
        // Fetch the modification proposal
        if (job.modification_id) {
          const { data: modification } = await supabase
            .from('protocol_modifications')
            .select('id, proposed_protocol_data, proposed_scores, current_scores, reasoning')
            .eq('id', job.modification_id)
            .single();

          if (modification) {
            response.modificationId = modification.id;
            response.proposal = {
              protocol: modification.proposed_protocol_data,
              reasoning: modification.reasoning,
              verification: modification.proposed_scores,
            };
            response.currentScores = modification.current_scores;
          }
        }
        break;

      case 'failed':
        response.error = job.error_message;
        break;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check status', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
