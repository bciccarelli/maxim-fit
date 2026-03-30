'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, type LucideIcon } from 'lucide-react';
import { ActivityChecklistItem } from './ActivityChecklistItem';
import { cn } from '@/lib/utils';
import type { TodayActivity, ActivityType } from '@/lib/utils/todayActivities';

interface ActivityChecklistProps {
  title: string;
  icon: LucideIcon;
  activities: TodayActivity[];
  isCompleted: (type: ActivityType, index: number) => boolean;
  onToggle: (type: ActivityType, index: number, name: string, time?: string) => void;
  defaultOpen?: boolean;
}

export function ActivityChecklist({
  title,
  icon: Icon,
  activities,
  isCompleted,
  onToggle,
  defaultOpen = true,
}: ActivityChecklistProps) {
  const [open, setOpen] = useState(defaultOpen);

  const completedCount = activities.filter((a) => isCompleted(a.type, a.index)).length;
  const total = activities.length;

  if (total === 0) return null;

  return (
    <div className="border rounded-lg">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 w-full px-4 py-3 text-left transition-colors duration-150 hover:bg-muted/50"
      >
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold flex-1">{title}</span>
        <span className={cn(
          'font-mono text-xs px-2 py-0.5 rounded',
          completedCount === total
            ? 'bg-success/15 text-success'
            : 'bg-muted text-muted-foreground'
        )}>
          {completedCount}/{total}
        </span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="divide-y divide-border px-4">
          {activities.map((activity) => (
            <ActivityChecklistItem
              key={`${activity.type}-${activity.index}`}
              name={activity.name}
              time={activity.time}
              details={activity.details}
              completed={isCompleted(activity.type, activity.index)}
              onToggle={() => onToggle(activity.type, activity.index, activity.name, activity.time)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
