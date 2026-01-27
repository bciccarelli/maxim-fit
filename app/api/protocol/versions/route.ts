import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const versionChainId = searchParams.get('chainId');

    if (!versionChainId) {
      return NextResponse.json({ error: 'Chain ID is required' }, { status: 400 });
    }

    const { data: versions, error } = await supabase
      .from('protocols')
      .select('id, version, version_chain_id, is_current, change_note, change_source, verified, verified_at, weighted_goal_score, viability_score, created_at')
      .eq('version_chain_id', versionChainId)
      .eq('user_id', user.id)
      .order('version', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch versions', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ versions: versions ?? [] });
  } catch (error) {
    console.error('Versions fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch versions', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
