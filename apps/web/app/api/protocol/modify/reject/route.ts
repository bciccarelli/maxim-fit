import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { modificationId } = await request.json();

    if (!modificationId || typeof modificationId !== 'string') {
      return NextResponse.json({ error: 'Modification ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('protocol_modifications')
      .update({ status: 'rejected' })
      .eq('id', modificationId)
      .eq('user_id', user.id)
      .eq('status', 'pending');

    if (error) {
      return NextResponse.json(
        { error: 'Failed to reject modification', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Modification rejected' });
  } catch (error) {
    console.error('Reject modification error:', error);
    return NextResponse.json(
      { error: 'Failed to reject modification', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
