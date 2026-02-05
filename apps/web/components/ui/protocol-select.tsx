'use client';

import * as React from 'react';
import { ChevronDown, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProtocolOption {
  value: string;
  label: string;
}

interface ProtocolSelectProps {
  options: ProtocolOption[];
  value: string;
  onChange: (value: string) => void;
  onDelete: (value: string) => void;
  deletingId?: string | null;
  className?: string;
}

export function ProtocolSelect({
  options,
  value,
  onChange,
  onDelete,
  deletingId,
  className,
}: ProtocolSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setConfirmDeleteId(null);
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
        setConfirmDeleteId(null);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleDeleteClick = (e: React.MouseEvent, optionValue: string) => {
    e.stopPropagation();
    if (confirmDeleteId === optionValue) {
      onDelete(optionValue);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(optionValue);
    }
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(null);
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setConfirmDeleteId(null);
        }}
        className={cn(
          'h-10 min-w-[200px] rounded-md border border-input bg-background px-3 text-sm',
          'flex items-center justify-between gap-2',
          'ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
      >
        <span className="truncate">{selectedOption?.label || 'Select'}</span>
        <ChevronDown className={cn('h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 min-w-[240px] rounded-md border border-input bg-background shadow-md">
          {options.map((option) => {
            const isDeleting = deletingId === option.value;
            const isConfirming = confirmDeleteId === option.value;

            return (
              <div
                key={option.value}
                className={cn(
                  'flex items-center justify-between gap-2 px-3 py-2',
                  'hover:bg-muted focus:bg-muted',
                  'first:rounded-t-md last:rounded-b-md',
                  option.value === value && 'bg-muted font-medium'
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                    setConfirmDeleteId(null);
                  }}
                  className="flex-1 text-left text-sm truncate"
                >
                  {option.label}
                </button>

                {isConfirming && !isDeleting ? (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleDeleteClick(e, option.value)}
                      className="p-1 rounded text-destructive hover:bg-destructive/10"
                      aria-label="Confirm delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelDelete}
                      className="text-xs text-muted-foreground hover:text-foreground px-1"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteClick(e, option.value)}
                    disabled={isDeleting}
                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                    aria-label="Delete protocol"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
