import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await request.json();

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Protocol ID is required' },
        { status: 400 }
      );
    }

    // Fetch the protocol to get the version_chain_id
    const { data: protocol } = await supabase
      .from('protocols')
      .select('version_chain_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    const chainId = protocol?.version_chain_id ?? id;

    // Delete any schedules referencing this chain
    await supabase
      .from('protocol_schedules')
      .delete()
      .eq('version_chain_id', chainId)
      .eq('user_id', user.id);

    // Delete entire version chain
    const { error } = await supabase
      .from('protocols')
      .delete()
      .eq('version_chain_id', chainId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting protocol chain:', error);
      return NextResponse.json(
        { error: 'Failed to delete protocol', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Protocol delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete protocol', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
