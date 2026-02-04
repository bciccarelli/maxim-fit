import { Pressable, View, StyleSheet, type ViewStyle } from 'react-native';
import { Lock } from 'lucide-react-native';
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';
import { PRO_FEATURE_LABELS, type ProFeature } from '@/lib/subscription';

interface ProFeatureButtonProps {
  /** The Pro feature this button is gating */
  feature: ProFeature;
  /** Handler when button is pressed (only called if user has access) */
  onPress: () => void;
  /** Button content */
  children: React.ReactNode;
  /** Additional styles for the button */
  style?: ViewStyle | ViewStyle[];
  /** Whether the button is disabled (independent of Pro status) */
  disabled?: boolean;
}

/**
 * A button wrapper that gates access to Pro features.
 *
 * Behavior:
 * - When bypass is enabled: renders children normally (no Pro UI)
 * - When user is Pro: renders children normally
 * - When user is free tier: shows lock badge, opens upgrade modal on press
 */
export function ProFeatureButton({
  feature,
  onPress,
  children,
  style,
  disabled = false,
}: ProFeatureButtonProps) {
  const { canAccess, showUpgradeModal, isBypassEnabled } =
    useSubscriptionContext();

  const hasAccess = canAccess(feature);

  const handlePress = () => {
    if (hasAccess) {
      onPress();
    } else {
      const featureLabel = PRO_FEATURE_LABELS[feature] || feature;
      showUpgradeModal(featureLabel);
    }
  };

  // When bypass is enabled or user has access, render without lock
  if (isBypassEnabled || hasAccess) {
    return (
      <Pressable style={style} onPress={onPress} disabled={disabled}>
        {children}
      </Pressable>
    );
  }

  // User is free tier - show lock badge
  return (
    <Pressable
      style={[style, styles.lockedButton]}
      onPress={handlePress}
      disabled={disabled}
    >
      {children}
      <View style={styles.lockBadge}>
        <Lock size={10} color="#fff" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lockedButton: {
    opacity: 0.8,
  },
  lockBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#666',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
});
