'use client';

import type { DailyStat } from '@/lib/hooks/useComplianceTracking';

interface WeeklyChartProps {
  dailyStats: DailyStat[];
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WeeklyChart({ dailyStats }: WeeklyChartProps) {
  const last7 = dailyStats.slice(-7);
  const todayStr = new Date().toISOString().split('T')[0];

  // Pad to 7 entries with zeros for missing days
  const entries = last7.length > 0 ? last7 : Array.from({ length: 7 }, (_, i) => ({
    date: '',
    percentage: 0,
    byCategory: { schedule: 0, meals: 0, supplements: 0, workouts: 0, hydration: false },
  }));

  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
        Last 7 days
      </h3>
      <div className="flex items-end gap-2 h-24">
        {entries.map((stat, i) => {
          const isToday = stat.date === todayStr;
          const dayDate = stat.date ? new Date(stat.date + 'T12:00:00') : null;
          const label = dayDate ? DAY_LABELS[dayDate.getDay() === 0 ? 6 : dayDate.getDay() - 1] : '';

          return (
            <div key={stat.date || i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-muted rounded-sm overflow-hidden h-16 flex items-end">
                <div
                  className={`w-full rounded-sm transition-colors duration-150 ${
                    isToday ? 'bg-primary' : 'bg-primary/60'
                  }`}
                  style={{ height: `${Math.max(stat.percentage, 2)}%` }}
                />
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                {stat.percentage > 0 ? `${stat.percentage}` : '–'}
              </span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
