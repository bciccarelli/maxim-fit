import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { useState } from 'react';
import { X, Crown, Check, Zap } from 'lucide-react-native';
import { PRICING } from '@/lib/subscription';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/lib/theme';

const PRO_BENEFITS = [
  'AI Verification with Google Search',
  'AI-powered protocol modifications',
  'Unlimited Q&A about your protocol',
  'Import and parse existing protocols',
  'Unlimited saved protocols',
  'Full version history',
];

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  feature: string | null;
  onUpgrade: (interval: 'month' | 'year') => Promise<void>;
  onRestore?: () => Promise<void>;
  /** External loading state for purchase in progress */
  isLoading?: boolean;
  /** External loading state for restore in progress */
  isRestoring?: boolean;
}

export function UpgradeModal({
  visible,
  onClose,
  feature,
  onUpgrade,
  onRestore,
  isLoading: externalIsLoading,
  isRestoring: externalIsRestoring,
}: UpgradeModalProps) {
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>(
    'month'
  );
  const [internalIsLoading, setInternalIsLoading] = useState(false);
  const [internalIsRestoring, setInternalIsRestoring] = useState(false);

  // Use external state if provided, otherwise use internal state
  const isLoading = externalIsLoading ?? internalIsLoading;
  const isRestoring = externalIsRestoring ?? internalIsRestoring;

  const price =
    billingInterval === 'month' ? PRICING.monthly.amount : PRICING.annual.amount;

  const handleUpgrade = async () => {
    if (externalIsLoading === undefined) {
      setInternalIsLoading(true);
    }
    try {
      await onUpgrade(billingInterval);
    } catch (error) {
      console.error('Upgrade error:', error);
    } finally {
      if (externalIsLoading === undefined) {
        setInternalIsLoading(false);
      }
    }
  };

  const handleRestore = async () => {
    if (!onRestore) return;
    if (externalIsRestoring === undefined) {
      setInternalIsRestoring(true);
    }
    try {
      await onRestore();
    } catch (error) {
      console.error('Restore error:', error);
    } finally {
      if (externalIsRestoring === undefined) {
        setInternalIsRestoring(false);
      }
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>

        {/* Icon and Title */}
        <View style={styles.titleSection}>
          <View style={styles.iconContainer}>
            <Crown size={48} color={colors.primaryContainer} />
          </View>
          <Text style={styles.title}>Upgrade to Pro</Text>
          {feature && (
            <Text style={styles.subtitle}>
              {feature} requires a Pro subscription
            </Text>
          )}
        </View>

        {/* Billing Toggle */}
        <View style={styles.billingToggle}>
          <Pressable
            style={[
              styles.billingOption,
              billingInterval === 'month' && styles.billingOptionActive,
            ]}
            onPress={() => setBillingInterval('month')}
          >
            <Text
              style={[
                styles.billingOptionText,
                billingInterval === 'month' && styles.billingOptionTextActive,
              ]}
            >
              Monthly
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.billingOption,
              billingInterval === 'year' && styles.billingOptionActive,
            ]}
            onPress={() => setBillingInterval('year')}
          >
            <Text
              style={[
                styles.billingOptionText,
                billingInterval === 'year' && styles.billingOptionTextActive,
              ]}
            >
              Annual
            </Text>
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>
                Save {PRICING.annual.savings}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Price */}
        <View style={styles.priceContainer}>
          <Text style={styles.priceSymbol}>$</Text>
          <Text style={styles.price}>{price}</Text>
          <Text style={styles.priceInterval}>
            /{billingInterval === 'month' ? 'mo' : 'yr'}
          </Text>
        </View>
        <Text style={styles.trialText}>
          Start with a {PRICING.trialDays}-day free trial
        </Text>

        {/* Benefits */}
        <View style={styles.benefitsContainer}>
          <Text style={styles.benefitsTitle}>Everything in Pro:</Text>
          {PRO_BENEFITS.map((benefit) => (
            <View key={benefit} style={styles.benefitRow}>
              <Check size={18} color={colors.primaryContainer} />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>

        {/* Upgrade Button */}
        <Pressable
          style={[isLoading && styles.buttonDisabled]}
          onPress={handleUpgrade}
          disabled={isLoading || isRestoring}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryContainer]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.upgradeButton}
          >
            <Zap size={20} color={colors.onPrimary} />
            <Text style={styles.upgradeButtonText}>
              {isLoading ? 'Loading...' : 'Start free trial'}
            </Text>
          </LinearGradient>
        </Pressable>

        {/* Restore Button */}
        {onRestore && (
          <Pressable
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={isLoading || isRestoring}
          >
            <Text style={styles.restoreButtonText}>
              {isRestoring ? 'Restoring...' : 'Restore purchases'}
            </Text>
          </Pressable>
        )}

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          Cancel anytime. No charge until your free trial ends.
        </Text>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  closeButton: {
    padding: 4,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.selectedBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 0,
    padding: 4,
    marginBottom: 24,
  },
  billingOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 0,
    alignItems: 'center',
  },
  billingOptionActive: {
    backgroundColor: colors.surfaceContainerLowest,
  },
  billingOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  billingOptionTextActive: {
    color: colors.onSurface,
    fontWeight: '600',
  },
  savingsBadge: {
    backgroundColor: colors.selectedBg,
    borderRadius: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  savingsText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryContainer,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: 4,
  },
  priceSymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.onSurface,
    marginTop: 4,
  },
  price: {
    fontSize: 56,
    fontWeight: '700',
    color: colors.onSurface,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  priceInterval: {
    fontSize: 16,
    color: colors.onSurfaceVariant,
    marginTop: 32,
    marginLeft: 2,
  },
  trialText: {
    fontSize: 14,
    color: colors.primaryContainer,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 32,
  },
  benefitsContainer: {
    backgroundColor: colors.surface,
    borderRadius: 0,
    padding: 20,
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 15,
    color: colors.onSurface,
    flex: 1,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    paddingVertical: 16,
    gap: 8,
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  upgradeButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.onPrimary,
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  restoreButtonText: {
    fontSize: 14,
    color: colors.primaryContainer,
    fontWeight: '500',
  },
  disclaimer: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
  },
});
