'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ActivityType } from '@/lib/utils/todayActivities';

export interface ComplianceLog {
  id: string;
  activityType: ActivityType;
  activityIndex: number;
  activityName: string;
  scheduledTime: string | null;
  completedAt: string | null;
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

export interface DailyStat {
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

export interface ComplianceStats {
  dailyStats: DailyStat[];
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

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function useComplianceTracking(protocolId: string | null) {
  const [logs, setLogs] = useState<ComplianceLog[]>([]);
  const [summary, setSummary] = useState<ComplianceSummary | null>(null);
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDaily = useCallback(async () => {
    if (!protocolId) return;
    try {
      const res = await fetch(`/api/compliance/daily?date=${todayStr()}&protocolId=${protocolId}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs ?? []);
        setSummary(data.summary ?? null);
      }
    } catch (e) {
      console.error('Failed to fetch daily compliance:', e);
    }
  }, [protocolId]);

  const fetchStats = useCallback(async () => {
    if (!protocolId) return;
    try {
      const res = await fetch(`/api/compliance/stats?days=30&protocolId=${protocolId}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Failed to fetch compliance stats:', e);
    }
  }, [protocolId]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchDaily(), fetchStats()]);
    setIsLoading(false);
  }, [fetchDaily, fetchStats]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isCompleted = useCallback(
    (activityType: ActivityType, activityIndex: number): boolean => {
      return logs.some(
        (l) => l.activityType === activityType && l.activityIndex === activityIndex && !l.skipped
      );
    },
    [logs]
  );

  const toggleCompletion = useCallback(
    async (activityType: ActivityType, activityIndex: number, activityName: string, scheduledTime?: string) => {
      if (!protocolId) return;

      const completed = isCompleted(activityType, activityIndex);

      if (completed) {
        // Optimistic remove
        setLogs((prev) =>
          prev.filter((l) => !(l.activityType === activityType && l.activityIndex === activityIndex))
        );

        await fetch('/api/compliance/log', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            protocolId,
            activityType,
            activityIndex,
            scheduledDate: todayStr(),
          }),
        });
      } else {
        // Optimistic add
        const tempLog: ComplianceLog = {
          id: crypto.randomUUID(),
          activityType,
          activityIndex,
          activityName,
          scheduledTime: scheduledTime ?? null,
          completedAt: new Date().toISOString(),
          skipped: false,
          notes: null,
        };
        setLogs((prev) => [...prev, tempLog]);

        await fetch('/api/compliance/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            protocolId,
            activityType,
            activityIndex,
            activityName,
            scheduledDate: todayStr(),
            scheduledTime,
          }),
        });
      }

      // Refresh stats after toggle
      fetchStats();
    },
    [protocolId, isCompleted, fetchStats]
  );

  return {
    logs,
    summary,
    stats,
    isLoading,
    isCompleted,
    toggleCompletion,
    refresh,
  };
}
