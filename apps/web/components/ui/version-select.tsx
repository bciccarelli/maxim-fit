'use client';

import * as React from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VersionOption {
  value: string;
  label: string;
  shortLabel: string;
}

interface VersionSelectProps {
  options: VersionOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  isLoading?: boolean;
}

export function VersionSelect({
  options,
  value,
  onChange,
  className,
  isLoading = false,
}: VersionSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape
  React.useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  if (isLoading) {
    return (
      <div className="h-10 min-w-[100px] flex items-center justify-center rounded-md border border-input bg-background">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'h-10 min-w-[100px] rounded-md border border-input bg-background px-3 text-sm',
          'flex items-center justify-between gap-2',
          'ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
      >
        <span className="font-mono">{selectedOption?.shortLabel || 'Select'}</span>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 min-w-[160px] rounded-md border border-input bg-background shadow-md">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={cn(
                'w-full px-3 py-2 text-left text-sm',
                'hover:bg-muted focus:bg-muted focus:outline-none',
                'first:rounded-t-md last:rounded-b-md',
                option.value === value && 'bg-muted font-medium'
              )}
            >
              <span className="font-mono">{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
