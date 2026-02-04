'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clock, Sun, Moon, Plus, Trash2, Save, Check, Utensils, Pill, Dumbbell } from 'lucide-react';
import { InlineEditField } from './InlineEditField';
import { cn } from '@/lib/utils';
import type { DailyProtocol, ScheduleVariant, OtherEvent, DayOfWeek } from '@/lib/schemas/protocol';
import {
  computeScheduleEvents,
  getVariantIndexForDay,
  type ScheduleEvent,
  type ScheduleEventSource,
} from '@protocol/shared';

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
  protocol: DailyProtocol;
  editable?: boolean;
  onChange?: (protocol: DailyProtocol) => void;
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

/** Get icon for event source */
function SourceIcon({ source }: { source: ScheduleEventSource }) {
  switch (source) {
    case 'meal':
      return <Utensils className="h-3 w-3 text-primary" />;
    case 'supplement':
      return <Pill className="h-3 w-3 text-info" />;
    case 'workout':
      return <Dumbbell className="h-3 w-3 text-warning" />;
    case 'other':
      return <Clock className="h-3 w-3 text-muted-foreground" />;
  }
}

/** Day selector component for switching between schedule variants */
function DaySelector({
  schedules,
  selectedDay,
  onSelectDay,
}: {
  schedules: ScheduleVariant[];
  selectedDay: DayOfWeek;
  onSelectDay: (day: DayOfWeek) => void;
}) {
  const getVariantIndex = (day: DayOfWeek) =>
    schedules.findIndex((v) => v.days.includes(day));

  const selectedVariantIndex = getVariantIndex(selectedDay);

  return (
    <div className="flex gap-1 mb-4">
      {DAYS.map((day) => {
        const variantIndex = getVariantIndex(day);
        const isSelected = day === selectedDay;
        const isSameVariant = variantIndex === selectedVariantIndex;
        return (
          <button
            key={day}
            onClick={() => onSelectDay(day)}
            className={cn(
              'px-2 py-1 rounded text-xs font-mono transition-colors',
              isSelected
                ? 'bg-primary text-primary-foreground'
                : isSameVariant
                  ? 'bg-primary/20 hover:bg-primary/30 text-primary'
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

export function ScheduleView({ protocol, editable = false, onChange }: ScheduleViewProps) {
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('monday');
  const [editingEventIndex, setEditingEventIndex] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);

  const variantIndex = useMemo(
    () => getVariantIndexForDay(protocol.schedules, selectedDay),
    [protocol.schedules, selectedDay]
  );
  const selectedVariant = protocol.schedules[variantIndex];

  const events = useMemo(
    () => computeScheduleEvents(protocol, selectedDay),
    [protocol, selectedDay]
  );

  const updateProtocol = (updated: DailyProtocol) => {
    setDirty(true);
    onChange?.(updated);
  };

  const handleUpdateEventTime = (event: ScheduleEvent, eventIndex: number, newStartTime: string, newEndTime?: string) => {
    let updated = protocol;

    switch (event.source) {
      case 'meal': {
        const newMeals = [...protocol.diet.meals];
        if (newMeals[event.sourceIndex]) {
          newMeals[event.sourceIndex] = { ...newMeals[event.sourceIndex], time: newStartTime };
        }
        updated = { ...protocol, diet: { ...protocol.diet, meals: newMeals } };
        break;
      }
      case 'supplement': {
        const newSupplements = [...protocol.supplementation.supplements];
        if (newSupplements[event.sourceIndex]) {
          newSupplements[event.sourceIndex] = { ...newSupplements[event.sourceIndex], time: newStartTime };
        }
        updated = { ...protocol, supplementation: { ...protocol.supplementation, supplements: newSupplements } };
        break;
      }
      case 'workout': {
        const newWorkouts = [...protocol.training.workouts];
        if (newWorkouts[event.sourceIndex]) {
          newWorkouts[event.sourceIndex] = { ...newWorkouts[event.sourceIndex], time: newStartTime };
        }
        updated = { ...protocol, training: { ...protocol.training, workouts: newWorkouts } };
        break;
      }
      case 'other': {
        const newSchedules = [...protocol.schedules];
        const variant = newSchedules[variantIndex];
        if (variant) {
          const newOtherEvents = [...variant.other_events];
          if (newOtherEvents[event.sourceIndex]) {
            newOtherEvents[event.sourceIndex] = {
              ...newOtherEvents[event.sourceIndex],
              start_time: newStartTime,
              ...(newEndTime && { end_time: newEndTime }),
            };
          }
          newSchedules[variantIndex] = { ...variant, other_events: newOtherEvents };
        }
        updated = { ...protocol, schedules: newSchedules };
        break;
      }
    }

    updateProtocol(updated);
  };

  const handleDeleteEvent = (event: ScheduleEvent) => {
    let updated = protocol;

    switch (event.source) {
      case 'meal': {
        const newMeals = protocol.diet.meals.filter((_, i) => i !== event.sourceIndex);
        updated = { ...protocol, diet: { ...protocol.diet, meals: newMeals } };
        break;
      }
      case 'supplement': {
        const newSupplements = protocol.supplementation.supplements.filter((_, i) => i !== event.sourceIndex);
        updated = { ...protocol, supplementation: { ...protocol.supplementation, supplements: newSupplements } };
        break;
      }
      case 'workout': {
        const newWorkouts = protocol.training.workouts.filter((_, i) => i !== event.sourceIndex);
        updated = {
          ...protocol,
          training: { ...protocol.training, workouts: newWorkouts, days_per_week: newWorkouts.length },
        };
        break;
      }
      case 'other': {
        const newSchedules = [...protocol.schedules];
        const variant = newSchedules[variantIndex];
        if (variant) {
          const newOtherEvents = variant.other_events.filter((_, i) => i !== event.sourceIndex);
          newSchedules[variantIndex] = { ...variant, other_events: newOtherEvents };
        }
        updated = { ...protocol, schedules: newSchedules };
        break;
      }
    }

    updateProtocol(updated);
    setEditingEventIndex(null);
  };

  const handleAddOtherEvent = () => {
    const newEvent: OtherEvent = {
      start_time: '12:00',
      end_time: '13:00',
      activity: 'New activity',
      requirement_satisfied: null,
    };

    const newSchedules = [...protocol.schedules];
    const variant = newSchedules[variantIndex];
    if (variant) {
      newSchedules[variantIndex] = {
        ...variant,
        other_events: [...variant.other_events, newEvent],
      };
    }

    updateProtocol({ ...protocol, schedules: newSchedules });
    // Set editing to the new event
    setEditingEventIndex(events.length);
  };

  const handleUpdateVariant = (updates: Partial<ScheduleVariant>) => {
    const newSchedules = [...protocol.schedules];
    newSchedules[variantIndex] = { ...newSchedules[variantIndex], ...updates };
    updateProtocol({ ...protocol, schedules: newSchedules });
  };

  const handleUpdateOtherEventActivity = (event: ScheduleEvent, activity: string) => {
    if (event.source !== 'other') return;

    const newSchedules = [...protocol.schedules];
    const variant = newSchedules[variantIndex];
    if (variant) {
      const newOtherEvents = [...variant.other_events];
      if (newOtherEvents[event.sourceIndex]) {
        newOtherEvents[event.sourceIndex] = { ...newOtherEvents[event.sourceIndex], activity };
      }
      newSchedules[variantIndex] = { ...variant, other_events: newOtherEvents };
    }
    updateProtocol({ ...protocol, schedules: newSchedules });
  };

  if (!selectedVariant) return null;

  const displayBlocks = events;
  const allStarts = displayBlocks.map((b) => toMinutes(b.start_time));
  const allEnds = displayBlocks.map((b) => toMinutes(b.end_time));
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
        {protocol.schedules.length > 1 && (
          <DaySelector
            schedules={protocol.schedules}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
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
              <InlineEditField
                value={selectedVariant.wake_time}
                onChange={(v) => handleUpdateVariant({ wake_time: v })}
                type="time"
                mono
                className="text-sm"
              />
            ) : (
              <span className="font-mono text-sm">{selectedVariant.wake_time}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4 text-info" />
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Sleep</span>
            {editable ? (
              <InlineEditField
                value={selectedVariant.sleep_time}
                onChange={(v) => handleUpdateVariant({ sleep_time: v })}
                type="time"
                mono
                className="text-sm"
              />
            ) : (
              <span className="font-mono text-sm">{selectedVariant.sleep_time}</span>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Utensils className="h-3 w-3 text-primary" />
            <span>Meal</span>
          </div>
          <div className="flex items-center gap-1">
            <Pill className="h-3 w-3 text-info" />
            <span>Supplement</span>
          </div>
          <div className="flex items-center gap-1">
            <Dumbbell className="h-3 w-3 text-warning" />
            <span>Workout</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span>Other</span>
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
              {displayBlocks.map((event, index) => {
                const startMin = toMinutes(event.start_time);
                const endMin = toMinutes(event.end_time);
                const durationMin = endMin - startMin;
                const top = ((startMin - rangeStartMin) / 60) * HOUR_HEIGHT;
                const naturalHeight = (Math.max(durationMin, MIN_BLOCK_DURATION) / 60) * HOUR_HEIGHT;
                const isEditing = editingEventIndex === index && editable;
                const height = isEditing ? Math.max(naturalHeight, EDIT_MIN_HEIGHT) : naturalHeight;
                const isShort = durationMin <= 30;
                const { columnIndex, totalColumns } = layout[index];
                const leftPct = (columnIndex / totalColumns) * 100;
                const widthPct = (1 / totalColumns) * 100;

                // Only "other" events can have their activity edited
                const canEditActivity = event.source === 'other';

                return (
                  <div
                    key={index}
                    className={cn(
                      'absolute rounded-md border overflow-hidden px-3 flex flex-col justify-center transition-colors',
                      isEditing
                        ? 'bg-card border-primary/50 ring-1 ring-primary/20'
                        : editable
                          ? 'bg-muted border-white cursor-pointer hover:bg-muted/70'
                          : 'bg-muted border-white'
                    )}
                    style={{
                      top,
                      height,
                      left: `calc(${leftPct}% + 3rem)`,
                      width: `calc(${widthPct}% - 3rem)`,
                      zIndex: isEditing ? 10 : 1,
                    }}
                    onClick={editable && !isEditing ? () => setEditingEventIndex(index) : undefined}
                  >
                    {isEditing ? (
                      <div className="space-y-1.5 py-1">
                        <div className="flex items-center gap-1">
                          <SourceIcon source={event.source} />
                          <Input
                            type="time"
                            value={event.start_time}
                            onChange={(e) => handleUpdateEventTime(event, index, e.target.value)}
                            className="w-24 font-mono text-xs h-7"
                          />
                          <span className="text-xs text-muted-foreground">–</span>
                          <Input
                            type="time"
                            value={event.end_time}
                            onChange={(e) => handleUpdateEventTime(event, index, event.start_time, e.target.value)}
                            className="w-24 font-mono text-xs h-7"
                            disabled={event.source !== 'other'}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          {canEditActivity ? (
                            <Input
                              value={event.activity}
                              onChange={(e) => handleUpdateOtherEventActivity(event, e.target.value)}
                              className="flex-1 text-xs h-7"
                            />
                          ) : (
                            <span className="flex-1 text-sm font-medium truncate">{event.activity}</span>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                            onClick={() => handleDeleteEvent(event)}
                            aria-label="Delete event"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-primary flex-shrink-0"
                            onClick={() => setEditingEventIndex(null)}
                            aria-label="Done editing"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : isShort ? (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <SourceIcon source={event.source} />
                          <p className="text-sm font-medium truncate">{event.activity}</p>
                        </div>
                        <span className="font-mono text-xs text-muted-foreground whitespace-nowrap tabular-nums">{event.start_time}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <SourceIcon source={event.source} />
                            <p className="text-sm font-medium">{event.activity}</p>
                          </div>
                          <span className="font-mono text-xs text-muted-foreground whitespace-nowrap tabular-nums">{event.start_time} – {event.end_time}</span>
                        </div>
                        {event.requirement_satisfied && (
                          <p className="text-xs text-success mt-0.5">Satisfies: {event.requirement_satisfied}</p>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No events scheduled for this day
          </div>
        )}

        {editable && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <Button variant="outline" size="sm" onClick={handleAddOtherEvent}>
              <Plus className="h-4 w-4 mr-1" />
              Add other event
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
