import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { targetVersionId } = await request.json();

    if (!targetVersionId || typeof targetVersionId !== 'string') {
      return NextResponse.json({ error: 'Target version ID is required' }, { status: 400 });
    }

    // Fetch the target version to revert to
    const { data: target, error: targetError } = await supabase
      .from('protocols')
      .select('*')
      .eq('id', targetVersionId)
      .eq('user_id', user.id)
      .single();

    if (targetError || !target) {
      return NextResponse.json({ error: 'Target version not found' }, { status: 404 });
    }

    // Find the current version in this chain
    const { data: currentVersion } = await supabase
      .from('protocols')
      .select('*')
      .eq('version_chain_id', target.version_chain_id!)
      .eq('is_current', true)
      .eq('user_id', user.id)
      .single();

    if (currentVersion) {
      // Mark current version as not current
      await supabase
        .from('protocols')
        .update({ is_current: false })
        .eq('id', currentVersion.id)
        .eq('user_id', user.id);
    }

    const newVersion = (currentVersion?.version ?? target.version ?? 1) + 1;

    // Create new row copying target version's data
    const { data: reverted, error: insertError } = await supabase
      .from('protocols')
      .insert({
        user_id: user.id,
        config_id: target.config_id,
        protocol_data: target.protocol_data,
        name: target.name,
        version: newVersion,
        version_chain_id: target.version_chain_id ?? target.id,
        is_current: true,
        parent_version_id: currentVersion?.id ?? target.id,
        change_note: `Reverted to version ${target.version}`,
        change_source: 'revert',
        verified: target.verified,
        verified_at: target.verified ? target.verified_at : null,
        weighted_goal_score: target.weighted_goal_score,
        viability_score: target.viability_score,
        requirements_met: target.requirements_met,
        requirement_scores: target.requirement_scores,
        goal_scores: target.goal_scores,
        critiques: target.critiques,
        iteration: target.iteration,
        is_anonymous: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating reverted version:', insertError);
      return NextResponse.json(
        { error: 'Failed to revert', message: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: reverted.id,
      version: reverted.version,
      message: `Reverted to version ${target.version}`,
    });
  } catch (error) {
    console.error('Protocol revert error:', error);
    return NextResponse.json(
      { error: 'Failed to revert protocol', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
