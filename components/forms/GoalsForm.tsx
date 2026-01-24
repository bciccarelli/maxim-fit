'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import type { Goal } from '@/lib/schemas/user-config';

interface GoalsFormProps {
  goals: Goal[];
  onChange: (goals: Goal[]) => void;
}

export function GoalsForm({ goals, onChange }: GoalsFormProps) {
  const [newGoal, setNewGoal] = useState<Partial<Goal>>({
    name: '',
    weight: 0,
    description: '',
  });

  const totalWeight = goals.reduce((sum, g) => sum + g.weight, 0);
  const remainingWeight = Math.max(0, 1 - totalWeight);

  const handleAddGoal = () => {
    if (!newGoal.name || !newGoal.description || !newGoal.weight) return;

    onChange([...goals, newGoal as Goal]);
    setNewGoal({ name: '', weight: 0, description: '' });
  };

  const handleRemoveGoal = (index: number) => {
    onChange(goals.filter((_, i) => i !== index));
  };

  const handleUpdateGoal = (index: number, updates: Partial<Goal>) => {
    onChange(
      goals.map((goal, i) => (i === index ? { ...goal, ...updates } : goal))
    );
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

      {/* Existing Goals */}
      <div className="space-y-4">
        {goals.map((goal, index) => (
          <Card key={index}>
            <CardContent className="pt-4">
              <div className="flex items-start gap-4">
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Goal Name</Label>
                      <Input
                        value={goal.name}
                        onChange={(e) => handleUpdateGoal(index, { name: e.target.value })}
                        placeholder="e.g., Muscle Gain"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Weight (0-100%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={Math.round(goal.weight * 100)}
                        onChange={(e) => handleUpdateGoal(index, {
                          weight: parseFloat(e.target.value) / 100 || 0,
                        })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={goal.description}
                      onChange={(e) => handleUpdateGoal(index, { description: e.target.value })}
                      placeholder="Describe this goal in detail..."
                      rows={2}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveGoal(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add New Goal */}
      <Card className="border-dashed">
        <CardContent className="pt-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>New Goal Name</Label>
                <Input
                  value={newGoal.name}
                  onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                  placeholder="e.g., Longevity"
                />
              </div>
              <div className="space-y-2">
                <Label>Weight (0-100%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={Math.round(remainingWeight * 100)}
                  value={newGoal.weight ? Math.round(newGoal.weight * 100) : ''}
                  onChange={(e) => setNewGoal({
                    ...newGoal,
                    weight: parseFloat(e.target.value) / 100 || 0,
                  })}
                  placeholder={`Max: ${Math.round(remainingWeight * 100)}%`}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newGoal.description}
                onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                placeholder="Describe this goal in detail..."
                rows={2}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleAddGoal}
              disabled={!newGoal.name || !newGoal.description || !newGoal.weight}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Goal
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
