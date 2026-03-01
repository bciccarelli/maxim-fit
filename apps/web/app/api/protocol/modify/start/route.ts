import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserTier, isPro } from '@/lib/stripe/subscription';

/**
 * POST /api/protocol/modify/start
 *
 * Creates a modify job immediately and returns the job ID.
 * The actual processing happens asynchronously via /process endpoint.
 * This allows the mobile app to track job status even if the connection drops.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

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

    const { protocolId, userMessage } = await request.json() as {
      protocolId?: string;
      userMessage?: string;
    };

    if (!protocolId || typeof protocolId !== 'string') {
      return NextResponse.json({ error: 'Protocol ID is required' }, { status: 400 });
    }
    if (!userMessage || typeof userMessage !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Verify protocol exists and belongs to user
    const { data: protocol, error: fetchError } = await supabase
      .from('protocols')
      .select('id')
      .eq('id', protocolId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !protocol) {
      return NextResponse.json({ error: 'Protocol not found' }, { status: 404 });
    }

    // Check for existing active job for this protocol
    const { data: existingJob } = await supabase
      .from('modify_jobs')
      .select('id, status')
      .eq('protocol_id', protocolId)
      .eq('user_id', user.id)
      .not('status', 'in', '("completed","failed")')
      .single();

    if (existingJob) {
      // Return existing job instead of creating a new one
      return NextResponse.json({
        jobId: existingJob.id,
        status: existingJob.status,
        resumed: true,
      });
    }

    // Create new job
    const { data: job, error: createError } = await supabase
      .from('modify_jobs')
      .insert({
        user_id: user.id,
        protocol_id: protocolId,
        user_message: userMessage,
        status: 'pending',
        current_stage: 'pending',
      })
      .select('id, status')
      .single();

    if (createError || !job) {
      console.error('Error creating modify job:', createError);
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
    }

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
    });
  } catch (error) {
    console.error('Modify start error:', error);
    return NextResponse.json(
      { error: 'Failed to start modification', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
