'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';

interface RequirementsFormProps {
  requirements: string[];
  onChange: (requirements: string[]) => void;
}

const EXAMPLE_REQUIREMENTS = [
  'I go to work from 9 AM to 5 PM',
  'I can only work out 4 days per week',
  'I need to be done with all activities by 9 PM',
  'I have 30 minutes for lunch at work',
  'I need to fast for 16 hours daily',
];

export function RequirementsForm({ requirements, onChange }: RequirementsFormProps) {
  const [newRequirement, setNewRequirement] = useState('');

  const handleAdd = () => {
    if (!newRequirement.trim()) return;
    onChange([...requirements, newRequirement.trim()]);
    setNewRequirement('');
  };

  const handleRemove = (index: number) => {
    onChange(requirements.filter((_, i) => i !== index));
  };

  const handleAddExample = (example: string) => {
    if (!requirements.includes(example)) {
      onChange([...requirements, example]);
    }
  };

  return (
    <div className="space-y-6">

      {/* Current Requirements */}
      <div className="space-y-2">
        {requirements.map((req, index) => (
          <div
            key={index}
            className="flex items-center gap-2 p-3 rounded-md bg-muted"
          >
            <span className="flex-1 text-sm">{req}</span>
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
        {requirements.length === 0 && (
          <p className="text-sm text-muted-foreground italic p-3">
            No requirements added yet. Add your own or use the examples below.
          </p>
        )}
      </div>

      {/* Add New Requirement */}
      <div className="space-y-2">
        <Label htmlFor="new-requirement">Add a Requirement</Label>
        <div className="flex gap-2">
          <Input
            id="new-requirement"
            value={newRequirement}
            onChange={(e) => setNewRequirement(e.target.value)}
            placeholder="e.g., I need to be in bed by 10 PM"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
          />
          <Button type="button" onClick={handleAdd} disabled={!newRequirement.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>
      </div>

      {/* Example Requirements */}
      <div className="space-y-2">
        <Label>Example Requirements (click to add)</Label>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_REQUIREMENTS.filter((ex) => !requirements.includes(ex)).map((example) => (
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
