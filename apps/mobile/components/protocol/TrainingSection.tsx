import { View, Text, StyleSheet, Pressable, Modal, ScrollView, Keyboard, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Plus, Trash2, X, Dumbbell, GripVertical } from 'lucide-react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import type { TrainingProgram, Workout, Exercise } from '@protocol/shared/schemas';
import { colors } from '@/lib/theme';
import { EditableField } from './EditableField';

type Props = {
  training: TrainingProgram;
  editable?: boolean;
  onChange?: (training: TrainingProgram) => void;
};

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
type Weekday = (typeof WEEKDAYS)[number];
const WEEKDAY_SHORT: Record<Weekday, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

/** Parse a day string that may contain multiple days ("Monday/Thursday", "mon, thu") into an ordered list of weekdays. */
function parseDays(dayStr: string): Weekday[] {
  if (!dayStr) return [];
  const tokens = dayStr
    .toLowerCase()
    .split(/[\/,&]|\s+and\s+|\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const out: Weekday[] = [];
  for (const tok of tokens) {
    const match = WEEKDAYS.find((d) => d === tok || d.startsWith(tok) || tok.startsWith(d.slice(0, 3)));
    if (match && !out.includes(match)) out.push(match);
  }
  return out;
}

function formatDay(day: string): string {
  const parsed = parseDays(day);
  if (parsed.length === 0) return day;
  return parsed.map((d) => WEEKDAY_SHORT[d]).join(' / ');
}

function pickNextAvailableDay(usedDays: string[]): Weekday {
  const used = new Set(usedDays.flatMap((d) => parseDays(d)));
  return WEEKDAYS.find((d) => !used.has(d)) ?? 'monday';
}

const EMPTY_EXERCISE: Exercise = {
  name: '',
  sets: 3,
  reps: '10',
  duration_min: null,
  rest_sec: 60,
  notes: null,
};

const createEmptyWorkout = (day: Weekday): Workout => ({
  name: '',
  day,
  time: '06:00',
  duration_min: 45,
  exercises: [],
});

// Format exercise data as "3 x 10 · 60s" or "45 min"
const formatExerciseData = (exercise: Exercise): string => {
  const parts: string[] = [];

  if (exercise.duration_min && !exercise.sets) {
    return `${exercise.duration_min} min`;
  }

  if (exercise.sets && exercise.reps) {
    parts.push(`${exercise.sets} x ${exercise.reps}`);
  }

  if (exercise.rest_sec) {
    parts.push(`${exercise.rest_sec}s`);
  }

  return parts.join(' · ');
};

export function TrainingSection({
  training,
  editable = false,
  onChange,
}: Props) {
  const [editingProgramHeader, setEditingProgramHeader] = useState(false);
  const [selectedWorkoutIndex, setSelectedWorkoutIndex] = useState(0);
  const [editingWorkoutIndex, setEditingWorkoutIndex] = useState<number | null>(null);
  const [editingExerciseIndex, setEditingExerciseIndex] = useState<number | null>(null);
  const didSplitCombinedRef = useRef(false);

  // Split any combined-day workouts ("Monday/Thursday") into separate entries.
  // Runs once per training object reference when editable.
  useEffect(() => {
    if (!editable || !onChange || didSplitCombinedRef.current) return;
    const needsSplit = training.workouts.some((w) => parseDays(w.day).length > 1);
    if (!needsSplit) return;
    const expanded: Workout[] = [];
    for (const w of training.workouts) {
      const days = parseDays(w.day);
      if (days.length <= 1) {
        expanded.push(w);
        continue;
      }
      // Preserve the first one's id; clone for additional days without id so a new id is assigned downstream.
      days.forEach((d, i) => {
        expanded.push({ ...w, id: i === 0 ? w.id : undefined, day: d });
      });
    }
    didSplitCombinedRef.current = true;
    onChange({ ...training, workouts: expanded });
  }, [editable, onChange, training]);

  const updateTraining = useCallback(
    (updates: Partial<TrainingProgram>) => {
      onChange?.({ ...training, ...updates });
    },
    [training, onChange]
  );

  const updateWorkout = useCallback(
    (workoutIndex: number, updates: Partial<Workout>) => {
      const newWorkouts = [...training.workouts];
      newWorkouts[workoutIndex] = { ...newWorkouts[workoutIndex], ...updates };
      onChange?.({ ...training, workouts: newWorkouts });
    },
    [training, onChange]
  );

  const updateExercise = useCallback(
    (workoutIndex: number, exerciseIndex: number, updates: Partial<Exercise>) => {
      const newWorkouts = [...training.workouts];
      const newExercises = [...newWorkouts[workoutIndex].exercises];
      newExercises[exerciseIndex] = { ...newExercises[exerciseIndex], ...updates };
      newWorkouts[workoutIndex] = { ...newWorkouts[workoutIndex], exercises: newExercises };
      onChange?.({ ...training, workouts: newWorkouts });
    },
    [training, onChange]
  );

  const addWorkout = useCallback(() => {
    const nextDay = pickNextAvailableDay(training.workouts.map((w) => w.day));
    const newWorkouts = [...training.workouts, createEmptyWorkout(nextDay)];
    onChange?.({ ...training, workouts: newWorkouts });
    setSelectedWorkoutIndex(newWorkouts.length - 1);
    setEditingWorkoutIndex(newWorkouts.length - 1);
  }, [training, onChange]);

  const removeWorkout = useCallback(
    (workoutIndex: number) => {
      const newWorkouts = training.workouts.filter((_, i) => i !== workoutIndex);
      onChange?.({ ...training, workouts: newWorkouts });
      setEditingWorkoutIndex(null);
      // Select the previous workout or first one if available
      if (newWorkouts.length > 0) {
        setSelectedWorkoutIndex(Math.min(workoutIndex, newWorkouts.length - 1));
      }
    },
    [training, onChange]
  );

  const addExercise = useCallback(
    (workoutIndex: number) => {
      const newWorkouts = [...training.workouts];
      const newExercises = [...newWorkouts[workoutIndex].exercises, { ...EMPTY_EXERCISE }];
      newWorkouts[workoutIndex] = { ...newWorkouts[workoutIndex], exercises: newExercises };
      onChange?.({ ...training, workouts: newWorkouts });
      setEditingWorkoutIndex(workoutIndex);
      setEditingExerciseIndex(newExercises.length - 1);
    },
    [training, onChange]
  );

  const removeExercise = useCallback(
    (workoutIndex: number, exerciseIndex: number) => {
      const newWorkouts = [...training.workouts];
      const newExercises = newWorkouts[workoutIndex].exercises.filter(
        (_, i) => i !== exerciseIndex
      );
      newWorkouts[workoutIndex] = { ...newWorkouts[workoutIndex], exercises: newExercises };
      onChange?.({ ...training, workouts: newWorkouts });
      setEditingExerciseIndex(null);
    },
    [training, onChange]
  );

  const handleDragEnd = useCallback(
    (workoutIndex: number, data: Exercise[]) => {
      const newWorkouts = [...training.workouts];
      newWorkouts[workoutIndex] = { ...newWorkouts[workoutIndex], exercises: data };
      onChange?.({ ...training, workouts: newWorkouts });
    },
    [training, onChange]
  );

  const renderProgramHeader = () => {
    if (editingProgramHeader && editable) {
      return (
        <View style={styles.programHeaderEdit}>
          <View style={styles.editHeader}>
            <Text style={styles.editLabel}>Edit Program</Text>
            <Pressable
              style={styles.iconButton}
              onPress={() => setEditingProgramHeader(false)}
            >
              <X size={18} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>

          <View style={styles.editField}>
            <Text style={styles.fieldLabel}>Days per Week</Text>
            <EditableField
              value={String(training.days_per_week)}
              onChange={(v) => updateTraining({ days_per_week: parseInt(v) || 1 })}
              type="number"
              editable
              mono
            />
          </View>
        </View>
      );
    }

    return (
      <Pressable
        style={styles.programHeader}
        onPress={() => editable && setEditingProgramHeader(true)}
      >
        <Text style={styles.programDays}>{training.days_per_week} days/week</Text>
      </Pressable>
    );
  };

  const renderExerciseItem = ({ item, drag, isActive, getIndex }: RenderItemParams<Exercise>) => {
    const exerciseIndex = getIndex() ?? 0;
    const exerciseData = formatExerciseData(item);

    return (
      <ScaleDecorator>
        <Pressable
          style={[
            styles.exerciseRow,
            isActive && styles.exerciseRowDragging,
          ]}
          onPress={() => {
            if (editable) {
              setEditingWorkoutIndex(selectedWorkoutIndex);
              setEditingExerciseIndex(exerciseIndex);
            }
          }}
          onLongPress={editable ? drag : undefined}
          delayLongPress={150}
        >
          {editable && (
            <View style={styles.dragHandle}>
              <GripVertical size={16} color={colors.onSurfaceVariant} />
            </View>
          )}
          <Text style={[styles.exerciseName, editable && styles.exerciseNameWithHandle]} numberOfLines={1}>
            {item.name}
          </Text>
          {exerciseData && <Text style={styles.exerciseData}>{exerciseData}</Text>}
        </Pressable>
      </ScaleDecorator>
    );
  };

  // Get the currently editing exercise
  const editingExercise = editingWorkoutIndex !== null && editingExerciseIndex !== null && editingExerciseIndex >= 0
    ? training.workouts[editingWorkoutIndex]?.exercises[editingExerciseIndex]
    : null;

  const renderSelectedWorkout = () => {
    if (training.workouts.length === 0) {
      return null;
    }

    const workout = training.workouts[selectedWorkoutIndex];
    if (!workout) return null;

    return (
      <View style={styles.workoutContent}>
        {/* Workout header - tappable to edit, trash icon deletes directly */}
        <Pressable
          style={styles.workoutHeader}
          onPress={() => {
            if (editable) {
              setEditingWorkoutIndex(selectedWorkoutIndex);
              setEditingExerciseIndex(-1);
            }
          }}
        >
          <View style={styles.workoutHeaderLeft}>
            <Text style={styles.workoutName}>{workout.name || 'Untitled workout'}</Text>
            <Text style={styles.workoutDay}>{formatDay(workout.day)}</Text>
          </View>
          <View style={styles.workoutHeaderRight}>
            <Text style={styles.workoutDuration}>{workout.duration_min} min</Text>
            <Text style={styles.workoutTime}>{workout.time}</Text>
          </View>
          {editable && (
            <Pressable
              hitSlop={10}
              style={styles.workoutHeaderDelete}
              onPress={(e) => {
                e.stopPropagation?.();
                const dayLabel = formatDay(workout.day) || 'this day';
                Alert.alert(
                  'Delete training day',
                  `Remove ${dayLabel}${workout.name ? ` (${workout.name})` : ''} from the program?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => removeWorkout(selectedWorkoutIndex),
                    },
                  ],
                );
              }}
            >
              <Trash2 size={16} color={colors.destructive} />
            </Pressable>
          )}
        </Pressable>

        {/* Exercises - draggable list */}
        <View style={styles.exercisesList}>
          <DraggableFlatList
            data={workout.exercises}
            keyExtractor={(_, index) => `exercise-${index}`}
            renderItem={renderExerciseItem}
            onDragEnd={({ data }) => handleDragEnd(selectedWorkoutIndex, data)}
            scrollEnabled={false}
          />

          {editable && (
            <Pressable
              style={styles.addExerciseButton}
              onPress={() => addExercise(selectedWorkoutIndex)}
            >
              <Plus size={14} color={colors.primaryContainer} />
              <Text style={styles.addButtonText}>Add exercise</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  // Get the currently editing workout (for workout header modal)
  const editingWorkout = editingWorkoutIndex !== null && editingExerciseIndex === -1
    ? training.workouts[editingWorkoutIndex]
    : null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Training</Text>

      <View style={styles.card}>
        {renderProgramHeader()}

        {/* Workout selector chips */}
        {training.workouts.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.workoutSelector}
            contentContainerStyle={styles.workoutSelectorContent}
          >
            {training.workouts.map((workout, index) => (
              <Pressable
                key={index}
                style={[
                  styles.workoutChip,
                  selectedWorkoutIndex === index && styles.workoutChipActive,
                ]}
                onPress={() => setSelectedWorkoutIndex(index)}
              >
                <Text
                  style={[
                    styles.workoutChipText,
                    selectedWorkoutIndex === index && styles.workoutChipTextActive,
                  ]}
                >
                  {formatDay(workout.day)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {renderSelectedWorkout()}

        {editable && (
          <Pressable
            style={[styles.addButton, training.workouts.length >= 7 && styles.addButtonDisabled]}
            onPress={training.workouts.length >= 7 ? undefined : addWorkout}
            disabled={training.workouts.length >= 7}
          >
            <Plus size={16} color={colors.primaryContainer} />
            <Text style={styles.addButtonText}>
              {training.workouts.length >= 7 ? 'All 7 days assigned' : 'Add training day'}
            </Text>
          </Pressable>
        )}

      </View>

      {/* Edit Workout Modal */}
      <Modal
        visible={editingWorkout !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setEditingWorkoutIndex(null);
          setEditingExerciseIndex(null);
        }}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => {
              Keyboard.dismiss();
              setEditingWorkoutIndex(null);
              setEditingExerciseIndex(null);
            }}
          >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {editingWorkout && editingWorkoutIndex !== null && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderLeft}>
                    <Dumbbell size={16} color={colors.warning} />
                    <Text style={styles.modalTitle}>{editingWorkout.name}</Text>
                  </View>
                  <Pressable
                    style={styles.modalCloseButton}
                    onPress={() => {
                      setEditingWorkoutIndex(null);
                      setEditingExerciseIndex(null);
                    }}
                  >
                    <X size={20} color={colors.onSurfaceVariant} />
                  </Pressable>
                </View>

                <View style={styles.modalBody}>
                  <View style={styles.modalFieldRow}>
                    <View style={[styles.modalField, { flex: 2 }]}>
                      <Text style={styles.modalFieldLabel}>Name</Text>
                      <EditableField
                        value={editingWorkout.name}
                        onChange={(name) => updateWorkout(editingWorkoutIndex, { name })}
                        editable
                        style={styles.modalFieldInput}
                      />
                    </View>
                    <View style={[styles.modalField, { flex: 1, marginLeft: 12 }]}>
                      <Text style={styles.modalFieldLabel}>Duration</Text>
                      <EditableField
                        value={String(editingWorkout.duration_min)}
                        onChange={(v) => updateWorkout(editingWorkoutIndex, { duration_min: parseInt(v) || 0 })}
                        type="number"
                        editable
                        mono
                        style={styles.modalFieldInput}
                      />
                    </View>
                  </View>

                  <View style={styles.modalField}>
                    <Text style={styles.modalFieldLabel}>Day</Text>
                    <View style={styles.dayPicker}>
                      {WEEKDAYS.map((d) => {
                        const selected = parseDays(editingWorkout.day)[0] === d;
                        const usedByOther = training.workouts.some(
                          (w, idx) => idx !== editingWorkoutIndex && parseDays(w.day).includes(d),
                        );
                        return (
                          <Pressable
                            key={d}
                            onPress={() => updateWorkout(editingWorkoutIndex, { day: d })}
                            style={[
                              styles.dayChip,
                              selected && styles.dayChipSelected,
                              usedByOther && !selected && styles.dayChipUsed,
                            ]}
                          >
                            <Text
                              style={[
                                styles.dayChipText,
                                selected && styles.dayChipTextSelected,
                                usedByOther && !selected && styles.dayChipTextUsed,
                              ]}
                            >
                              {WEEKDAY_SHORT[d]}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.modalField}>
                    <Text style={styles.modalFieldLabel}>Time</Text>
                    <EditableField
                      value={editingWorkout.time}
                      onChange={(time) => updateWorkout(editingWorkoutIndex, { time })}
                      type="time"
                      editable
                      mono
                      style={styles.modalFieldInput}
                    />
                  </View>
                </View>

                <Pressable
                  style={styles.modalDeleteButton}
                  onPress={() => removeWorkout(editingWorkoutIndex)}
                >
                  <Trash2 size={16} color={colors.destructive} />
                  <Text style={styles.modalDeleteText}>Delete workout</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
      </Modal>

      {/* Edit Exercise Modal */}
      <Modal
        visible={editingExercise !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingExerciseIndex(null)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => {
              Keyboard.dismiss();
              setEditingExerciseIndex(null);
            }}
          >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {editingExercise && editingWorkoutIndex !== null && editingExerciseIndex !== null && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderLeft}>
                    <Dumbbell size={16} color={colors.warning} />
                    <Text style={styles.modalTitle}>{editingExercise.name}</Text>
                  </View>
                  <Pressable
                    style={styles.modalCloseButton}
                    onPress={() => setEditingExerciseIndex(null)}
                  >
                    <X size={20} color={colors.onSurfaceVariant} />
                  </Pressable>
                </View>

                <View style={styles.modalBody}>
                  <View style={styles.modalField}>
                    <Text style={styles.modalFieldLabel}>Name</Text>
                    <EditableField
                      value={editingExercise.name}
                      onChange={(name) => updateExercise(editingWorkoutIndex, editingExerciseIndex, { name })}
                      editable
                      style={styles.modalFieldInput}
                    />
                  </View>

                  <View style={styles.modalFieldRow}>
                    <View style={[styles.modalField, { flex: 1 }]}>
                      <Text style={styles.modalFieldLabel}>Sets</Text>
                      <EditableField
                        value={editingExercise.sets ? String(editingExercise.sets) : ''}
                        onChange={(v) => updateExercise(editingWorkoutIndex, editingExerciseIndex, { sets: v ? parseInt(v) : null })}
                        type="number"
                        editable
                        mono
                        placeholder="—"
                        style={styles.modalFieldInput}
                      />
                    </View>
                    <View style={[styles.modalField, { flex: 1, marginLeft: 12 }]}>
                      <Text style={styles.modalFieldLabel}>Reps</Text>
                      <EditableField
                        value={editingExercise.reps || ''}
                        onChange={(reps) => updateExercise(editingWorkoutIndex, editingExerciseIndex, { reps: reps || null })}
                        editable
                        mono
                        placeholder="—"
                        style={styles.modalFieldInput}
                      />
                    </View>
                    <View style={[styles.modalField, { flex: 1, marginLeft: 12 }]}>
                      <Text style={styles.modalFieldLabel}>Rest (s)</Text>
                      <EditableField
                        value={editingExercise.rest_sec ? String(editingExercise.rest_sec) : ''}
                        onChange={(v) => updateExercise(editingWorkoutIndex, editingExerciseIndex, { rest_sec: v ? parseInt(v) : null })}
                        type="number"
                        editable
                        mono
                        placeholder="—"
                        style={styles.modalFieldInput}
                      />
                    </View>
                  </View>

                  <View style={styles.modalField}>
                    <Text style={styles.modalFieldLabel}>Duration (min)</Text>
                    <EditableField
                      value={editingExercise.duration_min ? String(editingExercise.duration_min) : ''}
                      onChange={(v) => updateExercise(editingWorkoutIndex, editingExerciseIndex, { duration_min: v ? parseInt(v) : null })}
                      type="number"
                      editable
                      mono
                      placeholder="—"
                      style={styles.modalFieldInput}
                    />
                  </View>

                  <View style={styles.modalField}>
                    <Text style={styles.modalFieldLabel}>Notes</Text>
                    <EditableField
                      value={editingExercise.notes || ''}
                      onChange={(notes) => updateExercise(editingWorkoutIndex, editingExerciseIndex, { notes: notes || null })}
                      editable
                      placeholder="Optional"
                      style={styles.modalFieldInput}
                    />
                  </View>
                </View>

                <Pressable
                  style={styles.modalDeleteButton}
                  onPress={() => removeExercise(editingWorkoutIndex, editingExerciseIndex)}
                >
                  <Trash2 size={16} color={colors.destructive} />
                  <Text style={styles.modalDeleteText}>Delete exercise</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
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
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 0,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: colors.primaryContainer,
  },
  programHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
  },
  programDays: {
    fontSize: 13,
    color: colors.primaryContainer,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  programHeaderEdit: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 0,
    padding: 12,
    marginBottom: 16,
  },

  // Workout selector chips
  workoutSelector: {
    marginBottom: 12,
    marginHorizontal: -4,
  },
  workoutSelectorContent: {
    paddingHorizontal: 4,
    gap: 8,
  },
  workoutChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 0,
    backgroundColor: colors.surfaceContainerLow,
  },
  workoutChipActive: {
    backgroundColor: colors.primaryContainer,
  },
  workoutChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  workoutChipTextActive: {
    color: colors.surfaceContainerLowest,
  },

  // Selected workout content
  workoutContent: {
    marginBottom: 16,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  workoutHeaderLeft: {
    flex: 1,
  },
  workoutHeaderRight: {
    alignItems: 'flex-end',
  },
  workoutHeaderDelete: {
    marginLeft: 12,
    padding: 6,
    alignSelf: 'center',
  },
  workoutName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.onSurface,
  },
  workoutDay: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  workoutDuration: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  workoutTime: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },

  // Exercise list
  exercisesList: {
    marginTop: 4,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    minHeight: 44,
    backgroundColor: colors.surfaceContainerLowest,
  },
  exerciseRowDragging: {
    backgroundColor: colors.surfaceContainerLow,
  },
  dragHandle: {
    paddingRight: 8,
    paddingLeft: 2,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.onSurface,
    flex: 1,
    marginRight: 12,
  },
  exerciseNameWithHandle: {
    marginLeft: 0,
  },
  exerciseData: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    color: colors.onSurfaceVariant,
    textAlign: 'right',
  },

  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },

  // Edit header
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryContainer,
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
    color: colors.onSurfaceVariant,
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
  addButtonDisabled: {
    opacity: 0.4,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primaryContainer,
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
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 0,
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
    color: colors.onSurface,
    flex: 1,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    gap: 12,
  },
  modalFieldRow: {
    flexDirection: 'row',
  },
  modalField: {
    marginBottom: 4,
  },
  modalFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  modalFieldInput: {
    fontSize: 16,
    backgroundColor: colors.surface,
    borderRadius: 0,
    padding: 12,
  },
  dayPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dayChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
    minWidth: 44,
    alignItems: 'center',
  },
  dayChipSelected: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primaryContainer,
  },
  dayChipUsed: {
    opacity: 0.4,
  },
  dayChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  dayChipTextSelected: {
    color: colors.surfaceContainerLowest,
    fontWeight: '600',
  },
  dayChipTextUsed: {
    color: colors.onSurfaceVariant,
  },
  modalDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 12,
  },
  modalDeleteText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.destructive,
  },
});
