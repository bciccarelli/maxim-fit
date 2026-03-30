'use client';

import { Flame } from 'lucide-react';

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
}

export function StreakCard({ currentStreak, longestStreak }: StreakCardProps) {
  return (
    <div className="border-l-2 border-l-warning rounded-lg bg-muted/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Flame className="h-4 w-4 text-warning" />
        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Streak</span>
      </div>
      <div className="flex gap-6">
        <div>
          <span className="font-mono text-3xl font-semibold">{currentStreak}</span>
          <span className="font-mono text-xs text-muted-foreground ml-1">days</span>
          <p className="text-xs text-muted-foreground mt-0.5">Current</p>
        </div>
        <div>
          <span className="font-mono text-3xl font-semibold">{longestStreak}</span>
          <span className="font-mono text-xs text-muted-foreground ml-1">days</span>
          <p className="text-xs text-muted-foreground mt-0.5">Best</p>
        </div>
      </div>
    </div>
  );
}
