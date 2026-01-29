'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clock, Sun, Moon, Plus, Trash2, Save, Check } from 'lucide-react';
import { InlineEditField } from './InlineEditField';
import { cn } from '@/lib/utils';
import type { ScheduleVariant, TimeBlock, DayOfWeek } from '@/lib/schemas/protocol';

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_ABBR: Record<DayOfWeek, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

interface ScheduleViewProps {
  schedules: ScheduleVariant[];
  editable?: boolean;
  onChange?: (schedules: ScheduleVariant[]) => void;
}

/** Convert "HH:MM" to total minutes from midnight. */
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Format minutes back to "HH:MM". */
function toTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  return `${String(h).padStart(2, '0')}:00`;
}

const HOUR_HEIGHT = 56;
const MIN_BLOCK_DURATION = 15;
const EDIT_MIN_HEIGHT = 88;

interface BlockLayout {
  columnIndex: number;
  totalColumns: number;
}

function computeBlockLayout(
  blocks: { start_time: string; end_time: string }[],
  minDuration: number
): BlockLayout[] {
  const n = blocks.length;
  if (n === 0) return [];

  const indexed = blocks.map((b, i) => {
    const start = toMinutes(b.start_time);
    const end = toMinutes(b.end_time);
    return { i, start, end, effectiveEnd: Math.max(end, start + minDuration) };
  });

  const sorted = [...indexed].sort((a, b) => a.start - b.start || a.effectiveEnd - b.effectiveEnd);

  const columnEnds: number[] = [];
  const columnIndex = new Array<number>(n).fill(0);

  for (const block of sorted) {
    let placed = false;
    for (let c = 0; c < columnEnds.length; c++) {
      if (columnEnds[c] <= block.start) {
        columnIndex[block.i] = c;
        columnEnds[c] = block.effectiveEnd;
        placed = true;
        break;
      }
    }
    if (!placed) {
      columnIndex[block.i] = columnEnds.length;
      columnEnds.push(block.effectiveEnd);
    }
  }

  const parent = Array.from({ length: n }, (_, i) => i);
  function find(x: number): number {
    while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
    return x;
  }
  function union(a: number, b: number) { parent[find(a)] = find(b); }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = indexed[i], b = indexed[j];
      if (a.start < b.effectiveEnd && b.start < a.effectiveEnd) union(i, j);
    }
  }

  const groupMaxCol = new Map<number, number>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    groupMaxCol.set(root, Math.max(groupMaxCol.get(root) ?? 0, columnIndex[i] + 1));
  }

  return blocks.map((_, i) => ({
    columnIndex: columnIndex[i],
    totalColumns: groupMaxCol.get(find(i)) ?? 1,
  }));
}

/** Format days array into human-readable label */
function formatDaysLabel(days: DayOfWeek[]): string {
  if (days.length === 7) return 'Every day';
  if (days.length === 5 && days.every(d => ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(d))) {
    return 'Weekdays';
  }
  if (days.length === 2 && days.includes('saturday') && days.includes('sunday')) {
    return 'Weekends';
  }
  return days.map(d => DAY_ABBR[d]).join(', ');
}

/** Day selector component for switching between schedule variants */
function DaySelector({
  schedules,
  selectedIndex,
  onSelectVariant,
}: {
  schedules: ScheduleVariant[];
  selectedIndex: number;
  onSelectVariant: (index: number) => void;
}) {
  const getDayVariantIndex = (day: DayOfWeek) =>
    schedules.findIndex((v) => v.days.includes(day));

  return (
    <div className="flex gap-1 mb-4">
      {DAYS.map((day) => {
        const variantIndex = getDayVariantIndex(day);
        const isSelected = variantIndex === selectedIndex;
        return (
          <button
            key={day}
            onClick={() => onSelectVariant(variantIndex)}
            className={cn(
              'px-2 py-1 rounded text-xs font-mono transition-colors',
              isSelected
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/70 text-muted-foreground'
            )}
          >
            {DAY_ABBR[day]}
          </button>
        );
      })}
    </div>
  );
}

