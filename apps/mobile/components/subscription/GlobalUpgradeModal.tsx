import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';
import { useIAP } from '@/hooks/useIAP';
import { UpgradeModal } from './UpgradeModal';

/**
 * Global upgrade modal that's controlled by SubscriptionContext.
 * Renders the modal when showUpgradeModal() is called from anywhere in the app.
 * Place this at the app root level.
 */
export function GlobalUpgradeModal() {
  const {
    isUpgradeModalVisible,
    upgradeFeature,
    hideUpgradeModal,
    isBypassEnabled,
    refresh: refreshSubscription,
  } = useSubscriptionContext();

  const { purchase, restore, isPurchasing, isRestoring, error } = useIAP();

  // Don't render anything when bypass is enabled
  if (isBypassEnabled) {
    return null;
  }

  const handleUpgrade = useCallback(
    async (interval: 'month' | 'year') => {
      const productInterval = interval === 'month' ? 'monthly' : 'annual';

      try {
        const success = await purchase(productInterval);

        if (success) {
          // Refresh subscription status after successful purchase
          await refreshSubscription();
          hideUpgradeModal();
          Alert.alert(
            'Welcome to Pro!',
            'Your subscription is now active. Enjoy all Pro features!'
          );
        }
        // If not successful (cancelled), just stay on modal
      } catch (err) {
        console.error('[GlobalUpgradeModal] Purchase error:', err);
        Alert.alert(
          'Purchase Failed',
          error || 'An error occurred during purchase. Please try again.'
        );
      }
    },
    [purchase, refreshSubscription, hideUpgradeModal, error]
  );

  const handleRestore = useCallback(async () => {
    try {
      const success = await restore();

      if (success) {
        // Refresh subscription status after successful restore
        await refreshSubscription();
        hideUpgradeModal();
      }
    } catch (err) {
      console.error('[GlobalUpgradeModal] Restore error:', err);
      // Alert is already shown by useIAP hook
    }
  }, [restore, refreshSubscription, hideUpgradeModal]);

  return (
    <UpgradeModal
      visible={isUpgradeModalVisible}
      onClose={hideUpgradeModal}
      feature={upgradeFeature}
      onUpgrade={handleUpgrade}
      onRestore={handleRestore}
      isLoading={isPurchasing}
      isRestoring={isRestoring}
    />
  );
}
