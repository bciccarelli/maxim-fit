'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dumbbell, Calendar } from 'lucide-react';
import type { TrainingProgram } from '@/lib/schemas/protocol';

interface TrainingViewProps {
  training: TrainingProgram;
}

export function TrainingView({ training }: TrainingViewProps) {
  return (
    <Card className="border-l-2 border-l-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5" />
          Training program
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Program Overview */}
        <div className="p-4 rounded-lg bg-muted mb-6">
          <h3 className="font-semibold text-sm">{training.program_name}</h3>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span className="font-mono text-sm">{training.days_per_week}</span>
              <span className="text-xs">days/week</span>
            </div>
            <span className="text-xs">Rest: {training.rest_days.join(', ')}</span>
          </div>
        </div>

        {/* Workouts */}
        <div className="space-y-6">
          {training.workouts.map((workout, index) => (
            <div key={index} className="border rounded-lg overflow-hidden">
              <div className="p-4 bg-muted/50 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{workout.name}</p>
                  <p className="text-xs text-muted-foreground">{workout.day}</p>
                </div>
                <span className="font-mono text-sm text-muted-foreground tabular-nums">{workout.duration_min}<span className="text-xs ml-0.5">min</span></span>
              </div>

              <div className="p-4 space-y-4">
                {/* Warmup */}
                <div className="border-l-2 border-l-warning pl-3 py-1">
                  <span className="text-xs font-medium uppercase tracking-widest text-warning">Warmup</span>
                  <p className="text-sm text-muted-foreground mt-0.5">{workout.warmup}</p>
                </div>

                {/* Exercises */}
                <div className="divide-y divide-border">
                  {workout.exercises.map((exercise, i) => (
                    <div
                      key={i}
                      className="flex items-start justify-between py-2.5"
                    >
                      <div>
                        <p className="font-medium text-sm">{exercise.name}</p>
                        {exercise.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5">{exercise.notes}</p>
                        )}
                      </div>
                      <div className="text-right font-mono text-sm text-muted-foreground tabular-nums">
                        {exercise.sets && exercise.reps && (
                          <p>{exercise.sets} x {exercise.reps}</p>
                        )}
                        {exercise.duration_min && <p>{exercise.duration_min}<span className="text-xs ml-0.5">min</span></p>}
                        {exercise.rest_sec && <p className="text-xs">Rest: {exercise.rest_sec}<span className="ml-0.5">s</span></p>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cooldown */}
                <div className="border-l-2 border-l-info pl-3 py-1">
                  <span className="text-xs font-medium uppercase tracking-widest text-info">Cooldown</span>
                  <p className="text-sm text-muted-foreground mt-0.5">{workout.cooldown}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Progression Notes */}
        <div className="mt-6 border-t pt-4">
          <h4 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Progression</h4>
          <p className="text-sm text-muted-foreground">{training.progression_notes}</p>
        </div>

        {/* General Notes */}
        {training.general_notes.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <h4 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Notes</h4>
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
