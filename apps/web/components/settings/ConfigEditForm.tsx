'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { GoalsForm } from '@/components/forms/GoalsForm';
import { PersonalInfoForm } from '@/components/forms/PersonalInfoForm';
import { RequirementsForm } from '@/components/forms/RequirementsForm';
import { Loader2, Save, X } from 'lucide-react';
import type { PersonalInfo, Goal } from '@/lib/schemas/user-config';

interface ConfigEditFormProps {
  initialConfig: {
    personal_info: PersonalInfo;
    goals: Goal[];
    requirements: string[];
  };
  onSave: (config: { personal_info: PersonalInfo; goals: Goal[]; requirements: string[] }) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

export function ConfigEditForm({ initialConfig, onSave, onCancel, saving }: ConfigEditFormProps) {
  const [personalInfo, setPersonalInfo] = useState<Partial<PersonalInfo>>(initialConfig.personal_info);
  const [goals, setGoals] = useState<Goal[]>(initialConfig.goals);
  const [requirements, setRequirements] = useState<string[]>(initialConfig.requirements);

  const totalWeight = goals.reduce((sum, g) => sum + g.weight, 0);
  const isValidGoalWeight = Math.abs(totalWeight - 1.0) < 0.01;
  const hasRequiredPersonalInfo =
    personalInfo.age !== undefined &&
    personalInfo.weight_lbs !== undefined &&
    personalInfo.height_in !== undefined &&
    personalInfo.sex !== undefined &&
    personalInfo.fitness_level !== undefined;

  const canSave = isValidGoalWeight && hasRequiredPersonalInfo && goals.length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    await onSave({
      personal_info: {
        age: personalInfo.age!,
        weight_lbs: personalInfo.weight_lbs!,
        height_in: personalInfo.height_in!,
        sex: personalInfo.sex!,
        fitness_level: personalInfo.fitness_level!,
        lifestyle_considerations: personalInfo.lifestyle_considerations ?? [],
        dietary_restrictions: personalInfo.dietary_restrictions ?? [],
      },
      goals,
      requirements,
    });
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-4">
          <PersonalInfoForm
            data={personalInfo}
            onChange={setPersonalInfo}
          />
        </TabsContent>

        <TabsContent value="goals" className="mt-4">
          <GoalsForm
            goals={goals}
            onChange={setGoals}
          />
          {!isValidGoalWeight && goals.length > 0 && (
            <p className="text-sm text-destructive mt-2">
              Goal weights must sum to 100% (currently {Math.round(totalWeight * 100)}%)
            </p>
          )}
        </TabsContent>

        <TabsContent value="requirements" className="mt-4">
          <RequirementsForm
            requirements={requirements}
            onChange={setRequirements}
          />
        </TabsContent>
      </Tabs>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!canSave || saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save configuration
        </Button>
      </div>
    </div>
  );
}
