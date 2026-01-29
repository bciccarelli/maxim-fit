import { createClient } from '@/lib/supabase/server';
import type { Tier, SubscriptionStatus, ProFeature } from './config';
import { PRO_FEATURES } from './config';

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  status: SubscriptionStatus;
  tier: Tier;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trial_end: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get the user's subscription from the database
 */
export async function getUserSubscription(
  userId: string
): Promise<Subscription | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Subscription;
}

/**
 * Get the user's current tier based on subscription status
 */
export async function getUserTier(userId: string): Promise<Tier> {
  const subscription = await getUserSubscription(userId);

  if (!subscription) {
    return 'free';
  }

  // Active or trialing subscriptions get their tier
  if (subscription.status === 'active' || subscription.status === 'trialing') {
    return subscription.tier;
  }

  // All other statuses (canceled, past_due, etc.) default to free
  return 'free';
}

/**
 * Check if a tier has access to Pro features
 */
export function isPro(tier: Tier): boolean {
  return tier === 'pro';
}

/**
 * Check if a user can access a specific Pro feature
 */
export function canAccessFeature(tier: Tier, feature: ProFeature): boolean {
  if (!PRO_FEATURES.includes(feature)) {
    return true; // Unknown features are allowed
  }
  return isPro(tier);
}

/**
 * Get subscription details for display (includes formatted dates, trial info, etc.)
 */
export async function getSubscriptionDetails(userId: string) {
  const subscription = await getUserSubscription(userId);
  const tier = await getUserTier(userId);

  if (!subscription) {
    return {
      tier,
      status: 'inactive' as SubscriptionStatus,
      isTrialing: false,
      trialEndsAt: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    };
  }

  const isTrialing = subscription.status === 'trialing';
  const trialEndsAt = subscription.trial_end
    ? new Date(subscription.trial_end)
    : null;
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end)
    : null;

  return {
    tier,
    status: subscription.status,
    isTrialing,
    trialEndsAt,
    currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
}
