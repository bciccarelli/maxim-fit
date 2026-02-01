import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useState, useCallback } from 'react';
import { Plus, Trash2, X } from 'lucide-react-native';
import type { ScheduleVariant, TimeBlock } from '@protocol/shared/schemas';
import { EditableField } from './EditableField';

type Props = {
  schedules: ScheduleVariant[];
  editable?: boolean;
  onChange?: (schedules: ScheduleVariant[]) => void;
};

const EMPTY_TIME_BLOCK: TimeBlock = {
  start_time: '12:00',
  end_time: '13:00',
  activity: 'New activity',
  requirement_satisfied: null,
};

export function ScheduleSection({
  schedules,
  editable = false,
  onChange,
}: Props) {
  const [editingScheduleIndex, setEditingScheduleIndex] = useState<number | null>(null);
  const [editingBlockIndex, setEditingBlockIndex] = useState<number | null>(null);

  const updateSchedule = useCallback(
    (scheduleIndex: number, updates: Partial<ScheduleVariant>) => {
      const newSchedules = [...schedules];
      newSchedules[scheduleIndex] = { ...newSchedules[scheduleIndex], ...updates };
      onChange?.(newSchedules);
    },
    [schedules, onChange]
  );

  const updateTimeBlock = useCallback(
    (scheduleIndex: number, blockIndex: number, updates: Partial<TimeBlock>) => {
      const newSchedules = [...schedules];
      const newBlocks = [...newSchedules[scheduleIndex].schedule];
      newBlocks[blockIndex] = { ...newBlocks[blockIndex], ...updates };
      newSchedules[scheduleIndex] = { ...newSchedules[scheduleIndex], schedule: newBlocks };
      onChange?.(newSchedules);
    },
    [schedules, onChange]
  );

  const addTimeBlock = useCallback(
    (scheduleIndex: number) => {
      const newSchedules = [...schedules];
      const newBlocks = [...newSchedules[scheduleIndex].schedule, { ...EMPTY_TIME_BLOCK }];
      newSchedules[scheduleIndex] = { ...newSchedules[scheduleIndex], schedule: newBlocks };
      onChange?.(newSchedules);
      setEditingScheduleIndex(scheduleIndex);
      setEditingBlockIndex(newBlocks.length - 1);
    },
    [schedules, onChange]
  );

  const removeTimeBlock = useCallback(
    (scheduleIndex: number, blockIndex: number) => {
      const newSchedules = [...schedules];
      const newBlocks = newSchedules[scheduleIndex].schedule.filter((_, i) => i !== blockIndex);
      newSchedules[scheduleIndex] = { ...newSchedules[scheduleIndex], schedule: newBlocks };
      onChange?.(newSchedules);
      setEditingBlockIndex(null);
    },
    [schedules, onChange]
  );

  const renderTimeBlock = (
    block: TimeBlock,
    blockIndex: number,
    scheduleIndex: number
  ) => {
    const isEditing =
      editingScheduleIndex === scheduleIndex && editingBlockIndex === blockIndex;

    if (isEditing && editable) {
      return (
        <View key={blockIndex} style={styles.timeBlockEdit}>
          <View style={styles.editHeader}>
            <Text style={styles.editLabel}>Edit Time Block</Text>
            <View style={styles.editActions}>
              <Pressable
                style={styles.iconButton}
                onPress={() => removeTimeBlock(scheduleIndex, blockIndex)}
              >
                <Trash2 size={18} color="#c62828" />
              </Pressable>
              <Pressable
                style={styles.iconButton}
                onPress={() => {
                  setEditingScheduleIndex(null);
                  setEditingBlockIndex(null);
                }}
              >
                <X size={18} color="#666" />
              </Pressable>
            </View>
          </View>

          <View style={styles.editFieldRow}>
            <View style={[styles.editField, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Start</Text>
              <EditableField
                value={block.start_time}
                onChange={(start_time) =>
                  updateTimeBlock(scheduleIndex, blockIndex, { start_time })
                }
                type="time"
                editable
                mono
              />
            </View>
            <View style={[styles.editField, { flex: 1, marginLeft: 12 }]}>
              <Text style={styles.fieldLabel}>End</Text>
              <EditableField
                value={block.end_time}
                onChange={(end_time) =>
                  updateTimeBlock(scheduleIndex, blockIndex, { end_time })
                }
                type="time"
                editable
                mono
              />
            </View>
          </View>

          <View style={styles.editField}>
            <Text style={styles.fieldLabel}>Activity</Text>
            <EditableField
              value={block.activity}
              onChange={(activity) =>
                updateTimeBlock(scheduleIndex, blockIndex, { activity })
              }
              editable
            />
          </View>
        </View>
      );
    }

    return (
      <Pressable
        key={blockIndex}
        style={styles.timeBlock}
        onPress={() => {
          if (editable) {
            setEditingScheduleIndex(scheduleIndex);
            setEditingBlockIndex(blockIndex);
          }
        }}
      >
        <View style={styles.timeBlockTime}>
          <Text style={styles.blockTimeText}>
            {block.start_time} – {block.end_time}
          </Text>
        </View>
        <View style={styles.timeBlockContent}>
          <Text style={styles.blockActivity}>{block.activity}</Text>
        </View>
      </Pressable>
    );
  };

  const renderSchedule = (schedule: ScheduleVariant, scheduleIndex: number) => {
    const isEditingTimes = editingScheduleIndex === scheduleIndex && editingBlockIndex === -1;

    return (
      <View key={scheduleIndex} style={styles.card}>
        {schedule.label && (
          <Text style={styles.scheduleLabel}>{schedule.label}</Text>
        )}

        {isEditingTimes && editable ? (
          <View style={styles.timesEditCard}>
            <View style={styles.editHeader}>
              <Text style={styles.editLabel}>Edit Times</Text>
              <Pressable
                style={styles.iconButton}
                onPress={() => {
                  setEditingScheduleIndex(null);
                  setEditingBlockIndex(null);
                }}
              >
                <X size={18} color="#666" />
              </Pressable>
            </View>

            <View style={styles.editFieldRow}>
              <View style={[styles.editField, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Wake Time</Text>
                <EditableField
                  value={schedule.wake_time}
                  onChange={(wake_time) => updateSchedule(scheduleIndex, { wake_time })}
                  type="time"
                  editable
                  mono
                  style={styles.timeEditValue}
                />
              </View>
              <View style={[styles.editField, { flex: 1, marginLeft: 24 }]}>
                <Text style={styles.fieldLabel}>Sleep Time</Text>
                <EditableField
                  value={schedule.sleep_time}
                  onChange={(sleep_time) => updateSchedule(scheduleIndex, { sleep_time })}
                  type="time"
                  editable
                  mono
                  style={styles.timeEditValue}
                />
              </View>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => {
              if (editable) {
                setEditingScheduleIndex(scheduleIndex);
                setEditingBlockIndex(-1);
              }
            }}
          >
            <View style={styles.timesRow}>
              <View style={styles.timeItem}>
                <Text style={styles.timeLabel}>Wake</Text>
                <Text style={styles.timeValue}>{schedule.wake_time}</Text>
              </View>
              <View style={styles.timeItem}>
                <Text style={styles.timeLabel}>Sleep</Text>
                <Text style={styles.timeValue}>{schedule.sleep_time}</Text>
              </View>
            </View>
          </Pressable>
        )}

        <View style={styles.daysRow}>
          {schedule.days.map((day) => (
            <View key={day} style={styles.dayBadge}>
              <Text style={styles.dayText}>{day.slice(0, 3).toUpperCase()}</Text>
            </View>
          ))}
        </View>

        <View style={styles.timeline}>
          {schedule.schedule.map((block, blockIndex) =>
            renderTimeBlock(block, blockIndex, scheduleIndex)
          )}

          {editable && (
            <Pressable
              style={styles.addButton}
              onPress={() => addTimeBlock(scheduleIndex)}
            >
              <Plus size={16} color="#2d5a2d" />
              <Text style={styles.addButtonText}>Add time block</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Schedule</Text>
      {schedules.map(renderSchedule)}
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
  timesEditCard: {
    backgroundColor: '#f9f9f7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  timeEditValue: {
    fontSize: 18,
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
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
  timeline: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  timeBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  timeBlockTime: {
    width: 100,
  },
  blockTimeText: {
    fontSize: 12,
    color: '#666',
    fontVariant: ['tabular-nums'],
  },
  timeBlockContent: {
    flex: 1,
  },
  blockActivity: {
    fontSize: 14,
    color: '#1a2e1a',
  },
  timeBlockEdit: {
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
