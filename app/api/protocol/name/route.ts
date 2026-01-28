import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { protocolId, name } = await request.json();

    if (!protocolId || typeof protocolId !== 'string') {
      return NextResponse.json({ error: 'Protocol ID is required' }, { status: 400 });
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (name.length > 100) {
      return NextResponse.json({ error: 'Name must be 100 characters or fewer' }, { status: 400 });
    }

    const trimmedName = name.trim();

    // Fetch the protocol to get the version_chain_id
    const { data: protocol, error: fetchError } = await supabase
      .from('protocols')
      .select('id, version_chain_id')
      .eq('id', protocolId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !protocol) {
      return NextResponse.json({ error: 'Protocol not found' }, { status: 404 });
    }

    const chainId = protocol.version_chain_id ?? protocol.id;

    // Update all versions in the chain
    const { error: updateError } = await supabase
      .from('protocols')
      .update({ name: trimmedName })
      .eq('version_chain_id', chainId)
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update name' }, { status: 500 });
    }

    return NextResponse.json({ success: true, name: trimmedName });
  } catch (error) {
    console.error('Protocol name update error:', error);
    return NextResponse.json(
      { error: 'Failed to update name', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
