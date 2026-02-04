import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyProtocol } from '@/lib/gemini/generation';
import { normalizeProtocol, type Citation } from '@/lib/schemas/protocol';
import { userConfigSchema } from '@/lib/schemas/user-config';
import { getUserTier, isPro } from '@/lib/stripe/subscription';
import { mergeCitations } from '@/lib/gemini/citations';

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
        error: 'AI Verification requires a Pro subscription',
        code: 'UPGRADE_REQUIRED',
        currentTier: tier,
      }, { status: 402 });
    }

    const { protocolId } = await request.json();

    if (!protocolId || typeof protocolId !== 'string') {
      return NextResponse.json({ error: 'Protocol ID is required' }, { status: 400 });
    }

    // Fetch the protocol
    const { data: protocol, error: fetchError } = await supabase
      .from('protocols')
      .select('*, user_configs(*)')
      .eq('id', protocolId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !protocol) {
      return NextResponse.json({ error: 'Protocol not found' }, { status: 404 });
    }

    const protocolData = normalizeProtocol(protocol.protocol_data);

    // Build config from user_configs if available
    const configData = protocol.user_configs;
    const config = configData
      ? userConfigSchema.safeParse({
          personal_info: configData.personal_info,
          goals: configData.goals,
          requirements: configData.requirements,
          iterations: 1,
        })
      : null;

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

    const verificationConfig = config?.success ? config.data : fallbackConfig;

    // Run verification - now returns citations along with verification result
    const { verification, citations: newCitations } = await verifyProtocol(protocolData, verificationConfig);

    // Merge new citations with existing ones
    const existingCitations = (protocol.citations as Citation[]) || [];
    const mergedCitations = mergeCitations(existingCitations, newCitations);

    // Update the protocol row in-place with verification scores and citations
    const { error: updateError } = await supabase
      .from('protocols')
      .update({
        weighted_goal_score: verification.weighted_goal_score,
        viability_score: verification.viability_score,
        requirements_met: verification.requirements_met,
        requirement_scores: verification.requirement_scores,
        goal_scores: verification.goal_scores,
        critiques: verification.critiques,
        citations: mergedCitations,
        verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq('id', protocolId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating protocol verification:', updateError);
    }

    return NextResponse.json({ verification, citations: mergedCitations });
  } catch (error) {
    console.error('Protocol verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify protocol', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
