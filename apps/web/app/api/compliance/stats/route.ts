import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type ActivityType = 'schedule_block' | 'meal' | 'supplement' | 'workout' | 'hydration';

interface DailyStat {
  date: string;
  percentage: number;
  byCategory: {
    schedule: number;
    meals: number;
    supplements: number;
    workouts: number;
    hydration: boolean;
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = Math.min(parseInt(searchParams.get('days') || '30', 10), 365);
    const protocolId = searchParams.get('protocolId');

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Build query
    let query = supabase
      .from('compliance_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('scheduled_date', startDateStr)
      .lte('scheduled_date', endDateStr)
      .order('scheduled_date', { ascending: true });

    if (protocolId) {
      query = query.eq('protocol_id', protocolId);
    }

    const { data: logs, error: logsError } = await query;

    if (logsError) {
      console.error('Error fetching compliance logs:', logsError);
      return NextResponse.json(
        { error: 'Failed to fetch compliance stats', message: logsError.message },
        { status: 500 }
      );
    }

    // Group logs by date
    const logsByDate = new Map<string, typeof logs>();
    for (const log of logs || []) {
      const date = log.scheduled_date;
      if (!logsByDate.has(date)) {
        logsByDate.set(date, []);
      }
      logsByDate.get(date)!.push(log);
    }

    // Calculate daily stats
    const dailyStats: DailyStat[] = [];
    const categoryTotals = {
      schedule: { completed: 0, total: 0 },
      meals: { completed: 0, total: 0 },
      supplements: { completed: 0, total: 0 },
      workouts: { completed: 0, total: 0 },
      hydration: { completed: 0, total: 0 },
    };

    // Generate all dates in range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayLogs = logsByDate.get(dateStr) || [];

      // Count by category for this day
      const dayCounts: Record<ActivityType, { completed: number; total: number }> = {
        schedule_block: { completed: 0, total: 0 },
        meal: { completed: 0, total: 0 },
        supplement: { completed: 0, total: 0 },
        workout: { completed: 0, total: 0 },
        hydration: { completed: 0, total: 0 },
      };

      for (const log of dayLogs) {
        const type = log.activity_type as ActivityType;
        dayCounts[type].total++;
        if (!log.skipped) {
          dayCounts[type].completed++;
        }
      }

      // Calculate day percentage (simple average across logged categories)
      let totalCompleted = 0;
      let totalLogged = 0;
      for (const counts of Object.values(dayCounts)) {
        totalCompleted += counts.completed;
        totalLogged += counts.total;
      }

      const dayPercentage = totalLogged > 0 ? Math.round((totalCompleted / totalLogged) * 100) : 0;

      // Update category totals
      categoryTotals.schedule.completed += dayCounts.schedule_block.completed;
      categoryTotals.schedule.total += dayCounts.schedule_block.total;
      categoryTotals.meals.completed += dayCounts.meal.completed;
      categoryTotals.meals.total += dayCounts.meal.total;
      categoryTotals.supplements.completed += dayCounts.supplement.completed;
      categoryTotals.supplements.total += dayCounts.supplement.total;
      categoryTotals.workouts.completed += dayCounts.workout.completed;
      categoryTotals.workouts.total += dayCounts.workout.total;
      categoryTotals.hydration.completed += dayCounts.hydration.completed;
      categoryTotals.hydration.total += dayCounts.hydration.total;

      // Only include days with activity
      if (totalLogged > 0) {
        dailyStats.push({
          date: dateStr,
          percentage: dayPercentage,
          byCategory: {
            schedule: dayCounts.schedule_block.total > 0
              ? Math.round((dayCounts.schedule_block.completed / dayCounts.schedule_block.total) * 100)
              : 0,
            meals: dayCounts.meal.total > 0
              ? Math.round((dayCounts.meal.completed / dayCounts.meal.total) * 100)
              : 0,
            supplements: dayCounts.supplement.total > 0
              ? Math.round((dayCounts.supplement.completed / dayCounts.supplement.total) * 100)
              : 0,
            workouts: dayCounts.workout.total > 0
              ? Math.round((dayCounts.workout.completed / dayCounts.workout.total) * 100)
              : 0,
            hydration: dayCounts.hydration.completed > 0,
          },
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate streaks (80% threshold for a successful day)
    const STREAK_THRESHOLD = 80;
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Sort by date descending for current streak calculation
    const sortedStats = [...dailyStats].sort((a, b) => b.date.localeCompare(a.date));

    // Calculate current streak (consecutive days from today meeting threshold)
    const todayStr = endDate.toISOString().split('T')[0];
    let checkDate = new Date(endDate);

    for (let i = 0; i < sortedStats.length; i++) {
      const stat = sortedStats[i];
      const checkDateStr = checkDate.toISOString().split('T')[0];

      if (stat.date === checkDateStr && stat.percentage >= STREAK_THRESHOLD) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (stat.date === checkDateStr) {
        // Day exists but below threshold - streak broken
        break;
      } else {
        // Gap in days - streak broken
        break;
      }
    }

    // Calculate longest streak
    const sortedStatsAsc = [...dailyStats].sort((a, b) => a.date.localeCompare(b.date));
    for (const stat of sortedStatsAsc) {
      if (stat.percentage >= STREAK_THRESHOLD) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    // Calculate category averages
    const categoryAverages = {
      schedule: categoryTotals.schedule.total > 0
        ? Math.round((categoryTotals.schedule.completed / categoryTotals.schedule.total) * 100)
        : 0,
      meals: categoryTotals.meals.total > 0
        ? Math.round((categoryTotals.meals.completed / categoryTotals.meals.total) * 100)
        : 0,
      supplements: categoryTotals.supplements.total > 0
        ? Math.round((categoryTotals.supplements.completed / categoryTotals.supplements.total) * 100)
        : 0,
      workouts: categoryTotals.workouts.total > 0
        ? Math.round((categoryTotals.workouts.completed / categoryTotals.workouts.total) * 100)
        : 0,
      hydration: categoryTotals.hydration.total > 0
        ? Math.round((categoryTotals.hydration.completed / categoryTotals.hydration.total) * 100)
        : 0,
    };

    // Overall average
    const overallAverage = dailyStats.length > 0
      ? Math.round(dailyStats.reduce((sum, s) => sum + s.percentage, 0) / dailyStats.length)
      : 0;

    return NextResponse.json({
      dailyStats,
      currentStreak,
      longestStreak,
      categoryAverages,
      overallAverage,
      daysTracked: dailyStats.length,
    });
  } catch (error) {
    console.error('Compliance stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch compliance stats', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
