'use client';

import { useState, useMemo } from 'react';
import { Utensils, Pill, Dumbbell, Droplets, Clock, Loader2 } from 'lucide-react';
import { useComplianceTracking } from '@/lib/hooks/useComplianceTracking';
import { getTodayActivities } from '@/lib/utils/todayActivities';
import { ActivityChecklist } from './ActivityChecklist';
import { WeeklyChart } from './WeeklyChart';
import { StreakCard } from './StreakCard';
import type { DailyProtocol } from '@protocol/shared/schemas/protocol';

interface ProtocolOption {
  id: string;
  name: string | null;
  version_chain_id: string;
  protocol_data: DailyProtocol;
}

interface ProgressPageClientProps {
  protocols: ProtocolOption[];
}

export function ProgressPageClient({ protocols }: ProgressPageClientProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const selected = protocols[selectedIdx] ?? null;

  const { isLoading, isCompleted, toggleCompletion, stats } = useComplianceTracking(selected?.id ?? null);

  const activities = useMemo(() => {
    if (!selected) return null;
    return getTodayActivities(selected.protocol_data);
  }, [selected]);

  // Calculate today's completion percentage
  const todayPercentage = useMemo(() => {
    if (!activities) return 0;
    const all = [
      ...activities.meals,
      ...activities.supplements,
      ...activities.workouts,
      ...activities.scheduleBlocks,
    ];
    if (all.length === 0) return 0;
    const done = all.filter((a) => isCompleted(a.type, a.index)).length;
    return Math.round((done / all.length) * 100);
  }, [activities, isCompleted]);

  if (protocols.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-sm">No protocols yet. Generate one first to start tracking.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Protocol selector */}
      {protocols.length > 1 && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Protocol
          </label>
          <select
            className="border border-input rounded-md px-3 py-2 text-sm bg-background max-w-xs"
            value={selectedIdx}
            onChange={(e) => setSelectedIdx(Number(e.target.value))}
          >
            {protocols.map((p, i) => (
              <option key={p.id} value={i}>
                {p.name || 'Untitled Protocol'}
              </option>
            ))}
          </select>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading...
        </div>
      ) : activities ? (
        <>
          {/* Hero card + Streak in a row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Hero completion card */}
            <div className="border-l-2 border-l-primary rounded-lg bg-muted/50 p-4">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
                Today&apos;s progress
              </p>
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-4xl font-semibold">{todayPercentage}</span>
                <span className="font-mono text-xs text-muted-foreground">%</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <CategoryChip
                  icon={Utensils}
                  completed={activities.meals.filter((a) => isCompleted(a.type, a.index)).length}
                  total={activities.meals.length}
                />
                <CategoryChip
                  icon={Pill}
                  completed={activities.supplements.filter((a) => isCompleted(a.type, a.index)).length}
                  total={activities.supplements.length}
                />
                <CategoryChip
                  icon={Dumbbell}
                  completed={activities.workouts.filter((a) => isCompleted(a.type, a.index)).length}
                  total={activities.workouts.length}
                />
                <CategoryChip
                  icon={Clock}
                  completed={activities.scheduleBlocks.filter((a) => isCompleted(a.type, a.index)).length}
                  total={activities.scheduleBlocks.length}
                />
              </div>
            </div>

            {/* Streak card */}
            <StreakCard
              currentStreak={stats?.currentStreak ?? 0}
              longestStreak={stats?.longestStreak ?? 0}
            />
          </div>

          {/* Activity checklists */}
          <div className="space-y-3">
            <ActivityChecklist
              title="Meals"
              icon={Utensils}
              activities={activities.meals}
              isCompleted={isCompleted}
              onToggle={toggleCompletion}
            />
            <ActivityChecklist
              title="Supplements"
              icon={Pill}
              activities={activities.supplements}
              isCompleted={isCompleted}
              onToggle={toggleCompletion}
            />
            <ActivityChecklist
              title="Training"
              icon={Dumbbell}
              activities={activities.workouts}
              isCompleted={isCompleted}
              onToggle={toggleCompletion}
            />
            <ActivityChecklist
              title="Schedule"
              icon={Clock}
              activities={activities.scheduleBlocks}
              isCompleted={isCompleted}
              onToggle={toggleCompletion}
              defaultOpen={false}
            />
          </div>

          {/* Weekly chart */}
          {stats && stats.dailyStats.length > 0 && (
            <div className="border rounded-lg p-4">
              <WeeklyChart dailyStats={stats.dailyStats} />
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

function CategoryChip({ icon: Icon, completed, total }: { icon: typeof Utensils; completed: number; total: number }) {
  if (total === 0) return null;
  const allDone = completed === total;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium font-mono ${
      allDone ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
    }`}>
      <Icon className="h-3 w-3" />
      {completed}/{total}
    </span>
  );
}
