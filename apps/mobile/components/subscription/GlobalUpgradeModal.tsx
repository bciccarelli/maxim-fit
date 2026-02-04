import { useSubscriptionContext } from '@/contexts/SubscriptionContext';
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
  } = useSubscriptionContext();

  // Don't render anything when bypass is enabled
  if (isBypassEnabled) {
    return null;
  }

  const handleUpgrade = async (interval: 'month' | 'year') => {
    // TODO: Implement iOS IAP flow
    // For now, this will be connected to the IAP service once implemented
    console.log('Upgrade requested:', interval);
    hideUpgradeModal();
  };

  const handleRestore = async () => {
    // TODO: Implement restore purchases
    console.log('Restore requested');
  };

  return (
    <UpgradeModal
      visible={isUpgradeModalVisible}
      onClose={hideUpgradeModal}
      feature={upgradeFeature}
      onUpgrade={handleUpgrade}
      onRestore={handleRestore}
    />
  );
}
