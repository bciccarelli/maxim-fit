import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useRouter } from 'expo-router';
import type { Goal, PersonalInfo } from '@protocol/shared/schemas';
import {
  getHasCompletedOnboarding,
  setHasCompletedOnboarding as persistOnboardingComplete,
} from '@/lib/storage/onboardingStorage';

interface OnboardingContextType {
  // Wizard state shared across onboarding screens
  goals: Goal[];
  setGoals: (goals: Goal[]) => void;
  requirements: string[];
  setRequirements: (requirements: string[]) => void;
  personalInfo: Partial<PersonalInfo>;
  setPersonalInfo: (info: Partial<PersonalInfo>) => void;

  // Onboarding completion tracking
  hasCompletedOnboarding: boolean | null; // null = still loading
  completeOnboarding: () => Promise<void>;
  markOnboardingComplete: () => Promise<void>; // For login bypass
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  // Wizard form state
  const [goals, setGoals] = useState<Goal[]>([]);
  const [requirements, setRequirements] = useState<string[]>([]);
  const [personalInfo, setPersonalInfo] = useState<Partial<PersonalInfo>>({
    lifestyle_considerations: [],
    dietary_restrictions: [],
  });

  // Onboarding completion state
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);

  // Load onboarding state from AsyncStorage on mount
  useEffect(() => {
    getHasCompletedOnboarding().then((completed) => {
      setHasCompletedOnboarding(completed);
    });
  }, []);

  // Complete onboarding and navigate to main app
  const completeOnboarding = useCallback(async () => {
    await persistOnboardingComplete(true);
    setHasCompletedOnboarding(true);
    router.replace('/(app)/(tabs)/protocols');
  }, [router]);

  // Mark onboarding as complete without navigating (for login bypass)
  const markOnboardingComplete = useCallback(async () => {
    await persistOnboardingComplete(true);
    setHasCompletedOnboarding(true);
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        goals,
        setGoals,
        requirements,
        setRequirements,
        personalInfo,
        setPersonalInfo,
        hasCompletedOnboarding,
        completeOnboarding,
        markOnboardingComplete,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
