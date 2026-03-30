'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface ActivityChecklistItemProps {
  name: string;
  time?: string;
  details?: string;
  completed: boolean;
  onToggle: () => void;
}

export function ActivityChecklistItem({ name, time, details, completed, onToggle }: ActivityChecklistItemProps) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-3 py-3 w-full text-left transition-colors duration-150 hover:bg-muted/50"
    >
      <div
        className={cn(
          'h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors duration-150',
          completed
            ? 'bg-primary border-primary'
            : 'border-muted-foreground/40'
        )}
      >
        {completed && <Check className="h-3 w-3 text-primary-foreground" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', completed && 'line-through text-muted-foreground')}>
          {name}
        </p>
        {details && (
          <p className="font-mono text-xs text-muted-foreground">{details}</p>
        )}
      </div>
      {time && (
        <span className="font-mono text-sm text-muted-foreground shrink-0">{time}</span>
      )}
    </button>
  );
}
