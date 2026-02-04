/**
 * Subscription-related constants and utilities for the mobile app.
 */

/**
 * When true, bypasses all subscription checks and hides Pro-related UI.
 * Everyone gets Pro features, no badges or lock icons shown.
 */
export const SUBSCRIPTION_BYPASS_ENABLED =
  process.env.EXPO_PUBLIC_BYPASS_SUBSCRIPTION === 'true';

/**
 * Features that require a Pro subscription.
 */
export const PRO_FEATURES = [
  'verify',
  'modify',
  'ask',
  'import',
  'critiqueApply',
] as const;

export type ProFeature = (typeof PRO_FEATURES)[number];

/**
 * User subscription tiers.
 */
export type Tier = 'free' | 'pro';

/**
 * Pro feature display names for the upgrade modal.
 */
export const PRO_FEATURE_LABELS: Record<ProFeature, string> = {
  verify: 'AI Verification',
  modify: 'AI Modification',
  ask: 'Protocol Q&A',
  import: 'Import Protocol',
  critiqueApply: 'Apply Critiques',
};

/**
 * Pricing configuration.
 */
export const PRICING = {
  monthly: {
    amount: 9,
    interval: 'month' as const,
  },
  annual: {
    amount: 79,
    interval: 'year' as const,
    savings: '27%',
  },
  trialDays: 7,
};
