import type { Goal, PersonalInfo } from '@protocol/shared/schemas';

export type WizardStep = 0 | 1 | 2 | 3; // goals, requirements, personal, generating

export interface WizardState {
  goals: Goal[];
  requirements: string[];
  personalInfo: Partial<PersonalInfo>;
}

export interface GoalsStepProps {
  goals: Goal[];
  onChange: (goals: Goal[]) => void;
}

export interface RequirementsStepProps {
  requirements: string[];
  onChange: (requirements: string[]) => void;
}

export interface PersonalInfoStepProps {
  personalInfo: Partial<PersonalInfo>;
  onChange: (info: Partial<PersonalInfo>) => void;
}

export interface GeneratingStepProps {
  streamedText: string;
  error: string | null;
  onRetry: () => void;
}

export const EXAMPLE_GOALS = [
  { name: 'Build muscle mass', weight: 0 },
  { name: 'Improve cardiovascular health', weight: 0 },
  { name: 'Improve mental clarity', weight: 0 },
  { name: 'Optimize longevity', weight: 0 },
  { name: 'Lose body fat', weight: 0 },
  { name: 'Improve sleep quality', weight: 0 },
  { name: 'Increase energy levels', weight: 0 },
];

export const EXAMPLE_REQUIREMENTS = [
  'I work 9-5 on weekdays',
  'I can only workout 3-4 times per week',
  'I need to be in bed by 10:30 PM',
  'I have a 30 minute lunch break',
  'I practice intermittent fasting',
];
