import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import {
  SUBSCRIPTION_BYPASS_ENABLED,
  type Tier,
  type ProFeature,
} from '@/lib/subscription';

interface SubscriptionContextValue {
  /** Current subscription tier */
  tier: Tier;
  /** Whether the user has Pro access */
  isPro: boolean;
  /** Whether subscription data is loading */
  isLoading: boolean;
  /** Check if user can access a specific Pro feature */
  canAccess: (feature: ProFeature) => boolean;
  /** Refresh subscription data from server */
  refresh: () => Promise<void>;
  /** Show the upgrade modal for a specific feature */
  showUpgradeModal: (feature: string) => void;
  /** Hide the upgrade modal */
  hideUpgradeModal: () => void;
  /** Whether the upgrade modal is visible */
  isUpgradeModalVisible: boolean;
  /** The feature that triggered the upgrade modal */
  upgradeFeature: string | null;
  /** Whether subscription bypass is enabled (for hiding Pro UI) */
  isBypassEnabled: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(
  null
);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const subscription = useSubscription();
  const [isUpgradeModalVisible, setIsUpgradeModalVisible] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<string | null>(null);

  const showUpgradeModal = useCallback((feature: string) => {
    // Never show upgrade modal when bypass is enabled
    if (SUBSCRIPTION_BYPASS_ENABLED) {
      return;
    }
    setUpgradeFeature(feature);
    setIsUpgradeModalVisible(true);
  }, []);

  const hideUpgradeModal = useCallback(() => {
    setIsUpgradeModalVisible(false);
    setUpgradeFeature(null);
  }, []);

  const value: SubscriptionContextValue = {
    ...subscription,
    showUpgradeModal,
    hideUpgradeModal,
    isUpgradeModalVisible,
    upgradeFeature,
    isBypassEnabled: SUBSCRIPTION_BYPASS_ENABLED,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

/**
 * Hook to access subscription context.
 * Must be used within a SubscriptionProvider.
 */
export function useSubscriptionContext(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error(
      'useSubscriptionContext must be used within a SubscriptionProvider'
    );
  }
  return context;
}
