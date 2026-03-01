import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyCritiqueSuggestions } from '@/lib/gemini/generation';
import { normalizeProtocol } from '@/lib/schemas/protocol';
import { getUserTier, isPro } from '@/lib/stripe/subscription';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { protocolId, critiqueIndices, action, answers } = await request.json();

    if (!protocolId || typeof protocolId !== 'string') {
      return NextResponse.json({ error: 'Protocol ID is required' }, { status: 400 });
    }
    if (!Array.isArray(critiqueIndices) || critiqueIndices.length === 0) {
      return NextResponse.json({ error: 'At least one critique index is required' }, { status: 400 });
    }
    if (action !== 'dismiss' && action !== 'apply') {
      return NextResponse.json({ error: 'Action must be "dismiss" or "apply"' }, { status: 400 });
    }

    // Fetch the protocol
    const { data: protocol, error: fetchError } = await supabase
      .from('protocols')
      .select('*')
      .eq('id', protocolId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !protocol) {
      return NextResponse.json({ error: 'Protocol not found' }, { status: 404 });
    }

    const currentCritiques = (protocol.critiques ?? []) as Array<{
      category: string;
      criticism: string;
      severity: string;
      suggestion: string;
    }>;

    // Validate indices
    const validIndices = critiqueIndices.filter(
      (i: number) => typeof i === 'number' && i >= 0 && i < currentCritiques.length
    );

    if (validIndices.length === 0) {
      return NextResponse.json({ error: 'No valid critique indices' }, { status: 400 });
    }

    if (action === 'dismiss') {
      // Remove dismissed critiques from the array
      const remainingCritiques = currentCritiques.filter((_, i) => !validIndices.includes(i));

      const { error: updateError } = await supabase
        .from('protocols')
        .update({ critiques: remainingCritiques })
        .eq('id', protocolId);

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update critiques' }, { status: 500 });
      }

      return NextResponse.json({ critiques: remainingCritiques });
    }

    // action === 'apply'
    // Check Pro subscription for apply action (uses AI)
    const tier = await getUserTier(user.id);
    if (!isPro(tier)) {
      return NextResponse.json({
        error: 'Applying recommendations requires a Pro subscription',
        code: 'UPGRADE_REQUIRED',
        currentTier: tier,
      }, { status: 402 });
    }

    const protocolData = normalizeProtocol(protocol.protocol_data);

    // Build suggestions with user answers if provided
    const suggestionsToApply = validIndices.map((i: number) => {
      const critique = currentCritiques[i];

      // Find answers for this critique's questions
      const critiqueAnswers = (answers || [])
        .filter((a: { critiqueIndex: number; questionId: string; answer: string }) => a.critiqueIndex === i)
        .map((a: { critiqueIndex: number; questionId: string; answer: string }) => `- ${a.questionId}: ${a.answer}`)
        .join('\n');

      if (critiqueAnswers) {
        return `${critique.suggestion}\n\nUser preferences:\n${critiqueAnswers}`;
      }
      return critique.suggestion;
    });

    // Apply critique suggestions via AI
    const modifiedProtocol = await applyCritiqueSuggestions(protocolData, suggestionsToApply);

    // Remove applied critiques
    const remainingCritiques = currentCritiques.filter((_, i) => !validIndices.includes(i));

    // Create a new version with the applied changes
    const { data: newProtocol, error: insertError } = await supabase
      .from('protocols')
      .insert({
        user_id: user.id,
        protocol_data: modifiedProtocol,
        name: protocol.name,
        weighted_goal_score: protocol.weighted_goal_score,
        viability_score: protocol.viability_score,
        requirements_met: protocol.requirements_met,
        iteration: protocol.iteration,
        requirement_scores: protocol.requirement_scores,
        goal_scores: protocol.goal_scores,
        critiques: remainingCritiques,
        version: (protocol.version ?? 0) + 1,
        version_chain_id: protocol.version_chain_id ?? protocol.id,
        parent_version_id: protocol.id,
        is_current: true,
        change_source: 'critique_apply',
        change_note: `Applied ${validIndices.length} recommendation${validIndices.length > 1 ? 's' : ''}`,
        verified: false,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: 'Failed to save changes' }, { status: 500 });
    }

    // Mark the old version as not current
    await supabase
      .from('protocols')
      .update({ is_current: false })
      .eq('id', protocolId);

    return NextResponse.json({
      id: newProtocol?.id,
      protocol: modifiedProtocol,
      critiques: remainingCritiques,
    });
  } catch (error) {
    console.error('Critique action error:', error);
    return NextResponse.json(
      { error: 'Failed to process critiques', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
