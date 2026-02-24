import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mergeCitations } from '@/lib/gemini/citations';
import type { Citation } from '@/lib/schemas/protocol';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { modificationId } = await request.json();

    if (!modificationId || typeof modificationId !== 'string') {
      return NextResponse.json({ error: 'Modification ID is required' }, { status: 400 });
    }

    // Fetch the modification
    const { data: modification, error: fetchError } = await supabase
      .from('protocol_modifications')
      .select('*')
      .eq('id', modificationId)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .single();

    if (fetchError || !modification) {
      return NextResponse.json({ error: 'Modification not found or already processed' }, { status: 404 });
    }

    // Fetch the current protocol
    const { data: current, error: protocolError } = await supabase
      .from('protocols')
      .select('*')
      .eq('id', modification.protocol_id!)
      .eq('user_id', user.id)
      .single();

    if (protocolError || !current) {
      return NextResponse.json({ error: 'Protocol not found' }, { status: 404 });
    }

    // Mark old row as not current
    await supabase
      .from('protocols')
      .update({ is_current: false })
      .eq('id', current.id)
      .eq('user_id', user.id);

    // Extract scores from proposed_scores (now includes citations)
    const proposedScores = modification.proposed_scores as {
      weighted_goal_score?: number;
      requirements_met?: boolean;
      requirement_scores?: unknown;
      goal_scores?: unknown;
      critiques?: unknown;
      citations?: Citation[];
    } | null;

    // Merge citations from the proposal with existing citations on the current protocol
    const existingCitations = (current.citations as Citation[]) || [];
    const proposedCitations = proposedScores?.citations || [];
    const mergedCitations = mergeCitations(existingCitations, proposedCitations);

    // Create new version with proposed data and merged citations
    const { data: newVersion, error: insertError } = await supabase
      .from('protocols')
      .insert({
        user_id: user.id,
        config_id: current.config_id,
        protocol_data: modification.proposed_protocol_data!,
        name: current.name,
        version: (current.version ?? 1) + 1,
        version_chain_id: current.version_chain_id ?? current.id,
        is_current: true,
        parent_version_id: current.id,
        change_note: modification.user_message,
        change_source: 'ai_modify',
        verified: true,
        verified_at: new Date().toISOString(),
        weighted_goal_score: proposedScores?.weighted_goal_score ?? null,
        requirements_met: proposedScores?.requirements_met ?? null,
        requirement_scores: proposedScores?.requirement_scores ?? null,
        goal_scores: proposedScores?.goal_scores ?? null,
        critiques: proposedScores?.critiques ?? null,
        citations: mergedCitations,
        iteration: current.iteration,
        is_anonymous: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating accepted version:', insertError);
      return NextResponse.json(
        { error: 'Failed to accept modification', message: insertError.message },
        { status: 500 }
      );
    }

    // Mark modification as accepted
    await supabase
      .from('protocol_modifications')
      .update({ status: 'accepted' })
      .eq('id', modificationId);

    return NextResponse.json({
      id: newVersion.id,
      version: newVersion.version,
      message: 'Modification accepted',
    });
  } catch (error) {
    console.error('Accept modification error:', error);
    return NextResponse.json(
      { error: 'Failed to accept modification', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
