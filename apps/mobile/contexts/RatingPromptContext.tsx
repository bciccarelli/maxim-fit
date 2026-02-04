import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';

// Lazy import to handle missing native module gracefully
let StoreReview: typeof import('expo-store-review') | null = null;
try {
  StoreReview = require('expo-store-review');
} catch {
  if (__DEV__) {
    console.warn('[RatingPrompt] expo-store-review native module not available. Rebuild the dev client to enable.');
  }
}
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
import { useSubscriptionContext } from './SubscriptionContext';

interface RatingPromptContextValue {
  /** Track an app open event */
  trackAppOpen: () => Promise<void>;
  /** Record a core action (win moment) */
  recordCoreAction: (action: CoreAction) => Promise<void>;
  /** Record a billing event (trial → paid) */
  recordBillingEvent: () => Promise<void>;
  /** Check eligibility and show prompt if appropriate */
  maybeShowRatingPrompt: () => Promise<boolean>;
  /** Current state */
  state: RatingPromptState;
  /** Whether state is loading */
  isLoading: boolean;
}

const RatingPromptContext = createContext<RatingPromptContextValue | null>(null);

interface RatingPromptProviderProps {
  children: ReactNode;
}

export function RatingPromptProvider({ children }: RatingPromptProviderProps) {
  const [state, setState] = useState<RatingPromptState>(DEFAULT_RATING_PROMPT_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const subscription = useSubscriptionContext();
  const stateRef = useRef(state);
  const prevSubscriptionStatusRef = useRef<string | null>(null);

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

  // Detect billing event: trial → active transition
  useEffect(() => {
    const currentStatus = subscription.details?.status ?? null;

    if (
      prevSubscriptionStatusRef.current === 'trialing' &&
      currentStatus === 'active'
    ) {
      // Billing event occurred - trial converted to paid
      const currentState = stateRef.current;
      const newState: RatingPromptState = {
        ...currentState,
        lastBillingEventDate: new Date().toISOString(),
      };
      setState(newState);
      saveRatingPromptState(newState);

      if (__DEV__) {
        console.log('[RatingPrompt] Billing event detected: trial → active');
      }
    }

    prevSubscriptionStatusRef.current = currentStatus;
  }, [subscription.details?.status]);

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
    // Check if native module is available
    if (!StoreReview) {
      if (__DEV__) {
        console.log('[RatingPrompt] Native module not available, skipping prompt');
      }
      return false;
    }

    const currentState = stateRef.current;

    // Check if store review is available on this device
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

  const value: RatingPromptContextValue = {
    trackAppOpen,
    recordCoreAction,
    recordBillingEvent,
    maybeShowRatingPrompt,
    state,
    isLoading,
  };

  return (
    <RatingPromptContext.Provider value={value}>
      {children}
    </RatingPromptContext.Provider>
  );
}

/**
 * Hook to access rating prompt context.
 * Must be used within a RatingPromptProvider (which must be inside SubscriptionProvider).
 */
export function useRatingPromptContext(): RatingPromptContextValue {
  const context = useContext(RatingPromptContext);
  if (!context) {
    throw new Error(
      'useRatingPromptContext must be used within a RatingPromptProvider'
    );
  }
  return context;
}
