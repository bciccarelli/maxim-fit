import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { dailyProtocolSchema } from '@/lib/schemas/protocol';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required to import protocols' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate protocol data against schema
    const parseResult = dailyProtocolSchema.safeParse(body.protocol);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid protocol format', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const protocol = parseResult.data;

    // Save to database
    const protocolData = {
      user_id: user.id,
      protocol_data: protocol,
      weighted_goal_score: null,
      viability_score: null,
      requirements_met: null,
      iteration: 0,
      requirement_scores: null,
      goal_scores: null,
      critiques: null,
      is_anonymous: false,
      expires_at: null,
    };

    const { data: savedProtocol, error: saveError } = await supabase
      .from('protocols')
      .insert(protocolData)
      .select()
      .single();

    if (saveError) {
      console.error('Error saving imported protocol:', saveError);
      return NextResponse.json(
        { error: 'Failed to save protocol', message: saveError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: savedProtocol.id,
      message: 'Protocol imported successfully',
    });
  } catch (error) {
    console.error('Protocol import error:', error);
    return NextResponse.json(
      { error: 'Failed to import protocol', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
