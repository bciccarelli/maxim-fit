import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseProtocolText } from '@/lib/gemini/generation';

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

    // Parse the text using Gemini
    const protocol = await parseProtocolText(text);

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
      console.error('Error saving parsed protocol:', saveError);
      return NextResponse.json(
        { error: 'Failed to save protocol', message: saveError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: savedProtocol.id,
      protocol,
      message: 'Protocol parsed and saved successfully',
    });
  } catch (error) {
    console.error('Protocol parse error:', error);
    return NextResponse.json(
      { error: 'Failed to parse protocol', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
