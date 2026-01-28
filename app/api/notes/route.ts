import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/notes - Fetch user's preference notes
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: notes, error } = await supabase
      .from('user_notes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
      return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
    }

    return NextResponse.json({ notes: notes ?? [] });
  } catch (error) {
    console.error('Notes fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notes - Add a new note
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { note, source, protocolId } = body;

    if (!note || typeof note !== 'string' || note.trim().length === 0) {
      return NextResponse.json({ error: 'Note text is required' }, { status: 400 });
    }

    const { data: newNote, error } = await supabase
      .from('user_notes')
      .insert({
        user_id: user.id,
        note: note.trim(),
        source: source ?? 'manual',
        protocol_id: protocolId ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating note:', error);
      return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
    }

    return NextResponse.json({ note: newNote });
  } catch (error) {
    console.error('Note create error:', error);
    return NextResponse.json(
      { error: 'Failed to create note', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notes - Delete a note
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('id');

    if (!noteId) {
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('user_notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting note:', error);
      return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Note delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete note', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
