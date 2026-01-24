'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { PersonalInfo, AnonymousPersonalInfo } from '@/lib/schemas/user-config';

interface PersonalInfoFormProps {
  data: Partial<PersonalInfo>;
  onChange: (data: Partial<PersonalInfo>) => void;
  isAuthenticated?: boolean;
}

export function PersonalInfoForm({ data, onChange, isAuthenticated = false }: PersonalInfoFormProps) {
  const fitnessLevelOptions = isAuthenticated
    ? [
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' },
      ]
    : [
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' },
      ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="age">Age</Label>
          <Input
            id="age"
            type="number"
            min={18}
            max={120}
            value={data.age || ''}
            onChange={(e) => onChange({ ...data, age: parseInt(e.target.value) || undefined })}
            placeholder="Enter your age"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sex">Sex</Label>
          <Select
            id="sex"
            value={data.sex || ''}
            onChange={(e) => onChange({ ...data, sex: e.target.value as PersonalInfo['sex'] })}
            options={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
              { value: 'other', label: 'Other' },
            ]}
            placeholder="Select sex"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="weight">Weight (lbs)</Label>
          <Input
            id="weight"
            type="number"
            min={50}
            max={500}
            value={data.weight_lbs || ''}
            onChange={(e) => onChange({ ...data, weight_lbs: parseFloat(e.target.value) || undefined })}
            placeholder="Enter weight in pounds"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="height">Height (inches)</Label>
          <Input
            id="height"
            type="number"
            min={48}
            max={96}
            value={data.height_in || ''}
            onChange={(e) => onChange({ ...data, height_in: parseFloat(e.target.value) || undefined })}
            placeholder="Enter height in inches"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fitness_level">Fitness Level</Label>
          <Select
            id="fitness_level"
            value={data.fitness_level || ''}
            onChange={(e) => onChange({ ...data, fitness_level: e.target.value as PersonalInfo['fitness_level'] })}
            options={fitnessLevelOptions}
            placeholder="Select fitness level"
          />
          {!isAuthenticated && (
            <p className="text-xs text-muted-foreground">
              Sign in to access advanced fitness level
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="genetic_background">Genetic Background</Label>
          <Input
            id="genetic_background"
            value={data.genetic_background || ''}
            onChange={(e) => onChange({ ...data, genetic_background: e.target.value })}
            placeholder="e.g., European, Asian, African"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="health_conditions">Health Conditions (comma-separated)</Label>
        <Input
          id="health_conditions"
          value={data.health_conditions?.join(', ') || ''}
          onChange={(e) => onChange({
            ...data,
            health_conditions: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
          })}
          placeholder="e.g., hypertension, diabetes, none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="dietary_restrictions">Dietary Restrictions (comma-separated)</Label>
        <Input
          id="dietary_restrictions"
          value={data.dietary_restrictions?.join(', ') || ''}
          onChange={(e) => onChange({
            ...data,
            dietary_restrictions: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
          })}
          placeholder="e.g., vegetarian, gluten-free, none"
        />
      </div>
    </div>
  );
}
