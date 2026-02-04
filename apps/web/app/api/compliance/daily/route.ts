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
    const date = searchParams.get('date');
    const protocolId = searchParams.get('protocolId');

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Valid date parameter required (YYYY-MM-DD)' }, { status: 400 });
    }

    // Build query
    let query = supabase
      .from('compliance_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('scheduled_date', date)
      .order('activity_type')
      .order('activity_index');

    if (protocolId) {
      query = query.eq('protocol_id', protocolId);
    }

    const { data: logs, error: logsError } = await query;

    if (logsError) {
      console.error('Error fetching compliance logs:', logsError);
      return NextResponse.json(
        { error: 'Failed to fetch compliance logs', message: logsError.message },
        { status: 500 }
      );
    }

    // Group logs by activity type for summary
    const summary = {
      schedule_block: { completed: 0, skipped: 0 },
      meal: { completed: 0, skipped: 0 },
      supplement: { completed: 0, skipped: 0 },
      workout: { completed: 0, skipped: 0 },
      hydration: { completed: false },
    };

    for (const log of logs || []) {
      const type = log.activity_type as keyof typeof summary;
      if (type === 'hydration') {
        summary.hydration.completed = !log.skipped;
      } else if (summary[type]) {
        if (log.skipped) {
          summary[type].skipped++;
        } else {
          summary[type].completed++;
        }
      }
    }

    return NextResponse.json({
      date,
      protocolId: protocolId || null,
      logs: (logs || []).map(log => ({
        id: log.id,
        activityType: log.activity_type,
        activityIndex: log.activity_index,
        activityName: log.activity_name,
        scheduledTime: log.scheduled_time,
        completedAt: log.completed_at,
        skipped: log.skipped,
        notes: log.notes,
      })),
      summary: {
        scheduleCompleted: summary.schedule_block.completed,
        scheduleSkipped: summary.schedule_block.skipped,
        mealsCompleted: summary.meal.completed,
        mealsSkipped: summary.meal.skipped,
        supplementsCompleted: summary.supplement.completed,
        supplementsSkipped: summary.supplement.skipped,
        workoutsCompleted: summary.workout.completed,
        workoutsSkipped: summary.workout.skipped,
        hydrationCompleted: summary.hydration.completed,
      },
    });
  } catch (error) {
    console.error('Daily compliance error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily compliance', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
