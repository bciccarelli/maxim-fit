'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dumbbell, Calendar, Plus, Trash2, Save, ChevronDown, ChevronRight, Pencil } from 'lucide-react';
import { InlineEditField } from './InlineEditField';
import type { TrainingProgram, Workout, Exercise } from '@/lib/schemas/protocol';

interface TrainingViewProps {
  training: TrainingProgram;
  editable?: boolean;
  onChange?: (training: TrainingProgram) => void;
}

export function TrainingView({ training, editable = false, onChange }: TrainingViewProps) {
  const [draft, setDraft] = useState<TrainingProgram>(training);
  const [dirty, setDirty] = useState(false);
  const [expandedWorkout, setExpandedWorkout] = useState<number | null>(null);
  const [editingWorkout, setEditingWorkout] = useState<number | null>(null);

  const display = dirty ? draft : training;

  const updateDraft = (updated: TrainingProgram) => {
    setDraft(updated);
    setDirty(true);
  };

  const handleSave = () => {
    onChange?.(draft);
    setDirty(false);
  };

  const handleUpdateExercise = (wIdx: number, eIdx: number, field: keyof Exercise, value: unknown) => {
    const workouts = [...draft.workouts];
    const exercises = [...workouts[wIdx].exercises];
    exercises[eIdx] = { ...exercises[eIdx], [field]: value };
    workouts[wIdx] = { ...workouts[wIdx], exercises };
    updateDraft({ ...draft, workouts });
  };

  const handleAddExercise = (wIdx: number) => {
    const workouts = [...draft.workouts];
    workouts[wIdx] = { ...workouts[wIdx], exercises: [...workouts[wIdx].exercises, { name: 'New exercise', sets: 3, reps: '10', duration_min: null, rest_sec: 60, notes: null }] };
    updateDraft({ ...draft, workouts });
  };

  const handleRemoveExercise = (wIdx: number, eIdx: number) => {
    const workouts = [...draft.workouts];
    workouts[wIdx] = { ...workouts[wIdx], exercises: workouts[wIdx].exercises.filter((_, i) => i !== eIdx) };
    updateDraft({ ...draft, workouts });
  };

  const handleAddWorkout = () => {
    const newIndex = draft.workouts.length;
    updateDraft({ ...draft, workouts: [...draft.workouts, { name: 'New workout', day: 'Day ' + (draft.workouts.length + 1), time: '06:00', duration_min: 60, exercises: [], warmup: '5 min general warmup', cooldown: '5 min stretching' }] });
    setExpandedWorkout(newIndex);
    setEditingWorkout(newIndex);
  };

  const handleRemoveWorkout = (index: number) => {
    updateDraft({ ...draft, workouts: draft.workouts.filter((_, i) => i !== index) });
    setExpandedWorkout(null);
    setEditingWorkout(null);
  };

  const handleStartEditing = (index: number) => {
    setEditingWorkout(index);
    setExpandedWorkout(index);
  };

  const isWorkoutExpanded = (index: number) =>
    expandedWorkout === index || editingWorkout === index;

  return (
    <Card className="border-l-2 border-l-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5" />
          Training program
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="p-4 rounded-lg bg-muted mb-6">
          {editable ? (
            <InlineEditField value={display.program_name} onChange={(v) => updateDraft({ ...draft, program_name: v })} className="font-semibold text-sm" />
          ) : (
            <h3 className="font-semibold text-sm">{display.program_name}</h3>
          )}
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {editable ? (
                <InlineEditField value={String(display.days_per_week)} onChange={(v) => updateDraft({ ...draft, days_per_week: parseInt(v) || 1 })} type="number" mono className="text-sm" />
              ) : (
                <span className="font-mono text-sm">{display.days_per_week}</span>
              )}
              <span className="text-xs">days/week</span>
            </div>
            <span className="text-xs">Rest: {display.rest_days.join(', ')}</span>
          </div>
        </div>

        <div className="space-y-6">
          {display.workouts.map((workout, wIdx) => {
            const expanded = isWorkoutExpanded(wIdx);
            const isEditing = editingWorkout === wIdx;
            return (
              <div key={wIdx} className="border rounded-lg overflow-hidden">
                <div className="p-4 bg-muted/50 flex items-center justify-between">
                  <div
                    className="flex items-center gap-2 cursor-pointer flex-1"
                    onClick={() => setExpandedWorkout(expandedWorkout === wIdx ? null : wIdx)}
                  >
                    {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <div>
                      <p className="font-medium text-sm">{workout.name}</p>
                      <p className="text-xs text-muted-foreground">{workout.day}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {editable && !isEditing && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => handleStartEditing(wIdx)}
                        aria-label="Edit workout"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                    <span className="font-mono text-sm text-muted-foreground tabular-nums">{workout.duration_min}<span className="text-xs ml-0.5">min</span></span>
                  </div>
                </div>

                {expanded && (
                  <div className="p-4 space-y-4">
                    <div className="border-l-2 border-l-warning pl-3 py-1">
                      <span className="text-xs font-medium uppercase tracking-widest text-warning">Warmup</span>
                      <p className="text-sm text-muted-foreground mt-0.5">{workout.warmup}</p>
                    </div>

                    <div className="divide-y divide-border">
                      {workout.exercises.map((exercise, eIdx) => (
                        <div key={eIdx} className="flex items-start justify-between py-2.5">
                          <div className="flex-1">
                            {isEditing ? (
                              <div className="space-y-1">
                                <Input value={exercise.name} onChange={(e) => handleUpdateExercise(wIdx, eIdx, 'name', e.target.value)} className="text-sm h-7" />
                                <div className="flex gap-2">
                                  <Input type="number" value={exercise.sets ?? ''} onChange={(e) => handleUpdateExercise(wIdx, eIdx, 'sets', parseInt(e.target.value) || null)} placeholder="Sets" className="w-16 font-mono text-sm h-7" />
                                  <Input value={exercise.reps ?? ''} onChange={(e) => handleUpdateExercise(wIdx, eIdx, 'reps', e.target.value || null)} placeholder="Reps" className="w-20 font-mono text-sm h-7" />
                                  <Input type="number" value={exercise.rest_sec ?? ''} onChange={(e) => handleUpdateExercise(wIdx, eIdx, 'rest_sec', parseInt(e.target.value) || null)} placeholder="Rest (s)" className="w-20 font-mono text-sm h-7" />
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveExercise(wIdx, eIdx)} aria-label="Remove exercise"><Trash2 className="h-3 w-3" /></Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="font-medium text-sm">{exercise.name}</p>
                                {exercise.notes && <p className="text-xs text-muted-foreground mt-0.5">{exercise.notes}</p>}
                              </>
                            )}
                          </div>
                          {!isEditing && (
                            <div className="text-right font-mono text-sm text-muted-foreground tabular-nums">
                              {exercise.sets && exercise.reps && <p>{exercise.sets} x {exercise.reps}</p>}
                              {exercise.duration_min && <p>{exercise.duration_min}<span className="text-xs ml-0.5">min</span></p>}
                              {exercise.rest_sec && <p className="text-xs">Rest: {exercise.rest_sec}<span className="ml-0.5">s</span></p>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {isEditing && (
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleAddExercise(wIdx)}><Plus className="h-3 w-3 mr-1" />Add exercise</Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditingWorkout(null)}>Done</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveWorkout(wIdx)} className="text-destructive hover:text-destructive"><Trash2 className="h-3 w-3 mr-1" />Remove workout</Button>
                      </div>
                    )}

                    <div className="border-l-2 border-l-info pl-3 py-1">
                      <span className="text-xs font-medium uppercase tracking-widest text-info">Cooldown</span>
                      <p className="text-sm text-muted-foreground mt-0.5">{workout.cooldown}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 border-t pt-4">
          <h4 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Progression</h4>
          <p className="text-sm text-muted-foreground">{display.progression_notes}</p>
        </div>

        {display.general_notes.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <h4 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Notes</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              {display.general_notes.map((note, index) => (<li key={index}>{note}</li>))}
            </ul>
          </div>
        )}

        {editable && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <Button variant="outline" size="sm" onClick={handleAddWorkout}><Plus className="h-4 w-4 mr-1" />Add workout</Button>
            {dirty && <Button size="sm" onClick={handleSave}><Save className="h-4 w-4 mr-1" />Save changes</Button>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
