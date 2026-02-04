import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiUrl, getAuthHeaders } from '@/lib/api';
import {
  SUBSCRIPTION_BYPASS_ENABLED,
  type Tier,
  type ProFeature,
} from '@/lib/subscription';

interface SubscriptionDetails {
  tier: Tier;
  status: string;
  isTrialing: boolean;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  bypassed?: boolean;
}

interface UseSubscriptionReturn {
  /** Current subscription tier */
  tier: Tier;
  /** Whether the user has Pro access (tier or bypass) */
  isPro: boolean;
  /** Whether subscription data is loading */
  isLoading: boolean;
  /** Full subscription details */
  details: SubscriptionDetails | null;
  /** Check if user can access a specific Pro feature */
  canAccess: (feature: ProFeature) => boolean;
  /** Refresh subscription data from server */
  refresh: () => Promise<void>;
}

/**
 * Hook for managing subscription state.
 * When SUBSCRIPTION_BYPASS_ENABLED is true, isPro is always true
 * and no Pro-related UI should be shown.
 */
export function useSubscription(): UseSubscriptionReturn {
  const { user } = useAuth();
  const [tier, setTier] = useState<Tier>('free');
  const [details, setDetails] = useState<SubscriptionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(!SUBSCRIPTION_BYPASS_ENABLED);

  const refresh = useCallback(async () => {
    // If bypass is enabled, no need to fetch
    if (SUBSCRIPTION_BYPASS_ENABLED) {
      setTier('pro');
      setDetails({
        tier: 'pro',
        status: 'bypassed',
        isTrialing: false,
        trialEndsAt: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        bypassed: true,
      });
      setIsLoading(false);
      return;
    }

    if (!user) {
      setTier('free');
      setDetails(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(apiUrl('/api/subscription/status'), {
        headers,
      });

      if (response.ok) {
        const data: SubscriptionDetails = await response.json();
        setTier(data.tier);
        setDetails(data);
      } else {
        setTier('free');
        setDetails(null);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setTier('free');
      setDetails(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // When bypass is enabled, always Pro
  const isPro = SUBSCRIPTION_BYPASS_ENABLED || tier === 'pro';

  const canAccess = useCallback(
    (feature: ProFeature): boolean => {
      return isPro;
    },
    [isPro]
  );

  return {
    tier,
    isPro,
    isLoading,
    details,
    canAccess,
    refresh,
  };
}
