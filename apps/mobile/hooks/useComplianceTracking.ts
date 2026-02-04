import { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '@/lib/api';

export type ActivityType = 'schedule_block' | 'meal' | 'supplement' | 'workout' | 'hydration';

export interface ComplianceLog {
  id: string;
  activityType: ActivityType;
  activityIndex: number;
  activityName: string;
  scheduledTime: string | null;
  completedAt: string;
  skipped: boolean;
  notes: string | null;
}

export interface ComplianceSummary {
  scheduleCompleted: number;
  scheduleSkipped: number;
  mealsCompleted: number;
  mealsSkipped: number;
  supplementsCompleted: number;
  supplementsSkipped: number;
  workoutsCompleted: number;
  workoutsSkipped: number;
  hydrationCompleted: boolean;
}

export interface DailyComplianceData {
  date: string;
  protocolId: string | null;
  logs: ComplianceLog[];
  summary: ComplianceSummary;
}

export interface ComplianceStats {
  dailyStats: Array<{
    date: string;
    percentage: number;
    byCategory: {
      schedule: number;
      meals: number;
      supplements: number;
      workouts: number;
      hydration: boolean;
    };
  }>;
  currentStreak: number;
  longestStreak: number;
  categoryAverages: {
    schedule: number;
    meals: number;
    supplements: number;
    workouts: number;
    hydration: number;
  };
  overallAverage: number;
  daysTracked: number;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function useComplianceTracking(protocolId: string | null, date: Date = new Date()) {
  const [logs, setLogs] = useState<ComplianceLog[]>([]);
  const [summary, setSummary] = useState<ComplianceSummary | null>(null);
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dateStr = formatDate(date);

  // Fetch daily compliance data
  const fetchDaily = useCallback(async () => {
    if (!protocolId) {
      setLogs([]);
      setSummary(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data = await fetchApi<DailyComplianceData>(
        `/api/compliance/daily?date=${dateStr}&protocolId=${protocolId}`
      );

      setLogs(data.logs);
      setSummary(data.summary);
    } catch (err) {
      console.error('Error fetching compliance:', err);
      setError(err instanceof Error ? err.message : 'Failed to load compliance data');
    } finally {
      setIsLoading(false);
    }
  }, [protocolId, dateStr]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!protocolId) {
      setStats(null);
      setIsLoadingStats(false);
      return;
    }

    try {
      setIsLoadingStats(true);

      const data = await fetchApi<ComplianceStats>(
        `/api/compliance/stats?days=30&protocolId=${protocolId}`
      );

      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, [protocolId]);

  // Initial fetch
  useEffect(() => {
    fetchDaily();
    fetchStats();
  }, [fetchDaily, fetchStats]);

  // Check if an activity is completed
  const isCompleted = useCallback((activityType: ActivityType, activityIndex: number): boolean => {
    return logs.some(
      log => log.activityType === activityType && log.activityIndex === activityIndex && !log.skipped
    );
  }, [logs]);

  // Check if an activity is skipped
  const isSkipped = useCallback((activityType: ActivityType, activityIndex: number): boolean => {
    return logs.some(
      log => log.activityType === activityType && log.activityIndex === activityIndex && log.skipped
    );
  }, [logs]);

  // Toggle completion for an activity
  const toggleCompletion = useCallback(async (
    activityType: ActivityType,
    activityIndex: number,
    activityName: string,
    scheduledTime?: string
  ): Promise<void> => {
    if (!protocolId) return;

    const existingLog = logs.find(
      log => log.activityType === activityType && log.activityIndex === activityIndex
    );

    try {
      if (existingLog && !existingLog.skipped) {
        // Currently completed -> remove
        await fetchApi('/api/compliance/log', {
          method: 'DELETE',
          body: JSON.stringify({
            protocolId,
            activityType,
            activityIndex,
            scheduledDate: dateStr,
          }),
        });

        // Optimistic update
        setLogs(prev => prev.filter(
          log => !(log.activityType === activityType && log.activityIndex === activityIndex)
        ));

        // Update summary
        setSummary(prev => {
          if (!prev) return prev;
          const key = getCompletedKey(activityType);
          if (key === 'hydrationCompleted') {
            return { ...prev, hydrationCompleted: false };
          }
          return { ...prev, [key]: Math.max(0, (prev[key] as number) - 1) };
        });
      } else {
        // Not completed or was skipped -> mark as completed
        await fetchApi('/api/compliance/log', {
          method: 'POST',
          body: JSON.stringify({
            protocolId,
            activityType,
            activityIndex,
            activityName,
            scheduledDate: dateStr,
            scheduledTime,
            skipped: false,
          }),
        });

        // Optimistic update
        const newLog: ComplianceLog = {
          id: `temp-${Date.now()}`,
          activityType,
          activityIndex,
          activityName,
          scheduledTime: scheduledTime || null,
          completedAt: new Date().toISOString(),
          skipped: false,
          notes: null,
        };

        setLogs(prev => {
          // Replace if exists, otherwise add
          const filtered = prev.filter(
            log => !(log.activityType === activityType && log.activityIndex === activityIndex)
          );
          return [...filtered, newLog];
        });

        // Update summary
        setSummary(prev => {
          if (!prev) return prev;
          const completedKey = getCompletedKey(activityType);
          const skippedKey = getSkippedKey(activityType);

          if (completedKey === 'hydrationCompleted') {
            return { ...prev, hydrationCompleted: true };
          }

          // If was skipped, decrement skipped count
          const wasSkipped = existingLog?.skipped;
          return {
            ...prev,
            [completedKey]: (prev[completedKey] as number) + 1,
            ...(wasSkipped && skippedKey ? { [skippedKey]: Math.max(0, (prev[skippedKey as keyof ComplianceSummary] as number) - 1) } : {}),
          };
        });
      }
    } catch (err) {
      console.error('Error toggling completion:', err);
      // Revert on error
      await fetchDaily();
      throw err;
    }
  }, [protocolId, dateStr, logs, fetchDaily]);

  // Mark as skipped
  const markSkipped = useCallback(async (
    activityType: ActivityType,
    activityIndex: number,
    activityName: string,
    scheduledTime?: string,
    notes?: string
  ): Promise<void> => {
    if (!protocolId) return;

    try {
      await fetchApi('/api/compliance/log', {
        method: 'POST',
        body: JSON.stringify({
          protocolId,
          activityType,
          activityIndex,
          activityName,
          scheduledDate: dateStr,
          scheduledTime,
          skipped: true,
          notes,
        }),
      });

      // Refresh to get accurate state
      await fetchDaily();
    } catch (err) {
      console.error('Error marking skipped:', err);
      throw err;
    }
  }, [protocolId, dateStr, fetchDaily]);

  // Refresh data
  const refresh = useCallback(async () => {
    await Promise.all([fetchDaily(), fetchStats()]);
  }, [fetchDaily, fetchStats]);

  return {
    logs,
    summary,
    stats,
    isLoading,
    isLoadingStats,
    error,
    isCompleted,
    isSkipped,
    toggleCompletion,
    markSkipped,
    refresh,
  };
}

// Helper functions
function getCompletedKey(activityType: ActivityType): keyof ComplianceSummary {
  switch (activityType) {
    case 'schedule_block': return 'scheduleCompleted';
    case 'meal': return 'mealsCompleted';
    case 'supplement': return 'supplementsCompleted';
    case 'workout': return 'workoutsCompleted';
    case 'hydration': return 'hydrationCompleted';
  }
}

function getSkippedKey(activityType: ActivityType): keyof ComplianceSummary | null {
  switch (activityType) {
    case 'schedule_block': return 'scheduleSkipped';
    case 'meal': return 'mealsSkipped';
    case 'supplement': return 'supplementsSkipped';
    case 'workout': return 'workoutsSkipped';
    case 'hydration': return null;
  }
}
