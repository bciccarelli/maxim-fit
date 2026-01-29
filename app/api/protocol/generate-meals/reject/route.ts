import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // Mark proposal as rejected (best-effort)
    await supabase
      .from('meal_generation_proposals')
      .update({ status: 'rejected' })
      .eq('id', proposalId)
      .eq('user_id', user.id);

    return NextResponse.json({ message: 'Meal plan rejected' });
  } catch (error) {
    console.error('Reject meal plan error:', error);
    return NextResponse.json(
      { error: 'Failed to reject meal plan', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
