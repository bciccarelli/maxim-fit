import { View, Text, StyleSheet, Pressable, ScrollView, Modal } from 'react-native';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Plus, Trash2, X, Utensils, Pill, Dumbbell, Clock } from 'lucide-react-native';
import type { DailyProtocol, ScheduleVariant, OtherEvent, DayOfWeek } from '@protocol/shared/schemas';
import {
  computeScheduleEvents,
  getVariantIndexForDay,
  type ScheduleEvent,
  type ScheduleEventSource,
} from '@protocol/shared';
import { EditableField } from './EditableField';

type Props = {
  protocol: DailyProtocol;
  editable?: boolean;
  onChange?: (protocol: DailyProtocol) => void;
};

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

const EMPTY_OTHER_EVENT: OtherEvent = {
  start_time: '12:00',
  end_time: '13:00',
  activity: 'New activity',
  requirement_satisfied: null,
};

// Timeline constants
const HOUR_HEIGHT = 48;
const MIN_BLOCK_HEIGHT = 32;
const MIN_BLOCK_DURATION = Math.ceil((MIN_BLOCK_HEIGHT / HOUR_HEIGHT) * 60);
const HOUR_MARKER_WIDTH = 40;

/** Convert "HH:MM" to total minutes from midnight */
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Format hour to "HH:00" */
function toHourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

interface BlockLayout {
  columnIndex: number;
  totalColumns: number;
}

