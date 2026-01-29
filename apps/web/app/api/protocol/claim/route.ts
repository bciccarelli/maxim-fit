import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserTier } from '@/lib/stripe/subscription';
import { TIER_LIMITS } from '@/lib/stripe/config';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { protocolId } = await request.json();
  if (!protocolId) {
    return NextResponse.json(
      { error: 'Protocol ID required' },
      { status: 400 }
    );
  }

  // Fetch the anonymous protocol
  const { data: protocol, error: fetchError } = await supabase
    .from('protocols')
    .select('id, user_id, is_anonymous, expires_at, version_chain_id')
    .eq('id', protocolId)
    .single();

  if (fetchError || !protocol) {
    return NextResponse.json({ error: 'Protocol not found' }, { status: 404 });
  }

  // Verify it's actually an anonymous protocol
  if (!protocol.is_anonymous || protocol.user_id !== null) {
    return NextResponse.json(
      { error: 'Protocol already claimed' },
      { status: 400 }
    );
  }

  // Check if protocol has expired
  if (protocol.expires_at && new Date(protocol.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Protocol has expired' }, { status: 410 });
  }

  // Check tier limits - count user's existing current protocols
  const tier = await getUserTier(user.id);
  const { count } = await supabase
    .from('protocols')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_current', true);

  const currentCount = count ?? 0;
  const limit = TIER_LIMITS[tier].savedProtocols;

  if (currentCount >= limit) {
    return NextResponse.json(
      {
        error: 'Protocol limit reached',
        details: { currentCount, limit, tier },
      },
      { status: 403 }
    );
  }

  // Claim the protocol: update all versions in the chain
  const { error: updateError } = await supabase
    .from('protocols')
    .update({
      user_id: user.id,
      is_anonymous: false,
      expires_at: null,
    })
    .eq('version_chain_id', protocol.version_chain_id);

  if (updateError) {
    console.error('Error claiming protocol:', updateError);
    return NextResponse.json(
      { error: 'Failed to claim protocol' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    protocolId: protocol.id,
    message: 'Protocol claimed successfully',
  });
}
