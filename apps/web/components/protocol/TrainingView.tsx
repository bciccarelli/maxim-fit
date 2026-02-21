'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dumbbell, Calendar, Plus, Trash2, Save, ChevronDown, ChevronRight, Pencil, GripVertical } from 'lucide-react';
import { InlineEditField } from './InlineEditField';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TrainingProgram, Workout, Exercise } from '@/lib/schemas/protocol';

interface TrainingViewProps {
  training: TrainingProgram;
  editable?: boolean;
  onChange?: (training: TrainingProgram) => void;
}

interface SortableExerciseProps {
  id: string;
  exercise: Exercise;
  isEditing: boolean;
  onUpdate: (field: keyof Exercise, value: unknown) => void;
  onRemove: () => void;
}

function SortableExercise({ id, exercise, isEditing, onUpdate, onRemove }: SortableExerciseProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isEditing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2 py-2.5">
      {isEditing && (
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground mt-1"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <div className="flex-1">
        {isEditing ? (
          <div className="space-y-1">
            <Input value={exercise.name} onChange={(e) => onUpdate('name', e.target.value)} className="text-sm h-7" />
            <div className="flex gap-2">
              <Input type="number" value={exercise.sets ?? ''} onChange={(e) => onUpdate('sets', parseInt(e.target.value) || null)} placeholder="Sets" className="w-16 font-mono text-sm h-7" />
              <Input value={exercise.reps ?? ''} onChange={(e) => onUpdate('reps', e.target.value || null)} placeholder="Reps" className="w-20 font-mono text-sm h-7" />
              <Input type="number" value={exercise.rest_sec ?? ''} onChange={(e) => onUpdate('rest_sec', parseInt(e.target.value) || null)} placeholder="Rest (s)" className="w-20 font-mono text-sm h-7" />
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onRemove} aria-label="Remove exercise"><Trash2 className="h-3 w-3" /></Button>
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
  );
}

export function TrainingView({ training, editable = false, onChange }: TrainingViewProps) {
  const [draft, setDraft] = useState<TrainingProgram>(training);
  const [dirty, setDirty] = useState(false);
  const [expandedWorkout, setExpandedWorkout] = useState<number | null>(null);
  const [editingWorkout, setEditingWorkout] = useState<number | null>(null);

  const display = dirty ? draft : training;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const handleDragEnd = (event: DragEndEvent, wIdx: number) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const workouts = [...draft.workouts];
    const exercises = [...workouts[wIdx].exercises];

    const oldIndex = exercises.findIndex((_, i) => `exercise-${wIdx}-${i}` === active.id);
    const newIndex = exercises.findIndex((_, i) => `exercise-${wIdx}-${i}` === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      workouts[wIdx] = {
        ...workouts[wIdx],
        exercises: arrayMove(exercises, oldIndex, newIndex),
      };
      updateDraft({ ...draft, workouts });
    }
  };

  const handleAddWorkout = () => {
    const newIndex = draft.workouts.length;
    updateDraft({ ...draft, workouts: [...draft.workouts, { name: 'New workout', day: 'Day ' + (draft.workouts.length + 1), time: '06:00', duration_min: 60, exercises: [] }] });
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
            const exerciseIds = workout.exercises.map((_, i) => `exercise-${wIdx}-${i}`);

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
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(event) => handleDragEnd(event, wIdx)}
                    >
                      <SortableContext items={exerciseIds} strategy={verticalListSortingStrategy}>
                        <div className="divide-y divide-border">
                          {workout.exercises.map((exercise, eIdx) => (
                            <SortableExercise
                              key={`exercise-${wIdx}-${eIdx}`}
                              id={`exercise-${wIdx}-${eIdx}`}
                              exercise={exercise}
                              isEditing={isEditing}
                              onUpdate={(field, value) => handleUpdateExercise(wIdx, eIdx, field, value)}
                              onRemove={() => handleRemoveExercise(wIdx, eIdx)}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>

                    {isEditing && (
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleAddExercise(wIdx)}><Plus className="h-3 w-3 mr-1" />Add exercise</Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditingWorkout(null)}>Done</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveWorkout(wIdx)} className="text-destructive hover:text-destructive"><Trash2 className="h-3 w-3 mr-1" />Remove workout</Button>
                      </div>
                    )}
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
