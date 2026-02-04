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
}

export function UpgradeModal({
  visible,
  onClose,
  feature,
  onUpgrade,
  onRestore,
}: UpgradeModalProps) {
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>(
    'month'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const price =
    billingInterval === 'month' ? PRICING.monthly.amount : PRICING.annual.amount;

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      await onUpgrade(billingInterval);
    } catch (error) {
      console.error('Upgrade error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!onRestore) return;
    setIsRestoring(true);
    try {
      await onRestore();
    } catch (error) {
      console.error('Restore error:', error);
    } finally {
      setIsRestoring(false);
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
            <X size={24} color="#666" />
          </Pressable>
        </View>

        {/* Icon and Title */}
        <View style={styles.titleSection}>
          <View style={styles.iconContainer}>
            <Crown size={48} color="#2d5a2d" />
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
              <Check size={18} color="#2d5a2d" />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>

        {/* Upgrade Button */}
        <Pressable
          style={[styles.upgradeButton, isLoading && styles.buttonDisabled]}
          onPress={handleUpgrade}
          disabled={isLoading || isRestoring}
        >
          <Zap size={20} color="#fff" />
          <Text style={styles.upgradeButtonText}>
            {isLoading ? 'Loading...' : 'Start free trial'}
          </Text>
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
    backgroundColor: '#fff',
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
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a2e1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  billingOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  billingOptionActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  billingOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
  },
  billingOptionTextActive: {
    color: '#1a2e1a',
    fontWeight: '600',
  },
  savingsBadge: {
    backgroundColor: '#e8f5e9',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  savingsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2d5a2d',
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
    color: '#1a2e1a',
    marginTop: 4,
  },
  price: {
    fontSize: 56,
    fontWeight: '700',
    color: '#1a2e1a',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  priceInterval: {
    fontSize: 16,
    color: '#666',
    marginTop: 32,
    marginLeft: 2,
  },
  trialText: {
    fontSize: 14,
    color: '#2d5a2d',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 32,
  },
  benefitsContainer: {
    backgroundColor: '#f5f5f0',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
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
    color: '#333',
    flex: 1,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2d5a2d',
    borderRadius: 12,
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
    color: '#fff',
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  restoreButtonText: {
    fontSize: 14,
    color: '#2d5a2d',
    fontWeight: '500',
  },
  disclaimer: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});
