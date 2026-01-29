import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizeProtocol, type Meal } from '@/lib/schemas/protocol';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { proposalId } = await request.json();

    if (!proposalId || typeof proposalId !== 'string') {
      return NextResponse.json({ error: 'Proposal ID is required' }, { status: 400 });
    }

    // Fetch the proposal
    const { data: proposal, error: fetchError } = await supabase
      .from('meal_generation_proposals')
      .select('*')
      .eq('id', proposalId)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .single();

    if (fetchError || !proposal) {
      return NextResponse.json({ error: 'Proposal not found or already processed' }, { status: 404 });
    }

    // Fetch the current protocol
    const { data: current, error: protocolError } = await supabase
      .from('protocols')
      .select('*')
      .eq('id', proposal.protocol_id!)
      .eq('user_id', user.id)
      .single();

    if (protocolError || !current) {
      return NextResponse.json({ error: 'Protocol not found' }, { status: 404 });
    }

    // Normalize and update protocol data with new meals
    const protocolData = normalizeProtocol(current.protocol_data);
    const newMeals = proposal.proposed_meals as Meal[];

    const updatedProtocolData = {
      ...protocolData,
      diet: {
        ...protocolData.diet,
        meals: newMeals,
      },
    };

    // Mark old row as not current
    await supabase
      .from('protocols')
      .update({ is_current: false })
      .eq('id', current.id)
      .eq('user_id', user.id);

    // Create new version with updated meals
    const { data: newVersion, error: insertError } = await supabase
      .from('protocols')
      .insert({
        user_id: user.id,
        config_id: current.config_id,
        protocol_data: updatedProtocolData,
        name: current.name,
        version: (current.version ?? 1) + 1,
        version_chain_id: current.version_chain_id ?? current.id,
        is_current: true,
        parent_version_id: current.id,
        change_note: `AI-generated ${newMeals.length}-meal plan`,
        change_source: 'ai_generate_meals',
        verified: false, // New version needs verification
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
      console.error('Error creating new version with meals:', insertError);
      return NextResponse.json(
        { error: 'Failed to accept meal plan', message: insertError.message },
        { status: 500 }
      );
    }

    // Mark proposal as accepted
    await supabase
      .from('meal_generation_proposals')
      .update({ status: 'accepted' })
      .eq('id', proposalId);

    return NextResponse.json({
      id: newVersion.id,
      version: newVersion.version,
      message: 'Meal plan accepted',
    });
  } catch (error) {
    console.error('Accept meal plan error:', error);
    return NextResponse.json(
      { error: 'Failed to accept meal plan', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
