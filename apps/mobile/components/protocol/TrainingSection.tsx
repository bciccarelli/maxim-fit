import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useState, useCallback } from 'react';
import { Plus, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react-native';
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
  duration_min: 45,
  exercises: [{ ...EMPTY_EXERCISE }],
  warmup: '5 min cardio',
  cooldown: '5 min stretching',
};

export function TrainingSection({
  training,
  editable = false,
  onChange,
}: Props) {
  const [editingProgramHeader, setEditingProgramHeader] = useState(false);
  const [expandedWorkoutIndex, setExpandedWorkoutIndex] = useState<number | null>(0);
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
    setExpandedWorkoutIndex(newWorkouts.length - 1);
    setEditingWorkoutIndex(newWorkouts.length - 1);
  }, [training, onChange]);

  const removeWorkout = useCallback(
    (workoutIndex: number) => {
      const newWorkouts = training.workouts.filter((_, i) => i !== workoutIndex);
      onChange?.({ ...training, workouts: newWorkouts });
      setEditingWorkoutIndex(null);
      setExpandedWorkoutIndex(null);
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

  const renderExercise = (
    exercise: Exercise,
    exerciseIndex: number,
    workoutIndex: number
  ) => {
    const isEditing =
      editingWorkoutIndex === workoutIndex && editingExerciseIndex === exerciseIndex;

    if (isEditing && editable) {
      return (
        <View key={exerciseIndex} style={styles.exerciseEdit}>
          <View style={styles.editHeader}>
            <Text style={styles.editLabel}>Edit Exercise</Text>
            <View style={styles.editActions}>
              <Pressable
                style={styles.iconButton}
                onPress={() => removeExercise(workoutIndex, exerciseIndex)}
              >
                <Trash2 size={18} color="#c62828" />
              </Pressable>
              <Pressable
                style={styles.iconButton}
                onPress={() => setEditingExerciseIndex(null)}
              >
                <X size={18} color="#666" />
              </Pressable>
            </View>
          </View>

          <View style={styles.editField}>
            <Text style={styles.fieldLabel}>Name</Text>
            <EditableField
              value={exercise.name}
              onChange={(name) => updateExercise(workoutIndex, exerciseIndex, { name })}
              editable
            />
          </View>

          <View style={styles.editFieldRow}>
            <View style={[styles.editField, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Sets</Text>
              <EditableField
                value={exercise.sets ? String(exercise.sets) : ''}
                onChange={(v) =>
                  updateExercise(workoutIndex, exerciseIndex, {
                    sets: v ? parseInt(v) : null,
                  })
                }
                type="number"
                editable
                mono
                placeholder="—"
              />
            </View>
            <View style={[styles.editField, { flex: 1, marginLeft: 12 }]}>
              <Text style={styles.fieldLabel}>Reps</Text>
              <EditableField
                value={exercise.reps || ''}
                onChange={(reps) =>
                  updateExercise(workoutIndex, exerciseIndex, { reps: reps || null })
                }
                editable
                mono
                placeholder="—"
              />
            </View>
            <View style={[styles.editField, { flex: 1, marginLeft: 12 }]}>
              <Text style={styles.fieldLabel}>Rest (s)</Text>
              <EditableField
                value={exercise.rest_sec ? String(exercise.rest_sec) : ''}
                onChange={(v) =>
                  updateExercise(workoutIndex, exerciseIndex, {
                    rest_sec: v ? parseInt(v) : null,
                  })
                }
                type="number"
                editable
                mono
                placeholder="—"
              />
            </View>
          </View>
        </View>
      );
    }

    return (
      <Pressable
        key={exerciseIndex}
        style={styles.exerciseItem}
        onPress={() => {
          if (editable) {
            setEditingWorkoutIndex(workoutIndex);
            setEditingExerciseIndex(exerciseIndex);
          }
        }}
      >
        <View style={styles.exerciseRow}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
        </View>
        <View style={styles.exerciseDetails}>
          {exercise.sets && exercise.reps && (
            <Text style={styles.exerciseSetsReps}>
              {exercise.sets} × {exercise.reps}
            </Text>
          )}
          {exercise.duration_min && (
            <Text style={styles.exerciseSetsReps}>{exercise.duration_min} min</Text>
          )}
          {exercise.rest_sec && (
            <Text style={styles.exerciseRest}>Rest: {exercise.rest_sec}s</Text>
          )}
        </View>
        {exercise.notes && <Text style={styles.exerciseNotes}>{exercise.notes}</Text>}
      </Pressable>
    );
  };

  const renderWorkout = (workout: Workout, workoutIndex: number) => {
    const isExpanded = expandedWorkoutIndex === workoutIndex;
    const isEditingHeader = editingWorkoutIndex === workoutIndex && editingExerciseIndex === -1;

    const toggleExpand = () => {
      setExpandedWorkoutIndex(isExpanded ? null : workoutIndex);
      setEditingWorkoutIndex(null);
      setEditingExerciseIndex(null);
    };

    return (
      <View key={workoutIndex} style={styles.workout}>
        <Pressable style={styles.workoutHeader} onPress={toggleExpand}>
          <View style={styles.workoutHeaderLeft}>
            <Text style={styles.workoutName}>{workout.name}</Text>
            <Text style={styles.workoutDay}>{workout.day}</Text>
          </View>
          <View style={styles.workoutHeaderRight}>
            <Text style={styles.workoutDuration}>{workout.duration_min} min</Text>
            {isExpanded ? (
              <ChevronUp size={20} color="#666" />
            ) : (
              <ChevronDown size={20} color="#666" />
            )}
          </View>
        </Pressable>

        {isExpanded && (
          <>
            {isEditingHeader && editable ? (
              <View style={styles.workoutEditCard}>
                <View style={styles.editHeader}>
                  <Text style={styles.editLabel}>Edit Workout</Text>
                  <View style={styles.editActions}>
                    <Pressable
                      style={styles.iconButton}
                      onPress={() => removeWorkout(workoutIndex)}
                    >
                      <Trash2 size={18} color="#c62828" />
                    </Pressable>
                    <Pressable
                      style={styles.iconButton}
                      onPress={() => setEditingWorkoutIndex(null)}
                    >
                      <X size={18} color="#666" />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.editFieldRow}>
                  <View style={[styles.editField, { flex: 2 }]}>
                    <Text style={styles.fieldLabel}>Name</Text>
                    <EditableField
                      value={workout.name}
                      onChange={(name) => updateWorkout(workoutIndex, { name })}
                      editable
                    />
                  </View>
                  <View style={[styles.editField, { flex: 1, marginLeft: 12 }]}>
                    <Text style={styles.fieldLabel}>Duration</Text>
                    <EditableField
                      value={String(workout.duration_min)}
                      onChange={(v) =>
                        updateWorkout(workoutIndex, { duration_min: parseInt(v) || 0 })
                      }
                      type="number"
                      editable
                      mono
                    />
                  </View>
                </View>

                <View style={styles.editField}>
                  <Text style={styles.fieldLabel}>Day</Text>
                  <EditableField
                    value={workout.day}
                    onChange={(day) => updateWorkout(workoutIndex, { day })}
                    editable
                  />
                </View>
              </View>
            ) : null}

            <View style={styles.warmupCooldown}>
              <Text style={styles.wcLabel}>Warmup:</Text>
              <Text style={styles.wcText}>{workout.warmup}</Text>
            </View>

            <View style={styles.exercises}>
              {workout.exercises.map((exercise, exIndex) =>
                renderExercise(exercise, exIndex, workoutIndex)
              )}

              {editable && (
                <Pressable
                  style={styles.addExerciseButton}
                  onPress={() => addExercise(workoutIndex)}
                >
                  <Plus size={14} color="#2d5a2d" />
                  <Text style={styles.addButtonText}>Add exercise</Text>
                </Pressable>
              )}
            </View>

            <View style={styles.warmupCooldown}>
              <Text style={styles.wcLabel}>Cooldown:</Text>
              <Text style={styles.wcText}>{workout.cooldown}</Text>
            </View>
          </>
        )}
      </View>
    );
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Training</Text>

      <View style={styles.card}>
        {renderProgramHeader()}

        {training.workouts.map(renderWorkout)}

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
    marginBottom: 16,
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
  },
  programHeaderEdit: {
    backgroundColor: '#f9f9f7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  workout: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  workoutHeaderLeft: {
    flex: 1,
  },
  workoutHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    fontVariant: ['tabular-nums'],
  },
  workoutEditCard: {
    backgroundColor: '#f9f9f7',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
  },
  warmupCooldown: {
    backgroundColor: '#f5f5f0',
    padding: 10,
    borderRadius: 6,
    marginTop: 12,
  },
  wcLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  wcText: {
    fontSize: 13,
    color: '#444',
  },
  exercises: {
    marginTop: 12,
  },
  exerciseItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseName: {
    fontSize: 14,
    color: '#1a2e1a',
    flex: 1,
  },
  exerciseDetails: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  exerciseSetsReps: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2d5a2d',
    fontVariant: ['tabular-nums'],
  },
  exerciseRest: {
    fontSize: 12,
    color: '#888',
  },
  exerciseNotes: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  exerciseEdit: {
    backgroundColor: '#f9f9f7',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
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
});
