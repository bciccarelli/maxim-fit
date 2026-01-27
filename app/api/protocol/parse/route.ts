import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseProtocolWithGoals, verifyProtocol } from '@/lib/gemini/generation';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required to parse protocols' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text content is required' },
        { status: 400 }
      );
    }

    if (text.length < 50) {
      return NextResponse.json(
        { error: 'Please provide more detailed protocol text (at least 50 characters)' },
        { status: 400 }
      );
    }

    if (text.length > 50000) {
      return NextResponse.json(
        { error: 'Text is too long (maximum 50,000 characters)' },
        { status: 400 }
      );
    }

    // Parse the text and infer goals using Gemini
    const { protocol, goals } = await parseProtocolWithGoals(text);

    // Create a user_config with the inferred goals
    const configPayload = {
      user_id: user.id,
      personal_info: {
        age: 30,
        weight_lbs: 170,
        height_in: 70,
        sex: 'other' as const,
        genetic_background: 'Unknown',
        health_conditions: [] as string[],
        fitness_level: 'intermediate' as const,
        dietary_restrictions: [] as string[],
      },
      goals,
      requirements: [] as string[],
    };

    const { data: config, error: configError } = await supabase
      .from('user_configs')
      .insert(configPayload)
      .select('id')
      .single();

    if (configError) {
      console.error('Error saving user config:', configError);
    }

    // Verify the imported protocol
    const verification = await verifyProtocol(protocol, {
      ...configPayload,
      iterations: 1,
    });

    // Save protocol to database with versioning columns
    const { data: savedProtocol, error: saveError } = await supabase
      .from('protocols')
      .insert({
        user_id: user.id,
        protocol_data: protocol,
        config_id: config?.id ?? null,
        weighted_goal_score: verification.weighted_goal_score,
        viability_score: verification.viability_score,
        requirements_met: verification.requirements_met,
        iteration: 0,
        requirement_scores: verification.requirement_scores,
        goal_scores: verification.goal_scores,
        critiques: verification.critiques,
        is_anonymous: false,
        expires_at: null,
        version: 1,
        is_current: true,
        change_source: 'imported',
        verified: true,
        verified_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving parsed protocol:', saveError);
      return NextResponse.json(
        { error: 'Failed to save protocol', message: saveError.message },
        { status: 500 }
      );
    }

    // Set version_chain_id to its own id
    await supabase
      .from('protocols')
      .update({ version_chain_id: savedProtocol.id })
      .eq('id', savedProtocol.id);

    return NextResponse.json({
      id: savedProtocol.id,
      protocol,
      goals,
      evaluation: verification,
      message: 'Protocol parsed, verified, and saved successfully',
    });
  } catch (error) {
    console.error('Protocol parse error:', error);
    return NextResponse.json(
      { error: 'Failed to parse protocol', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
