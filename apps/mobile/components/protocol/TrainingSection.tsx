import { View, Text, StyleSheet, Pressable, Modal, ScrollView, Keyboard } from 'react-native';
import { useState, useCallback } from 'react';
import { Plus, Trash2, X, Dumbbell, GripVertical } from 'lucide-react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import type { TrainingProgram, Workout, Exercise } from '@protocol/shared/schemas';
import { EditableField } from './EditableField';

type Props = {
  training: TrainingProgram;
  editable?: boolean;
  onChange?: (training: TrainingProgram) => void;
};

const EMPTY_EXERCISE: Exercise = {
  name: 'New Exercise',
  sets: 3,
  reps: '10',
  duration_min: null,
  rest_sec: 60,
  notes: null,
};

const EMPTY_WORKOUT: Workout = {
  name: 'New Workout',
  day: 'Day 1',
  time: '06:00',
  duration_min: 45,
  exercises: [],
};

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
    const newWorkouts = [...training.workouts, { ...EMPTY_WORKOUT }];
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
              <X size={18} color="#666" />
            </Pressable>
          </View>

          <View style={styles.editField}>
            <Text style={styles.fieldLabel}>Program Name</Text>
            <EditableField
              value={training.program_name}
              onChange={(program_name) => updateTraining({ program_name })}
              editable
            />
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
        <Text style={styles.programName}>{training.program_name}</Text>
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
              <GripVertical size={16} color="#999" />
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
        {/* Workout header - tappable to edit */}
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
            <Text style={styles.workoutName}>{workout.name}</Text>
            <Text style={styles.workoutDay}>{workout.day}</Text>
          </View>
          <View style={styles.workoutHeaderRight}>
            <Text style={styles.workoutDuration}>{workout.duration_min} min</Text>
            <Text style={styles.workoutTime}>{workout.time}</Text>
          </View>
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
              <Plus size={14} color="#2d5a2d" />
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
                  {workout.day}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {renderSelectedWorkout()}

        {editable && (
          <Pressable style={styles.addButton} onPress={addWorkout}>
            <Plus size={16} color="#2d5a2d" />
            <Text style={styles.addButtonText}>Add workout</Text>
          </Pressable>
        )}

        {training.rest_days.length > 0 && (
          <View style={styles.restDays}>
            <Text style={styles.restDaysLabel}>Rest Days</Text>
            <Text style={styles.restDaysText}>{training.rest_days.join(', ')}</Text>
          </View>
        )}

        {training.progression_notes && (
          <View style={styles.progression}>
            <Text style={styles.progressionLabel}>Progression</Text>
            <Text style={styles.progressionText}>{training.progression_notes}</Text>
          </View>
        )}

        {training.general_notes.length > 0 && (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>Notes</Text>
            {training.general_notes.map((note, index) => (
              <Text key={index} style={styles.noteItem}>
                • {note}
              </Text>
            ))}
          </View>
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
                    <Dumbbell size={16} color="#d97706" />
                    <Text style={styles.modalTitle}>{editingWorkout.name}</Text>
                  </View>
                  <Pressable
                    style={styles.modalCloseButton}
                    onPress={() => {
                      setEditingWorkoutIndex(null);
                      setEditingExerciseIndex(null);
                    }}
                  >
                    <X size={20} color="#666" />
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

                  <View style={styles.modalFieldRow}>
                    <View style={[styles.modalField, { flex: 1 }]}>
                      <Text style={styles.modalFieldLabel}>Day</Text>
                      <EditableField
                        value={editingWorkout.day}
                        onChange={(day) => updateWorkout(editingWorkoutIndex, { day })}
                        editable
                        style={styles.modalFieldInput}
                      />
                    </View>
                    <View style={[styles.modalField, { flex: 1, marginLeft: 12 }]}>
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
                </View>

                <Pressable
                  style={styles.modalDeleteButton}
                  onPress={() => removeWorkout(editingWorkoutIndex)}
                >
                  <Trash2 size={16} color="#c62828" />
                  <Text style={styles.modalDeleteText}>Delete workout</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Edit Exercise Modal */}
      <Modal
        visible={editingExercise !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingExerciseIndex(null)}
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
                    <Dumbbell size={16} color="#d97706" />
                    <Text style={styles.modalTitle}>{editingExercise.name}</Text>
                  </View>
                  <Pressable
                    style={styles.modalCloseButton}
                    onPress={() => setEditingExerciseIndex(null)}
                  >
                    <X size={20} color="#666" />
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
                  <Trash2 size={16} color="#c62828" />
                  <Text style={styles.modalDeleteText}>Delete exercise</Text>
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#2d5a2d',
  },
  programHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  programName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a2e1a',
    flex: 1,
  },
  programDays: {
    fontSize: 13,
    color: '#2d5a2d',
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  programHeaderEdit: {
    backgroundColor: '#f9f9f7',
    borderRadius: 8,
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
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  workoutChipActive: {
    backgroundColor: '#2d5a2d',
  },
  workoutChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  workoutChipTextActive: {
    color: '#fff',
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
  workoutName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a2e1a',
  },
  workoutDay: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  workoutDuration: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  workoutTime: {
    fontSize: 12,
    color: '#888',
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
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    backgroundColor: '#fff',
  },
  exerciseRowDragging: {
    backgroundColor: '#f9f9f7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dragHandle: {
    paddingRight: 8,
    paddingLeft: 2,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a2e1a',
    flex: 1,
    marginRight: 12,
  },
  exerciseNameWithHandle: {
    marginLeft: 0,
  },
  exerciseData: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    color: '#666',
    textAlign: 'right',
  },

  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },

  // Rest days, progression, notes
  restDays: {
    marginBottom: 12,
  },
  restDaysLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  restDaysText: {
    fontSize: 13,
    color: '#444',
  },
  progression: {
    marginBottom: 12,
  },
  progressionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  progressionText: {
    fontSize: 13,
    color: '#444',
  },
  notes: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  notesTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  noteItem: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
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
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
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
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
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
