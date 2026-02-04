'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PersonalInfoForm } from './PersonalInfoForm';
import { GoalsForm } from './GoalsForm';
import { RequirementsForm } from './RequirementsForm';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import type { PersonalInfo, Goal } from '@/lib/schemas/user-config';
import type { DailyProtocol } from '@/lib/schemas/protocol';

interface ProtocolWizardProps {
  onGenerate: (config: {
    personal_info: PersonalInfo;
    goals: Goal[];
    requirements: string[];
  }) => Promise<void>;
  isLoading?: boolean;
  initialConfig?: {
    personal_info?: Partial<PersonalInfo>;
    goals?: Goal[];
    requirements?: string[];
  };
}

const STEPS = [
  { id: 'goals', title: 'Goals', description: 'What do you want to achieve?' },
  { id: 'requirements', title: 'Requirements', description: 'Your constraints and preferences' },
  { id: 'personal', title: 'Personal Info', description: 'Tell us about yourself' },
];

export function ProtocolWizard({ onGenerate, isLoading = false, initialConfig }: ProtocolWizardProps) {
  const [step, setStep] = useState(0);
  const [personalInfo, setPersonalInfo] = useState<Partial<PersonalInfo>>(
    initialConfig?.personal_info ?? {
      lifestyle_considerations: [],
      dietary_restrictions: [],
    }
  );
  const [goals, setGoals] = useState<Goal[]>(initialConfig?.goals ?? []);
  const [requirements, setRequirements] = useState<string[]>(initialConfig?.requirements ?? []);

  const canProceed = () => {
    switch (step) {
      case 0: // Goals
        const totalWeight = goals.reduce((sum, g) => sum + g.weight, 0);
        return goals.length > 0 && Math.abs(totalWeight - 1) < 0.01;
      case 1: // Requirements
        return true;
      case 2: // Personal Info
        return (
          personalInfo.age &&
          personalInfo.weight_lbs &&
          personalInfo.height_in &&
          personalInfo.sex &&
          personalInfo.fitness_level
        );
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    await onGenerate({
      personal_info: personalInfo as PersonalInfo,
      goals,
      requirements,
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`flex items-center ${i < STEPS.length - 1 ? 'flex-1' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  i <= step
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    i < step ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <CardTitle>{STEPS[step].title}</CardTitle>
        <CardDescription>{STEPS[step].description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="min-h-[400px]">
          {step === 0 && (
            <GoalsForm goals={goals} onChange={setGoals} />
          )}
          {step === 1 && (
            <RequirementsForm requirements={requirements} onChange={setRequirements} />
          )}
          {step === 2 && (
            <PersonalInfoForm
              data={personalInfo}
              onChange={setPersonalInfo}
            />
          )}
        </div>

        <div className="flex justify-between mt-6 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep(step - 1)}
            disabled={step === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!canProceed() || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Protocol'
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