export function ScheduleView({ schedules, editable = false, onChange }: ScheduleViewProps) {
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [draft, setDraft] = useState<ScheduleVariant[]>(schedules);
  const [dirty, setDirty] = useState(false);
  const [editingBlockIndex, setEditingBlockIndex] = useState<number | null>(null);

  const displaySchedules = dirty ? draft : schedules;
  const selectedVariant = displaySchedules[selectedVariantIndex] || displaySchedules[0];
  const blocks = selectedVariant?.schedule || [];

  const updateDraft = (updated: ScheduleVariant[]) => {
    setDraft(updated);
    setDirty(true);
  };

  const updateCurrentVariant = (updated: ScheduleVariant) => {
    const newDraft = [...draft];
    newDraft[selectedVariantIndex] = updated;
    updateDraft(newDraft);
  };

  const handleSave = () => {
    onChange?.(draft);
    setDirty(false);
    setEditingBlockIndex(null);
  };

  const handleAddBlock = () => {
    const currentVariant = draft[selectedVariantIndex];
    const newSchedule = [...currentVariant.schedule, { start_time: '12:00', end_time: '13:00', activity: 'New activity', requirement_satisfied: null }];
    updateCurrentVariant({ ...currentVariant, schedule: newSchedule });
    setEditingBlockIndex(newSchedule.length - 1);
  };

  const handleRemoveBlock = (index: number) => {
    const currentVariant = draft[selectedVariantIndex];
    updateCurrentVariant({ ...currentVariant, schedule: currentVariant.schedule.filter((_: TimeBlock, i: number) => i !== index) });
    setEditingBlockIndex(null);
  };

  const handleUpdateBlock = (index: number, field: keyof TimeBlock, value: string) => {
    const currentVariant = draft[selectedVariantIndex];
    const updated = [...currentVariant.schedule];
    updated[index] = { ...updated[index], [field]: value };
    updateCurrentVariant({ ...currentVariant, schedule: updated });
  };

  if (!selectedVariant || (blocks.length === 0 && !editable)) return null;

  const displayBlocks = blocks.length > 0 ? blocks : [];
  const allStarts = displayBlocks.map((b: TimeBlock) => toMinutes(b.start_time));
  const allEnds = displayBlocks.map((b: TimeBlock) => toMinutes(b.end_time));
  const firstHour = displayBlocks.length > 0 ? Math.floor(Math.min(...allStarts) / 60) : 6;
  const lastHour = displayBlocks.length > 0 ? Math.ceil(Math.max(...allEnds) / 60) : 22;
  const rangeStartMin = firstHour * 60;
  const totalHours = lastHour - firstHour;
  const totalHeight = totalHours * HOUR_HEIGHT;
  const layout = computeBlockLayout(displayBlocks, MIN_BLOCK_DURATION);

  const hours: number[] = [];
  for (let h = firstHour; h <= lastHour; h++) hours.push(h);

  return (
    <Card className="border-l-2 border-l-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Daily schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Day selector - only show if multiple variants */}
        {displaySchedules.length > 1 && (
          <DaySelector
            schedules={displaySchedules}
            selectedIndex={selectedVariantIndex}
            onSelectVariant={setSelectedVariantIndex}
          />
        )}

        {/* Variant label */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {selectedVariant.label || formatDaysLabel(selectedVariant.days)}
          </span>
        </div>

        <div className="flex items-center gap-4 mb-6 text-sm">
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-warning" />
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Wake</span>
            {editable ? (
              <InlineEditField value={selectedVariant.wake_time} onChange={(v) => updateCurrentVariant({ ...draft[selectedVariantIndex], wake_time: v })} type="time" mono className="text-sm" />
            ) : (
              <span className="font-mono text-sm">{selectedVariant.wake_time}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4 text-info" />
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Sleep</span>
            {editable ? (
              <InlineEditField value={selectedVariant.sleep_time} onChange={(v) => updateCurrentVariant({ ...draft[selectedVariantIndex], sleep_time: v })} type="time" mono className="text-sm" />
            ) : (
              <span className="font-mono text-sm">{selectedVariant.sleep_time}</span>
            )}
          </div>
        </div>

        {displayBlocks.length > 0 ? (
          <div className="relative flex" style={{ height: totalHeight }}>
            <div className="w-14 flex-shrink-0 relative">
              {hours.map((h) => (
                <span key={h} className="absolute font-mono text-xs text-muted-foreground tabular-nums" style={{ top: (h - firstHour) * HOUR_HEIGHT, transform: 'translateY(-50%)' }}>
                  {toTime(h * 60)}
                </span>
              ))}
            </div>
            <div className="flex-1 relative border-l border-border">
              {hours.map((h) => (
                <div key={h} className="absolute left-0 right-0 border-t border-border" style={{ top: (h - firstHour) * HOUR_HEIGHT }} />
              ))}
              {displayBlocks.map((block: TimeBlock, index: number) => {
                const startMin = toMinutes(block.start_time);
                const endMin = toMinutes(block.end_time);
                const durationMin = endMin - startMin;
                const top = ((startMin - rangeStartMin) / 60) * HOUR_HEIGHT;
                const naturalHeight = (Math.max(durationMin, MIN_BLOCK_DURATION) / 60) * HOUR_HEIGHT;
                const isEditing = editingBlockIndex === index && editable;
                const height = isEditing ? Math.max(naturalHeight, EDIT_MIN_HEIGHT) : naturalHeight;
                const isShort = durationMin <= 30;
                const { columnIndex, totalColumns } = layout[index];
                const leftPct = (columnIndex / totalColumns) * 100;
                const widthPct = (1 / totalColumns) * 100;

                return (
                  <div
                    key={index}
                    className={`absolute rounded-md border overflow-hidden px-3 flex flex-col justify-center transition-colors ${
                      isEditing
                        ? 'bg-card border-primary/50 ring-1 ring-primary/20'
                        : editable
                          ? 'bg-muted border-white cursor-pointer hover:bg-muted/70'
                          : 'bg-muted border-white'
                    }`}
                    style={{
                      top,
                      height,
                      left: `calc(${leftPct}% + 3rem)`,
                      width: `calc(${widthPct}% - 3rem)`,
                      zIndex: isEditing ? 10 : 1,
                    }}
                    onClick={editable && !isEditing ? () => setEditingBlockIndex(index) : undefined}
                  >
                    {isEditing ? (
                      <div className="space-y-1.5 py-1">
                        <div className="flex items-center gap-1">
                          <Input
                            type="time"
                            value={block.start_time}
                            onChange={(e) => handleUpdateBlock(index, 'start_time', e.target.value)}
                            className="w-24 font-mono text-xs h-7"
                          />
                          <span className="text-xs text-muted-foreground">–</span>
                          <Input
                            type="time"
                            value={block.end_time}
                            onChange={(e) => handleUpdateBlock(index, 'end_time', e.target.value)}
                            className="w-24 font-mono text-xs h-7"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <Input
                            value={block.activity}
                            onChange={(e) => handleUpdateBlock(index, 'activity', e.target.value)}
                            className="flex-1 text-xs h-7"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                            onClick={() => handleRemoveBlock(index)}
                            aria-label="Delete block"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-primary flex-shrink-0"
                            onClick={() => setEditingBlockIndex(null)}
                            aria-label="Done editing"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : isShort ? (
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">{block.activity}</p>
                        <span className="font-mono text-xs text-success whitespace-nowrap tabular-nums">{block.start_time} – {block.end_time}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium">{block.activity}</p>
                          <span className="font-mono text-xs text-success whitespace-nowrap tabular-nums">{block.start_time} – {block.end_time}</span>
                        </div>
                        {block.requirement_satisfied && (
                          <p className="text-xs text-success mt-0.5">Satisfies: {block.requirement_satisfied}</p>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {editable && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <Button variant="outline" size="sm" onClick={handleAddBlock}>
              <Plus className="h-4 w-4 mr-1" />
              Add time block
            </Button>
            {dirty && (
              <Button size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-1" />
                Save changes
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
