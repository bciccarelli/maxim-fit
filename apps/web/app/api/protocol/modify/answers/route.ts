import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { QuestionAnswer } from '@/lib/schemas/protocol';

/**
 * POST /api/protocol/modify/answers
 *
 * Submits user answers to clarifying questions for a modify job.
 * Updates the job with answers and triggers the apply phase.
 */
export async function POST(request: NextRequest) {
  const baseUrl = request.nextUrl.origin;

  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { jobId, answers } = await request.json() as {
      jobId?: string;
      answers?: QuestionAnswer[];
    };

    if (!jobId || typeof jobId !== 'string') {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'Answers array is required' }, { status: 400 });
    }

    // Fetch the job
    const { data: job, error: jobError } = await supabase
      .from('modify_jobs')
      .select('id, status')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Verify job is in awaiting_answers status
    if (job.status !== 'awaiting_answers') {
      return NextResponse.json({
        error: 'Job is not awaiting answers',
        currentStatus: job.status,
      }, { status: 400 });
    }

    // Update job with answers
    const { error: updateError } = await supabase
      .from('modify_jobs')
      .update({
        user_answers: answers,
        status: 'research_complete', // Move to next phase
        current_stage: 'processing_answers',
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (updateError) {
      console.error('Error updating job with answers:', updateError);
      return NextResponse.json({ error: 'Failed to save answers' }, { status: 500 });
    }

    // Trigger the apply phase
    fetch(`${baseUrl}/api/protocol/modify/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, internal: true }),
    }).catch(err => console.error('[answers] Error triggering process:', err));

    return NextResponse.json({
      jobId,
      status: 'applying',
      message: 'Answers received, applying changes',
    });

  } catch (error) {
    console.error('Answers submission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit answers', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