/** Compute column layout for overlapping events */
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
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  }
  function union(a: number, b: number) {
    parent[find(a)] = find(b);
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = indexed[i],
        b = indexed[j];
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

/** Get styling for event block based on source type */
function getEventBlockStyle(source: ScheduleEventSource) {
  switch (source) {
    case 'meal':
      return { backgroundColor: 'rgba(45, 90, 45, 0.15)', borderLeftColor: '#2d5a2d' };
    case 'supplement':
      return { backgroundColor: 'rgba(2, 132, 199, 0.1)', borderLeftColor: '#0284c7' };
    case 'workout':
      return { backgroundColor: 'rgba(217, 119, 6, 0.1)', borderLeftColor: '#d97706' };
    case 'other':
      return { backgroundColor: 'rgba(102, 102, 102, 0.1)', borderLeftColor: '#666' };
  }
}

function SourceIcon({ source }: { source: ScheduleEventSource }) {
  const iconProps = { size: 14 };
  switch (source) {
    case 'meal':
      return <Utensils {...iconProps} color="#2d5a2d" />;
    case 'supplement':
      return <Pill {...iconProps} color="#0284c7" />;
    case 'workout':
      return <Dumbbell {...iconProps} color="#d97706" />;
    case 'other':
      return <Clock {...iconProps} color="#666" />;
  }
}

// Stable event identifier to track which event is being edited
// Using source + sourceIndex because array indices change when events are re-sorted by time
type EditingEventId = {
  source: ScheduleEventSource;
  sourceIndex: number;
} | null;

export function ScheduleSection({
  protocol,
  editable = false,
  onChange,
}: Props) {
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(() => {
    const dayIndex: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return dayIndex[new Date().getDay()];
  });
  const [editingEvent, setEditingEvent] = useState<EditingEventId>(null);
  const [editingWakeSleep, setEditingWakeSleep] = useState(false);
  const [currentTimeMin, setCurrentTimeMin] = useState<number>(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  // Get today's day of week
  const today = useMemo(() => {
    const dayIndex: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return dayIndex[new Date().getDay()];
  }, []);

  // Update current time every minute
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeMin(now.getHours() * 60 + now.getMinutes());
    };
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Check if selected day is today
  const isToday = selectedDay === today;

  const variantIndex = useMemo(
    () => getVariantIndexForDay(protocol.schedules, selectedDay),
    [protocol.schedules, selectedDay]
  );
  const selectedVariant = protocol.schedules[variantIndex];

  const events = useMemo(
    () => computeScheduleEvents(protocol, selectedDay),
    [protocol, selectedDay]
  );

  // Find the current event being edited by stable ID (source + sourceIndex)
  const editingEventData = useMemo(() => {
    if (!editingEvent) return null;
    return events.find(
      (e) => e.source === editingEvent.source && e.sourceIndex === editingEvent.sourceIndex
    ) ?? null;
  }, [events, editingEvent]);

  // Timeline range computation
  const { firstHour, lastHour, hours, rangeStartMin, totalHeight } = useMemo(() => {
    if (events.length === 0) {
      const defaultHours = Array.from({ length: 17 }, (_, i) => i + 6);
      return {
        firstHour: 6,
        lastHour: 22,
        hours: defaultHours,
        rangeStartMin: 360,
        totalHeight: 16 * HOUR_HEIGHT,
      };
    }
    const allStarts = events.map((e) => toMinutes(e.start_time));
    const allEnds = events.map((e) => toMinutes(e.end_time));
    const first = Math.floor(Math.min(...allStarts) / 60);
    const last = Math.ceil(Math.max(...allEnds) / 60);
    const hoursArray: number[] = [];
    for (let h = first; h <= last; h++) hoursArray.push(h);
    return {
      firstHour: first,
      lastHour: last,
      hours: hoursArray,
      rangeStartMin: first * 60,
      totalHeight: (last - first) * HOUR_HEIGHT,
    };
  }, [events]);

  // Block layout for overlapping events
  const blockLayout = useMemo(
    () => computeBlockLayout(events, MIN_BLOCK_DURATION),
    [events]
  );

  const updateProtocol = useCallback(
    (updated: DailyProtocol) => {
      onChange?.(updated);
    },
    [onChange]
  );

  const handleUpdateVariant = useCallback(
    (updates: Partial<ScheduleVariant>) => {
      const newSchedules = [...protocol.schedules];
      newSchedules[variantIndex] = { ...newSchedules[variantIndex], ...updates };
      updateProtocol({ ...protocol, schedules: newSchedules });
    },
    [protocol, variantIndex, updateProtocol]
  );

  const handleUpdateEventTime = useCallback(
    (event: ScheduleEvent, newStartTime: string, newEndTime?: string) => {
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
    },
    [protocol, variantIndex, updateProtocol]
  );

  const handleUpdateOtherEventActivity = useCallback(
    (event: ScheduleEvent, activity: string) => {
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
    },
    [protocol, variantIndex, updateProtocol]
  );

  const handleDeleteEvent = useCallback(
    (event: ScheduleEvent) => {
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
      setEditingEvent(null);
    },
    [protocol, variantIndex, updateProtocol]
  );

  const handleAddOtherEvent = useCallback(() => {
    const newSchedules = [...protocol.schedules];
    const variant = newSchedules[variantIndex];
    if (variant) {
      const newOtherEventIndex = variant.other_events.length; // Index of new event in other_events array
      newSchedules[variantIndex] = {
        ...variant,
        other_events: [...variant.other_events, { ...EMPTY_OTHER_EVENT }],
      };
      updateProtocol({ ...protocol, schedules: newSchedules });
      // Use stable identifier for the new event
      setEditingEvent({ source: 'other', sourceIndex: newOtherEventIndex });
    }
  }, [protocol, variantIndex, updateProtocol]);

  if (!selectedVariant) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Schedule</Text>

      {/* Day Selector */}
      <View style={styles.daySelector}>
        {DAYS.map((day) => (
          <Pressable
            key={day}
            style={[
              styles.daySelectorButton,
              selectedDay === day && styles.daySelectorButtonActive,
            ]}
            onPress={() => setSelectedDay(day)}
          >
            <Text
              style={[
                styles.daySelectorText,
                selectedDay === day && styles.daySelectorTextActive,
              ]}
            >
              {DAY_ABBR[day]}
            </Text>
            {day === today && <View style={styles.todayDot} />}
          </Pressable>
        ))}
      </View>

      <View style={styles.card}>
        {selectedVariant.label && (
          <Text style={styles.scheduleLabel}>{selectedVariant.label}</Text>
        )}

        <Pressable
          onPress={() => {
            if (editable) {
              setEditingWakeSleep(true);
            }
          }}
        >
          <View style={styles.timesRow}>
            <View style={styles.timeItem}>
              <Text style={styles.timeLabel}>Wake</Text>
              {editable && editingWakeSleep ? (
                <EditableField
                  value={selectedVariant.wake_time}
                  onChange={(wake_time) => handleUpdateVariant({ wake_time })}
                  type="time"
                  editable
                  mono
                  style={styles.timeEditValue}
                />
              ) : (
                <Text style={styles.timeValue}>{selectedVariant.wake_time}</Text>
              )}
            </View>
            <View style={styles.timeItem}>
              <Text style={styles.timeLabel}>Sleep</Text>
              {editable && editingWakeSleep ? (
                <EditableField
                  value={selectedVariant.sleep_time}
                  onChange={(sleep_time) => handleUpdateVariant({ sleep_time })}
                  type="time"
                  editable
                  mono
                  style={styles.timeEditValue}
                />
              ) : (
                <Text style={styles.timeValue}>{selectedVariant.sleep_time}</Text>
              )}
            </View>
            {editable && editingWakeSleep && (
              <Pressable
                style={styles.iconButton}
                onPress={() => setEditingWakeSleep(false)}
              >
                <X size={18} color="#666" />
              </Pressable>
            )}
          </View>
        </Pressable>

        <View style={styles.daysRow}>
          {selectedVariant.days.map((day) => (
            <View key={day} style={styles.dayBadge}>
              <Text style={styles.dayText}>{day.slice(0, 3).toUpperCase()}</Text>
            </View>
          ))}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <Utensils size={12} color="#2d5a2d" />
            <Text style={styles.legendText}>Meal</Text>
          </View>
          <View style={styles.legendItem}>
            <Pill size={12} color="#0284c7" />
            <Text style={styles.legendText}>Supplement</Text>
          </View>
          <View style={styles.legendItem}>
            <Dumbbell size={12} color="#d97706" />
            <Text style={styles.legendText}>Workout</Text>
          </View>
          <View style={styles.legendItem}>
            <Clock size={12} color="#666" />
            <Text style={styles.legendText}>Other</Text>
          </View>
        </View>

        {/* Visual Timeline */}
        {events.length > 0 ? (
          <Pressable
            style={styles.timelineContainer}
            onPress={() => {
              if (editingEvent !== null) {
                setEditingEvent(null);
              }
            }}
          >
            <View style={[styles.timelineGrid, { height: totalHeight }]}>
              {/* Hour markers column */}
              <View style={styles.hourMarkersColumn}>
                {hours.map((h) => (
                  <Text
                    key={h}
                    style={[
                      styles.hourMarker,
                      { top: (h - firstHour) * HOUR_HEIGHT - 6 },
                    ]}
                  >
                    {toHourLabel(h)}
                  </Text>
                ))}
              </View>

              {/* Events column */}
              <View style={styles.eventsColumn}>
                {/* Hour divider lines */}
                {hours.map((h) => (
                  <View
                    key={h}
                    style={[
                      styles.hourLine,
                      { top: (h - firstHour) * HOUR_HEIGHT },
                    ]}
                  />
                ))}

                  {/* Event blocks */}
                  {events.map((event, index) => {
                    const startMin = toMinutes(event.start_time);
                    const endMin = toMinutes(event.end_time);
                    const durationMin = endMin - startMin;
                    const top = ((startMin - rangeStartMin) / 60) * HOUR_HEIGHT;
                    const naturalHeight = (durationMin / 60) * HOUR_HEIGHT;
                    const height = Math.max(naturalHeight, MIN_BLOCK_HEIGHT);
                    const { columnIndex, totalColumns } = blockLayout[index] || { columnIndex: 0, totalColumns: 1 };
                    const isShort = durationMin <= 30;
                    const isNarrow = totalColumns >= 3;

                    return (
                      <Pressable
                        key={index}
                        style={[
                          styles.eventBlock,
                          getEventBlockStyle(event.source),
                          {
                            top,
                            height,
                            left: `${(columnIndex / totalColumns) * 100}%`,
                            width: `${(1 / totalColumns) * 100}%`,
                          },
                          isNarrow && styles.eventBlockNarrow,
                        ]}
                        onPress={() => editable && setEditingEvent({ source: event.source, sourceIndex: event.sourceIndex })}
                      >
                        {isNarrow ? (
                          <View style={styles.eventBlockContentNarrow}>
                            <SourceIcon source={event.source} />
                          </View>
                        ) : isShort ? (
                          <View style={styles.eventBlockContentShort}>
                            <SourceIcon source={event.source} />
                            <Text style={styles.eventBlockName} numberOfLines={1}>
                              {event.activity}
                            </Text>
                            <Text style={styles.eventBlockTime}>{event.start_time}</Text>
                          </View>
                        ) : (
                          <View style={styles.eventBlockContentStandard}>
                            <View style={styles.eventBlockHeader}>
                              <SourceIcon source={event.source} />
                              <Text style={styles.eventBlockName} numberOfLines={1}>
                                {event.activity}
                              </Text>
                            </View>
                            <Text style={styles.eventBlockTimeRange}>
                              {event.start_time} – {event.end_time}
                            </Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>

              {/* Current time indicator */}
              {isToday && currentTimeMin >= rangeStartMin && currentTimeMin <= lastHour * 60 && (
                <View
                  style={[
                    styles.nowLine,
                    { top: ((currentTimeMin - rangeStartMin) / 60) * HOUR_HEIGHT },
                  ]}
                >
                  <View style={styles.nowDot} />
                  <View style={styles.nowLineBar} />
                </View>
              )}
            </View>

            {editable && (
              <Pressable style={styles.addButton} onPress={handleAddOtherEvent}>
                <Plus size={16} color="#2d5a2d" />
                <Text style={styles.addButtonText}>Add other event</Text>
              </Pressable>
            )}
          </Pressable>
        ) : (
          <View style={styles.emptyTimeline}>
            <Text style={styles.noEvents}>No events scheduled for this day</Text>
            {editable && (
              <Pressable style={styles.addButton} onPress={handleAddOtherEvent}>
                <Plus size={16} color="#2d5a2d" />
                <Text style={styles.addButtonText}>Add other event</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      {/* Edit Event Modal */}
      <Modal
        visible={editingEventData !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingEvent(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setEditingEvent(null)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {editingEventData && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderLeft}>
                    <SourceIcon source={editingEventData.source} />
                    <Text style={styles.modalTitle}>
                      {editingEventData.activity}
                    </Text>
                  </View>
                  <Pressable
                    style={styles.modalCloseButton}
                    onPress={() => setEditingEvent(null)}
                  >
                    <X size={20} color="#666" />
                  </Pressable>
                </View>

                <View style={styles.modalBody}>
                  <View style={styles.modalField}>
                    <Text style={styles.modalFieldLabel}>Start time</Text>
                    <EditableField
                      value={editingEventData.start_time}
                      onChange={(t) => handleUpdateEventTime(editingEventData, t)}
                      type="time"
                      editable
                      mono
                      style={styles.modalFieldInput}
                    />
                  </View>

                  <View style={styles.modalField}>
                    <Text style={styles.modalFieldLabel}>End time</Text>
                    <EditableField
                      value={editingEventData.end_time}
                      onChange={(t) =>
                        handleUpdateEventTime(
                          editingEventData,
                          editingEventData.start_time,
                          t
                        )
                      }
                      type="time"
                      editable={editingEventData.source === 'other'}
                      mono
                      style={styles.modalFieldInput}
                    />
                  </View>

                  {editingEventData.source === 'other' && (
                    <View style={styles.modalField}>
                      <Text style={styles.modalFieldLabel}>Activity</Text>
                      <EditableField
                        value={editingEventData.activity}
                        onChange={(a) =>
                          handleUpdateOtherEventActivity(editingEventData, a)
                        }
                        editable
                        style={styles.modalFieldInput}
                      />
                    </View>
                  )}
                </View>

                <Pressable
                  style={styles.modalDeleteButton}
                  onPress={() => handleDeleteEvent(editingEventData)}
                >
                  <Trash2 size={16} color="#c62828" />
                  <Text style={styles.modalDeleteText}>Delete event</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  daySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  daySelectorButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
    position: 'relative',
  },
  daySelectorButtonActive: {
    backgroundColor: '#2d5a2d',
  },
  daySelectorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  daySelectorTextActive: {
    color: '#fff',
  },
  todayDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2d5a2d',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#2d5a2d',
    marginBottom: 12,
  },
  scheduleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a2e1a',
    marginBottom: 12,
  },
  timesRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 12,
    alignItems: 'center',
  },
  timeItem: {},
  timeLabel: {
    fontSize: 11,
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a2e1a',
    fontVariant: ['tabular-nums'],
  },
  timeEditValue: {
    fontSize: 18,
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  dayBadge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  dayText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2d5a2d',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#666',
  },

  // Timeline grid
  timelineContainer: {
    marginTop: 12,
  },
  timelineGrid: {
    flexDirection: 'row',
    position: 'relative',
  },
  hourMarkersColumn: {
    width: HOUR_MARKER_WIDTH,
    position: 'relative',
  },
  hourMarker: {
    position: 'absolute',
    left: 0,
    fontSize: 10,
    color: '#999',
    fontVariant: ['tabular-nums'],
  },
  eventsColumn: {
    flex: 1,
    position: 'relative',
    borderLeftWidth: 1,
    borderLeftColor: '#e5e5e5',
  },
  hourLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  nowLine: {
    position: 'absolute',
    left: HOUR_MARKER_WIDTH - 4,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 5,
  },
  nowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  nowLineBar: {
    flex: 1,
    height: 2,
    backgroundColor: '#ef4444',
  },
  emptyTimeline: {
    paddingTop: 12,
  },

  // Event blocks
  eventBlock: {
    position: 'absolute',
    borderLeftWidth: 3,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 4,
    marginRight: 4,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  eventBlockNarrow: {
    paddingHorizontal: 4,
  },
  eventBlockContentNarrow: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventBlockContentShort: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventBlockContentStandard: {
    flex: 1,
  },
  eventBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventBlockName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1a2e1a',
    flex: 1,
  },
  eventBlockTime: {
    fontSize: 10,
    color: '#666',
    fontVariant: ['tabular-nums'],
  },
  eventBlockTimeRange: {
    fontSize: 10,
    color: '#666',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },

  iconButton: {
    padding: 6,
  },
  noEvents: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    paddingVertical: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 4,
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2d5a2d',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a2e1a',
    flex: 1,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    gap: 16,
  },
  modalField: {
    gap: 6,
  },
  modalFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalFieldInput: {
    fontSize: 16,
    backgroundColor: '#f5f5f0',
    borderRadius: 8,
    padding: 12,
  },
  modalDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  modalDeleteText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#c62828',
  },
});
