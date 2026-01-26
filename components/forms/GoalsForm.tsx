'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import type { Goal } from '@/lib/schemas/user-config';

interface GoalsFormProps {
  goals: Goal[];
  onChange: (goals: Goal[]) => void;
}

const EXAMPLE_GOALS = [
  'Build muscle mass and strength',
  'Improve cardiovascular endurance',
  'Optimize longevity and healthspan',
  'Lose body fat while maintaining muscle',
  'Improve sleep quality and recovery',
  'Increase energy and mental clarity',
];

// Distribute weights evenly across goals
function distributeWeightsEvenly(goalsList: Goal[]): Goal[] {
  if (goalsList.length === 0) return goalsList;
  const evenWeight = Math.round((1 / goalsList.length) * 100) / 100;
  return goalsList.map((goal) => ({ ...goal, weight: evenWeight }));
}

export function GoalsForm({ goals, onChange }: GoalsFormProps) {
  const [newGoalText, setNewGoalText] = useState('');
  const [autoDistribute, setAutoDistribute] = useState(true);

  const totalWeight = goals.reduce((sum, g) => sum + g.weight, 0);

  const handleAdd = () => {
    if (!newGoalText.trim()) return;
    const newGoals = [...goals, { name: newGoalText.trim(), weight: 0 }];
    onChange(autoDistribute ? distributeWeightsEvenly(newGoals) : newGoals);
    setNewGoalText('');
  };

  const handleRemove = (index: number) => {
    const newGoals = goals.filter((_, i) => i !== index);
    onChange(autoDistribute ? distributeWeightsEvenly(newGoals) : newGoals);
  };

  const handleUpdateWeight = (index: number, weight: number) => {
    // User manually edited a weight, stop auto-distributing
    setAutoDistribute(false);
    onChange(
      goals.map((goal, i) => (i === index ? { ...goal, weight } : goal))
    );
  };

  const handleAddExample = (exampleText: string) => {
    if (!goals.some((g) => g.name === exampleText)) {
      const newGoals = [...goals, { name: exampleText, weight: 0 }];
      onChange(autoDistribute ? distributeWeightsEvenly(newGoals) : newGoals);
    }
  };

  const normalizeWeights = () => {
    if (goals.length === 0) return;
    const total = goals.reduce((sum, g) => sum + g.weight, 0);
    if (total === 0) return;

    onChange(
      goals.map((goal) => ({
        ...goal,
        weight: Math.round((goal.weight / total) * 100) / 100,
      }))
    );
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Add your health goals in natural language. Weights are distributed evenly by default.
        Adjust manually if you want to prioritize certain goals.
      </p>

      {/* Weight Status */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Total weight: {(totalWeight * 100).toFixed(0)}% / 100%
          </p>
          {Math.abs(totalWeight - 1) > 0.01 && goals.length > 0 && (
            <p className="text-sm text-destructive">
              Weights must sum to 100%
            </p>
          )}
        </div>
        {goals.length > 0 && Math.abs(totalWeight - 1) > 0.01 && (
          <Button type="button" variant="outline" size="sm" onClick={normalizeWeights}>
            Normalize Weights
          </Button>
        )}
      </div>

      {/* Current Goals */}
      <div className="space-y-2">
        {goals.map((goal, index) => (
          <div
            key={index}
            className="flex items-center gap-2 p-3 rounded-md bg-muted"
          >
            <span className="flex-1 text-sm">{goal.name}</span>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={0}
                max={100}
                value={Math.round(goal.weight * 100)}
                onChange={(e) => handleUpdateWeight(index, parseFloat(e.target.value) / 100 || 0)}
                className="w-16 h-8 text-xs"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleRemove(index)}
              className="h-8 w-8 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {goals.length === 0 && (
          <p className="text-sm text-muted-foreground italic p-3">
            No goals added yet. Add your own or use the examples below.
          </p>
        )}
      </div>

      {/* Add New Goal */}
      <div className="space-y-2">
        <Label>Add a Goal</Label>
        <div className="flex gap-2">
          <Input
            value={newGoalText}
            onChange={(e) => setNewGoalText(e.target.value)}
            placeholder="e.g., Build muscle and increase strength"
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
          />
          <Button type="button" onClick={handleAdd} disabled={!newGoalText.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>
      </div>

      {/* Example Goals */}
      <div className="space-y-2">
        <Label>Example Goals (click to add)</Label>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_GOALS.filter((ex) => !goals.some((g) => g.name === ex)).map((example) => (
            <Button
              key={example}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAddExample(example)}
              className="text-xs"
            >
              {example}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
