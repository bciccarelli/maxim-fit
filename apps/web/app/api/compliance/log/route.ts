import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const logSchema = z.object({
  protocolId: z.string().uuid(),
  activityType: z.enum(['schedule_block', 'meal', 'supplement', 'workout', 'hydration']),
  activityIndex: z.number().int().min(0),
  activityName: z.string().min(1),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scheduledTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  skipped: z.boolean().optional().default(false),
  notes: z.string().optional(),
});

const deleteSchema = z.object({
  protocolId: z.string().uuid(),
  activityType: z.enum(['schedule_block', 'meal', 'supplement', 'workout', 'hydration']),
  activityIndex: z.number().int().min(0),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = logSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { protocolId, activityType, activityIndex, activityName, scheduledDate, scheduledTime, skipped, notes } = parseResult.data;

    // Verify user owns this protocol
    const { data: protocol, error: protocolError } = await supabase
      .from('protocols')
      .select('id')
      .eq('id', protocolId)
      .eq('user_id', user.id)
      .single();

    if (protocolError || !protocol) {
      return NextResponse.json({ error: 'Protocol not found' }, { status: 404 });
    }

    // Upsert the compliance log (update if exists, insert if not)
    const { data: log, error: logError } = await supabase
      .from('compliance_logs')
      .upsert(
        {
          user_id: user.id,
          protocol_id: protocolId,
          activity_type: activityType,
          activity_index: activityIndex,
          activity_name: activityName,
          scheduled_date: scheduledDate,
          scheduled_time: scheduledTime || null,
          skipped: skipped,
          notes: notes || null,
          completed_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,protocol_id,activity_type,activity_index,scheduled_date',
        }
      )
      .select()
      .single();

    if (logError) {
      console.error('Error logging compliance:', logError);
      return NextResponse.json(
        { error: 'Failed to log compliance', message: logError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: log.id,
      message: skipped ? 'Activity marked as skipped' : 'Activity logged successfully',
    });
  } catch (error) {
    console.error('Compliance log error:', error);
    return NextResponse.json(
      { error: 'Failed to log compliance', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = deleteSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { protocolId, activityType, activityIndex, scheduledDate } = parseResult.data;

    const { error: deleteError } = await supabase
      .from('compliance_logs')
      .delete()
      .eq('user_id', user.id)
      .eq('protocol_id', protocolId)
      .eq('activity_type', activityType)
      .eq('activity_index', activityIndex)
      .eq('scheduled_date', scheduledDate);

    if (deleteError) {
      console.error('Error deleting compliance log:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete compliance log', message: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Compliance log deleted successfully' });
  } catch (error) {
    console.error('Compliance delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete compliance log', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
