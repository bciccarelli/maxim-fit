import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useState, useCallback, useMemo } from 'react';
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

export function ScheduleSection({
  protocol,
  editable = false,
  onChange,
}: Props) {
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('monday');
  const [editingEventIndex, setEditingEventIndex] = useState<number | null>(null);

  const variantIndex = useMemo(
    () => getVariantIndexForDay(protocol.schedules, selectedDay),
    [protocol.schedules, selectedDay]
  );
  const selectedVariant = protocol.schedules[variantIndex];

  const events = useMemo(
    () => computeScheduleEvents(protocol, selectedDay),
    [protocol, selectedDay]
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
      setEditingEventIndex(null);
    },
    [protocol, variantIndex, updateProtocol]
  );

  const handleAddOtherEvent = useCallback(() => {
    const newSchedules = [...protocol.schedules];
    const variant = newSchedules[variantIndex];
    if (variant) {
      newSchedules[variantIndex] = {
        ...variant,
        other_events: [...variant.other_events, { ...EMPTY_OTHER_EVENT }],
      };
    }
    updateProtocol({ ...protocol, schedules: newSchedules });
    setEditingEventIndex(events.length);
  }, [protocol, variantIndex, events.length, updateProtocol]);

  const renderEvent = (event: ScheduleEvent, eventIndex: number) => {
    const isEditing = editingEventIndex === eventIndex;
    const canEditActivity = event.source === 'other';

    if (isEditing && editable) {
      return (
        <View key={eventIndex} style={styles.eventEdit}>
          <View style={styles.editHeader}>
            <View style={styles.editHeaderLeft}>
              <SourceIcon source={event.source} />
              <Text style={styles.editLabel}>{event.activity}</Text>
            </View>
            <View style={styles.editActions}>
              <Pressable
                style={styles.iconButton}
                onPress={() => handleDeleteEvent(event)}
              >
                <Trash2 size={18} color="#c62828" />
              </Pressable>
              <Pressable
                style={styles.iconButton}
                onPress={() => setEditingEventIndex(null)}
              >
                <X size={18} color="#666" />
              </Pressable>
            </View>
          </View>

          <View style={styles.editFieldRow}>
            <View style={[styles.editField, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Start</Text>
              <EditableField
                value={event.start_time}
                onChange={(start_time) => handleUpdateEventTime(event, start_time)}
                type="time"
                editable
                mono
              />
            </View>
            <View style={[styles.editField, { flex: 1, marginLeft: 12 }]}>
              <Text style={styles.fieldLabel}>End</Text>
              <EditableField
                value={event.end_time}
                onChange={(end_time) => handleUpdateEventTime(event, event.start_time, end_time)}
                type="time"
                editable={event.source === 'other'}
                mono
              />
            </View>
          </View>

          {canEditActivity && (
            <View style={styles.editField}>
              <Text style={styles.fieldLabel}>Activity</Text>
              <EditableField
                value={event.activity}
                onChange={(activity) => handleUpdateOtherEventActivity(event, activity)}
                editable
              />
            </View>
          )}
        </View>
      );
    }

    return (
      <Pressable
        key={eventIndex}
        style={styles.event}
        onPress={() => {
          if (editable) {
            setEditingEventIndex(eventIndex);
          }
        }}
      >
        <View style={styles.eventTime}>
          <Text style={styles.eventTimeText}>
            {event.start_time}
          </Text>
        </View>
        <View style={styles.eventContent}>
          <View style={styles.eventRow}>
            <SourceIcon source={event.source} />
            <Text style={styles.eventActivity}>{event.activity}</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  if (!selectedVariant) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Schedule</Text>

      {/* Day selector */}
      {protocol.schedules.length > 1 && (
        <View style={styles.daySelector}>
          {DAYS.map((day) => {
            const isSelected = day === selectedDay;
            const dayVariantIndex = getVariantIndexForDay(protocol.schedules, day);
            const isSameVariant = dayVariantIndex === variantIndex;

            return (
              <Pressable
                key={day}
                style={[
                  styles.dayButton,
                  isSelected && styles.dayButtonSelected,
                  !isSelected && isSameVariant && styles.dayButtonSameVariant,
                ]}
                onPress={() => setSelectedDay(day)}
              >
                <Text
                  style={[
                    styles.dayButtonText,
                    isSelected && styles.dayButtonTextSelected,
                    !isSelected && isSameVariant && styles.dayButtonTextSameVariant,
                  ]}
                >
                  {DAY_ABBR[day]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={styles.card}>
        {selectedVariant.label && (
          <Text style={styles.scheduleLabel}>{selectedVariant.label}</Text>
        )}

        <Pressable
          onPress={() => {
            if (editable) {
              setEditingEventIndex(-1);
            }
          }}
        >
          <View style={styles.timesRow}>
            <View style={styles.timeItem}>
              <Text style={styles.timeLabel}>Wake</Text>
              {editable && editingEventIndex === -1 ? (
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
              {editable && editingEventIndex === -1 ? (
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
            {editable && editingEventIndex === -1 && (
              <Pressable
                style={styles.iconButton}
                onPress={() => setEditingEventIndex(null)}
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

        <View style={styles.timeline}>
          {events.map((event, index) => renderEvent(event, index))}

          {events.length === 0 && (
            <Text style={styles.noEvents}>No events scheduled for this day</Text>
          )}

          {editable && (
            <Pressable
              style={styles.addButton}
              onPress={handleAddOtherEvent}
            >
              <Plus size={16} color="#2d5a2d" />
              <Text style={styles.addButtonText}>Add other event</Text>
            </Pressable>
          )}
        </View>
      </View>
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
    gap: 4,
    marginBottom: 12,
  },
  dayButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  dayButtonSelected: {
    backgroundColor: '#2d5a2d',
  },
  dayButtonSameVariant: {
    backgroundColor: 'rgba(45, 90, 45, 0.2)',
  },
  dayButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    fontVariant: ['tabular-nums'],
  },
  dayButtonTextSelected: {
    color: '#fff',
  },
  dayButtonTextSameVariant: {
    color: '#2d5a2d',
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
  timeline: {
    paddingTop: 4,
  },
  event: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eventTime: {
    width: 50,
  },
  eventTimeText: {
    fontSize: 12,
    color: '#666',
    fontVariant: ['tabular-nums'],
  },
  eventContent: {
    flex: 1,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventActivity: {
    fontSize: 14,
    color: '#1a2e1a',
  },
  eventEdit: {
    backgroundColor: '#f9f9f7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2d5a2d',
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 6,
  },
  editField: {
    marginBottom: 12,
  },
  editFieldRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
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
});
