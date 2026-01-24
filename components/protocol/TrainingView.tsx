'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dumbbell, Calendar } from 'lucide-react';
import type { TrainingProgram } from '@/lib/schemas/protocol';

interface TrainingViewProps {
  training: TrainingProgram;
}

export function TrainingView({ training }: TrainingViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5" />
          Training Program
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Program Overview */}
        <div className="p-4 rounded-lg bg-muted mb-6">
          <h3 className="font-semibold text-lg">{training.program_name}</h3>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{training.days_per_week} days/week</span>
            </div>
            <span>Rest: {training.rest_days.join(', ')}</span>
          </div>
        </div>

        {/* Workouts */}
        <div className="space-y-6">
          {training.workouts.map((workout, index) => (
            <div key={index} className="border rounded-lg overflow-hidden">
              <div className="p-4 bg-muted/50 flex items-center justify-between">
                <div>
                  <p className="font-medium">{workout.name}</p>
                  <p className="text-sm text-muted-foreground">{workout.day}</p>
                </div>
                <span className="text-sm text-muted-foreground">{workout.duration_min} min</span>
              </div>

              <div className="p-4 space-y-4">
                {/* Warmup */}
                <div className="text-sm">
                  <span className="font-medium text-yellow-600">Warmup:</span>{' '}
                  <span className="text-muted-foreground">{workout.warmup}</span>
                </div>

                {/* Exercises */}
                <div className="space-y-2">
                  {workout.exercises.map((exercise, i) => (
                    <div
                      key={i}
                      className="flex items-start justify-between p-3 rounded-lg bg-muted/30"
                    >
                      <div>
                        <p className="font-medium text-sm">{exercise.name}</p>
                        {exercise.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{exercise.notes}</p>
                        )}
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        {exercise.sets && exercise.reps && (
                          <p>{exercise.sets} x {exercise.reps}</p>
                        )}
                        {exercise.duration_min && <p>{exercise.duration_min} min</p>}
                        {exercise.rest_sec && <p className="text-xs">Rest: {exercise.rest_sec}s</p>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cooldown */}
                <div className="text-sm">
                  <span className="font-medium text-blue-600">Cooldown:</span>{' '}
                  <span className="text-muted-foreground">{workout.cooldown}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Progression Notes */}
        <div className="mt-6 p-4 rounded-lg bg-muted/50">
          <h4 className="font-semibold mb-2">Progression</h4>
          <p className="text-sm text-muted-foreground">{training.progression_notes}</p>
        </div>

        {/* General Notes */}
        {training.general_notes.length > 0 && (
          <div className="mt-4 p-4 rounded-lg bg-muted/50">
            <h4 className="font-semibold mb-2">Notes</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              {training.general_notes.map((note, index) => (
                <li key={index}>{note}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
