import { View, Text, StyleSheet } from 'react-native';
import type { TrainingProgram } from '@protocol/shared/schemas';

type Props = {
  training: TrainingProgram;
};

export function TrainingSection({ training }: Props) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Training</Text>

      <View style={styles.card}>
        {/* Program Header */}
        <View style={styles.programHeader}>
          <Text style={styles.programName}>{training.program_name}</Text>
          <Text style={styles.programDays}>{training.days_per_week} days/week</Text>
        </View>

        {/* Workouts */}
        {training.workouts.map((workout, index) => (
          <View key={index} style={styles.workout}>
            <View style={styles.workoutHeader}>
              <View>
                <Text style={styles.workoutName}>{workout.name}</Text>
                <Text style={styles.workoutDay}>{workout.day}</Text>
              </View>
              <Text style={styles.workoutDuration}>{workout.duration_min} min</Text>
            </View>

            {/* Warmup */}
            <View style={styles.warmupCooldown}>
              <Text style={styles.wcLabel}>Warmup:</Text>
              <Text style={styles.wcText}>{workout.warmup}</Text>
            </View>

            {/* Exercises */}
            <View style={styles.exercises}>
              {workout.exercises.map((exercise, exIndex) => (
                <View key={exIndex} style={styles.exerciseItem}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <View style={styles.exerciseDetails}>
                    {exercise.sets && exercise.reps && (
                      <Text style={styles.exerciseSetsReps}>
                        {exercise.sets} × {exercise.reps}
                      </Text>
                    )}
                    {exercise.duration_min && (
                      <Text style={styles.exerciseSetsReps}>
                        {exercise.duration_min} min
                      </Text>
                    )}
                    {exercise.rest_sec && (
                      <Text style={styles.exerciseRest}>
                        Rest: {exercise.rest_sec}s
                      </Text>
                    )}
                  </View>
                  {exercise.notes && (
                    <Text style={styles.exerciseNotes}>{exercise.notes}</Text>
                  )}
                </View>
              ))}
            </View>

            {/* Cooldown */}
            <View style={styles.warmupCooldown}>
              <Text style={styles.wcLabel}>Cooldown:</Text>
              <Text style={styles.wcText}>{workout.cooldown}</Text>
            </View>
          </View>
        ))}

        {/* Rest Days */}
        {training.rest_days.length > 0 && (
          <View style={styles.restDays}>
            <Text style={styles.restDaysLabel}>Rest Days</Text>
            <Text style={styles.restDaysText}>{training.rest_days.join(', ')}</Text>
          </View>
        )}

        {/* Progression Notes */}
        {training.progression_notes && (
          <View style={styles.progression}>
            <Text style={styles.progressionLabel}>Progression</Text>
            <Text style={styles.progressionText}>{training.progression_notes}</Text>
          </View>
        )}

        {/* General Notes */}
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
  },
  programDays: {
    fontSize: 13,
    color: '#2d5a2d',
    fontWeight: '500',
  },
  workout: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
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
  warmupCooldown: {
    backgroundColor: '#f5f5f0',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
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
    marginBottom: 10,
  },
  exerciseItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  exerciseName: {
    fontSize: 14,
    color: '#1a2e1a',
    marginBottom: 4,
  },
  exerciseDetails: {
    flexDirection: 'row',
    gap: 12,
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
});
