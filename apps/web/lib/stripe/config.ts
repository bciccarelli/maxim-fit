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

// Stripe price IDs for Pro subscription
export const STRIPE_PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID!;
export const STRIPE_PRO_ANNUAL_PRICE_ID = process.env.STRIPE_PRO_ANNUAL_PRICE_ID!;

// Trial period in days
export const TRIAL_PERIOD_DAYS = 7;

// Billing interval type
export type BillingInterval = 'month' | 'year';

// Prices for display
export const PRO_PRICES = {
  month: {
    amount: 9,
    currency: 'USD',
    interval: 'month' as const,
    priceId: STRIPE_PRO_PRICE_ID,
  },
  year: {
    amount: 79,
    currency: 'USD',
    interval: 'year' as const,
    priceId: STRIPE_PRO_ANNUAL_PRICE_ID,
    savings: '27%',
  },
} as const;

// Legacy export for backwards compatibility
export const PRO_PRICE = PRO_PRICES.month;
