// =============================================================================
// Subscription Types and Configuration
// =============================================================================

export type Tier = 'free' | 'pro';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'canceled'
  | 'past_due'
  | 'unpaid'
  | 'incomplete'
  | 'inactive';

// Features that require Pro subscription
export const PRO_FEATURES = [
  'verify',
  'modify',
  'ask',
  'import',
  'critiqueApply',
] as const;

export type ProFeature = (typeof PRO_FEATURES)[number];

// Tier limits for non-Pro features
export const TIER_LIMITS = {
  free: {
    savedProtocols: 1,
    versionHistory: 3,
  },
  pro: {
    savedProtocols: Infinity,
    versionHistory: Infinity,
  },
} as const;

// Trial period in days
export const TRIAL_PERIOD_DAYS = 7;

// Billing interval type
export type BillingInterval = 'month' | 'year';

// Price display information (without Stripe price IDs - those are server-side)
export const PRO_PRICE_DISPLAY = {
  month: {
    amount: 9,
    currency: 'USD',
    interval: 'month' as const,
  },
  year: {
    amount: 79,
    currency: 'USD',
    interval: 'year' as const,
    savings: '27%',
  },
} as const;
