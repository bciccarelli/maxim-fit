'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { PersonalInfo } from '@/lib/schemas/user-config';

interface PersonalInfoFormProps {
  data: Partial<PersonalInfo>;
  onChange: (data: Partial<PersonalInfo>) => void;
}

type HeightUnit = 'imperial' | 'metric';
type WeightUnit = 'lbs' | 'kg';

// Conversion constants
const CM_PER_INCH = 2.54;
const KG_PER_LB = 0.453592;

export function PersonalInfoForm({ data, onChange }: PersonalInfoFormProps) {
  const [heightUnit, setHeightUnit] = useState<HeightUnit>('imperial');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('lbs');
  const [editingInches, setEditingInches] = useState<string | null>(null);
  const [otherExpanded, setOtherExpanded] = useState(false);

  // Derived values for display
  const heightFeet = data.height_in ? Math.floor(data.height_in / 12) : '';
  const heightInches = data.height_in !== undefined ? Math.round(data.height_in % 12) : '';
  const heightCm = data.height_in ? Math.round(data.height_in * CM_PER_INCH) : '';
  const weightKg = data.weight_lbs ? Math.round(data.weight_lbs * KG_PER_LB * 10) / 10 : '';

  const handleHeightImperialChange = (feet: number | undefined, inches: number | undefined) => {
    const totalInches = ((feet || 0) * 12) + (inches || 0);
    onChange({ ...data, height_in: totalInches > 0 ? totalInches : undefined });
  };

  const handleHeightMetricChange = (cm: number | undefined) => {
    const inches = cm ? cm / CM_PER_INCH : undefined;
    onChange({ ...data, height_in: inches });
  };

  const handleWeightChange = (value: number | undefined, unit: WeightUnit) => {
    if (unit === 'lbs') {
      onChange({ ...data, weight_lbs: value });
    } else {
      const lbs = value ? value / KG_PER_LB : undefined;
      onChange({ ...data, weight_lbs: lbs });
    }
  };

  const fitnessLevelOptions = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
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
            className="w-full"
          />
        </div>

        {/* Weight with unit toggle */}
        <div className="space-y-2">
          <Label htmlFor="weight">Weight</Label>
          <div className="flex gap-2">
            <Input
              id="weight"
              type="number"
              min={weightUnit === 'lbs' ? 50 : 23}
              max={weightUnit === 'lbs' ? 500 : 227}
              step={weightUnit === 'kg' ? 0.1 : 1}
              value={weightUnit === 'lbs' ? (data.weight_lbs || '') : (weightKg || '')}
              onChange={(e) => handleWeightChange(parseFloat(e.target.value) || undefined, weightUnit)}
              placeholder={weightUnit === 'lbs' ? 'Weight' : 'Weight'}
              className="flex-1"
            />
            <Select
              id="weight_unit"
              value={weightUnit}
              onChange={(e) => setWeightUnit(e.target.value as WeightUnit)}
              options={[
                { value: 'lbs', label: 'lbs' },
                { value: 'kg', label: 'kg' },
              ]}
              className="w-20"
            />
          </div>
        </div>

        {/* Height with unit toggle */}
        <div className="space-y-2">
          <Label>Height</Label>
          <div className="flex gap-2">
            {heightUnit === 'imperial' ? (
              <>
                <Input
                  id="height_feet"
                  type="number"
                  min={3}
                  max={8}
                  value={heightFeet}
                  onChange={(e) => {
                    const feet = e.target.value === '' ? undefined : parseInt(e.target.value);
                    const inches = data.height_in ? Math.round(data.height_in % 12) : undefined;
                    handleHeightImperialChange(feet, inches);
                  }}
                  placeholder="ft"
                  className="flex-1"
                />
                <Input
                  id="height_inches"
                  type="number"
                  min={0}
                  max={11}
                  value={editingInches !== null ? editingInches : heightInches}
                  onChange={(e) => {
                    setEditingInches(e.target.value);
                    const inches = e.target.value === '' ? undefined : parseInt(e.target.value);
                    const feet = data.height_in ? Math.floor(data.height_in / 12) : 0;
                    handleHeightImperialChange(feet, inches);
                  }}
                  onFocus={() => setEditingInches(String(heightInches))}
                  onBlur={() => setEditingInches(null)}
                  placeholder="in"
                  className="flex-1"
                />
              </>
            ) : (
              <Input
                id="height_cm"
                type="number"
                min={100}
                max={250}
                value={heightCm}
                onChange={(e) => handleHeightMetricChange(parseInt(e.target.value) || undefined)}
                placeholder="Height"
                className="flex-1"
              />
            )}
            <Select
              id="height_unit"
              value={heightUnit}
              onChange={(e) => setHeightUnit(e.target.value as HeightUnit)}
              options={[
                { value: 'imperial', label: 'ft/in' },
                { value: 'metric', label: 'cm' },
              ]}
              className="w-20"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fitness_level">Fitness Level</Label>
          <Select
            id="fitness_level"
            value={data.fitness_level || ''}
            onChange={(e) => onChange({ ...data, fitness_level: e.target.value as PersonalInfo['fitness_level'] })}
            options={fitnessLevelOptions}
            placeholder="Select fitness level"
            className="w-full"
          />
        </div>

      </div>

      <div>
        <button
          type="button"
          onClick={() => setOtherExpanded(!otherExpanded)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${otherExpanded ? 'rotate-0' : '-rotate-90'}`}
          />
          Other Considerations (optional)
        </button>
        {otherExpanded && (
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lifestyle_considerations">Lifestyle Considerations</Label>
              <Input
                id="lifestyle_considerations"
                value={data.lifestyle_considerations?.join(', ') || ''}
                onChange={(e) => onChange({
                  ...data,
                  lifestyle_considerations: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                })}
                placeholder="e.g., low sodium preference, blood sugar awareness, joint mobility focus"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dietary_restrictions">Dietary Restrictions</Label>
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
        )}
      </div>
    </div>
  );
}
