import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useRouter } from 'expo-router';
import type { Goal, PersonalInfo } from '@protocol/shared/schemas';
import {
  getHasCompletedOnboarding,
  setHasCompletedOnboarding as persistOnboardingComplete,
} from '@/lib/storage/onboardingStorage';
import { armProtocolEditingTip } from '@/lib/storage/onboardingTipsStorage';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

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
  const { session } = useAuth();

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

  // Fresh install bypass: if a returning user signs in but their local
  // onboarding flag is missing (AsyncStorage wiped), infer completion from
  // server state. Any existing protocol means they've onboarded before.
  useEffect(() => {
    if (!session?.user || hasCompletedOnboarding !== false) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('protocols')
        .select('id')
        .eq('user_id', session.user.id)
        .limit(1);
      if (cancelled || error) return;
      if (data && data.length > 0) {
        await persistOnboardingComplete(true);
        setHasCompletedOnboarding(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, hasCompletedOnboarding]);

  // Complete onboarding and navigate to main app. Arms the one-shot editing
  // tip so the protocols screen shows it on first render.
  const completeOnboarding = useCallback(async () => {
    await persistOnboardingComplete(true);
    await armProtocolEditingTip();
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
