import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { dailyProtocolSchema } from '@/lib/schemas/protocol';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { protocolId, protocolData, changeNote } = await request.json();

    if (!protocolId || typeof protocolId !== 'string') {
      return NextResponse.json({ error: 'Protocol ID is required' }, { status: 400 });
    }

    // Validate the new protocol data
    const parseResult = dailyProtocolSchema.safeParse(protocolData);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid protocol data', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    // Fetch the current protocol
    const { data: current, error: fetchError } = await supabase
      .from('protocols')
      .select('*')
      .eq('id', protocolId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !current) {
      return NextResponse.json({ error: 'Protocol not found' }, { status: 404 });
    }

    // Mark old row as not current
    await supabase
      .from('protocols')
      .update({ is_current: false })
      .eq('id', protocolId)
      .eq('user_id', user.id);

    // Insert new version
    const { data: newVersion, error: insertError } = await supabase
      .from('protocols')
      .insert({
        user_id: user.id,
        config_id: current.config_id,
        protocol_data: parseResult.data,
        name: current.name,
        version: (current.version ?? 1) + 1,
        version_chain_id: current.version_chain_id ?? current.id,
        is_current: true,
        parent_version_id: current.id,
        change_note: changeNote || 'Direct edit',
        change_source: 'direct_edit',
        verified: false,
        verified_at: null,
        weighted_goal_score: null,
        viability_score: null,
        requirements_met: null,
        requirement_scores: null,
        goal_scores: null,
        critiques: null,
        iteration: current.iteration,
        is_anonymous: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating new version:', insertError);
      return NextResponse.json(
        { error: 'Failed to save edit', message: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: newVersion.id,
      version: newVersion.version,
      message: 'Protocol edited successfully',
    });
  } catch (error) {
    console.error('Protocol edit error:', error);
    return NextResponse.json(
      { error: 'Failed to edit protocol', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
