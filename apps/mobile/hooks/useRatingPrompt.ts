import { useState, useEffect, useCallback, useRef } from 'react';
import * as StoreReview from 'expo-store-review';
import {
  RatingPromptState,
  DEFAULT_RATING_PROMPT_STATE,
  CoreAction,
} from '@/lib/types/ratingPrompt';
import {
  getRatingPromptState,
  saveRatingPromptState,
} from '@/lib/storage/ratingPromptStorage';
import { isEligibleForPrompt } from '@/lib/rating/eligibility';
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';

interface UseRatingPromptReturn {
  /** Track an app open event */
  trackAppOpen: () => Promise<void>;
  /** Record a core action (win moment) */
  recordCoreAction: (action: CoreAction) => Promise<void>;
  /** Record a billing event (trial → paid) */
  recordBillingEvent: () => Promise<void>;
  /** Check eligibility and show prompt if appropriate */
  maybeShowRatingPrompt: () => Promise<boolean>;
  /** Mark that user has rated */
  markAsRated: () => Promise<void>;
  /** Mark that user has permanently declined */
  markAsDeclined: () => Promise<void>;
  /** Current state */
  state: RatingPromptState;
  /** Whether state is loading */
  isLoading: boolean;
}

export function useRatingPrompt(): UseRatingPromptReturn {
  const [state, setState] = useState<RatingPromptState>(DEFAULT_RATING_PROMPT_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const subscription = useSubscriptionContext();
  const stateRef = useRef(state);

  // Keep ref in sync with state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Load state on mount
  useEffect(() => {
    async function loadState() {
      const savedState = await getRatingPromptState();
      setState(savedState);
      setIsLoading(false);
    }
    loadState();
  }, []);

  const trackAppOpen = useCallback(async () => {
    const currentState = stateRef.current;
    const newState: RatingPromptState = {
      ...currentState,
      appOpenTimestamps: [...currentState.appOpenTimestamps, Date.now()],
    };
    setState(newState);
    await saveRatingPromptState(newState);
  }, []);

  const recordCoreAction = useCallback(async (action: CoreAction) => {
    const currentState = stateRef.current;

    // Don't record duplicates
    if (currentState.coreActionsCompleted.includes(action)) {
      return;
    }

    const newState: RatingPromptState = {
      ...currentState,
      coreActionsCompleted: [...currentState.coreActionsCompleted, action],
    };
    setState(newState);
    await saveRatingPromptState(newState);
  }, []);

  const recordBillingEvent = useCallback(async () => {
    const currentState = stateRef.current;
    const newState: RatingPromptState = {
      ...currentState,
      lastBillingEventDate: new Date().toISOString(),
    };
    setState(newState);
    await saveRatingPromptState(newState);
  }, []);

  const maybeShowRatingPrompt = useCallback(async (): Promise<boolean> => {
    const currentState = stateRef.current;

    // Check if store review is available
    const isAvailable = await StoreReview.isAvailableAsync();
    if (!isAvailable) {
      return false;
    }

    // Check eligibility
    const subscriptionDetails = subscription.details
      ? {
          isTrialing: subscription.details.isTrialing,
          trialEndsAt: subscription.details.trialEndsAt,
          status: subscription.details.status,
        }
      : null;

    const result = isEligibleForPrompt(currentState, subscriptionDetails);

    if (!result.eligible) {
      if (__DEV__) {
        console.log('[RatingPrompt] Not eligible:', result.reason);
      }
      return false;
    }

    // Show the native review prompt
    try {
      await StoreReview.requestReview();

      // Update state after showing prompt
      const newState: RatingPromptState = {
        ...currentState,
        lastPromptDate: new Date().toISOString(),
        promptCount: currentState.promptCount + 1,
      };
      setState(newState);
      await saveRatingPromptState(newState);

      if (__DEV__) {
        console.log('[RatingPrompt] Prompt shown successfully');
      }

      return true;
    } catch (error) {
      if (__DEV__) {
        console.error('[RatingPrompt] Error showing prompt:', error);
      }
      return false;
    }
  }, [subscription.details]);

  const markAsRated = useCallback(async () => {
    const currentState = stateRef.current;
    const newState: RatingPromptState = {
      ...currentState,
      hasRated: true,
    };
    setState(newState);
    await saveRatingPromptState(newState);
  }, []);

  const markAsDeclined = useCallback(async () => {
    const currentState = stateRef.current;
    const newState: RatingPromptState = {
      ...currentState,
      hasDeclinedPermanently: true,
    };
    setState(newState);
    await saveRatingPromptState(newState);
  }, []);

  return {
    trackAppOpen,
    recordCoreAction,
    recordBillingEvent,
    maybeShowRatingPrompt,
    markAsRated,
    markAsDeclined,
    state,
    isLoading,
  };
}
