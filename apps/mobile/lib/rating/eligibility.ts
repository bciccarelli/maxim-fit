import { RatingPromptState, RATING_CONFIG } from '../types/ratingPrompt';

interface SubscriptionDetails {
  isTrialing: boolean;
  trialEndsAt: string | null;
  status: string;
}

export interface EligibilityResult {
  eligible: boolean;
  reason: string;
}

/**
 * Main eligibility check - determines if we should show the rating prompt
 */
export function isEligibleForPrompt(
  state: RatingPromptState,
  subscription: SubscriptionDetails | null
): EligibilityResult {
  // 1. Already rated
  if (state.hasRated) {
    return { eligible: false, reason: 'already_rated' };
  }

  // 2. Permanently declined
  if (state.hasDeclinedPermanently) {
    return { eligible: false, reason: 'permanently_declined' };
  }

  // 3. Max prompts reached
  if (state.promptCount >= RATING_CONFIG.MAX_PROMPT_COUNT) {
    return { eligible: false, reason: 'max_prompts_reached' };
  }

  // 4. Cooldown period (30 days between prompts)
  if (state.lastPromptDate && !hasPassedCooldown(state.lastPromptDate)) {
    return { eligible: false, reason: 'cooldown_active' };
  }

  // 5. No core action completed (no "win moment")
  if (state.coreActionsCompleted.length === 0) {
    return { eligible: false, reason: 'no_core_action' };
  }

  // 6. Not enough app opens (behavioral filter)
  if (!hasEnoughAppOpens(state.appOpenTimestamps)) {
    return { eligible: false, reason: 'insufficient_app_opens' };
  }

  // 7. In billing dead zone (72h after billing event)
  if (isInBillingDeadZone(state.lastBillingEventDate)) {
    return { eligible: false, reason: 'billing_dead_zone' };
  }

  // 8. Check trial window OR post-trial eligibility
  if (subscription?.isTrialing && subscription.trialEndsAt) {
    // During trial: only show in honeymoon window (Day 3-4)
    if (!isInHoneymoonWindow(subscription.trialEndsAt)) {
      return { eligible: false, reason: 'outside_honeymoon_window' };
    }
  }
  // If not trialing and passed dead zone check, user is eligible

  return { eligible: true, reason: 'eligible' };
}

/**
 * Check if user is in honeymoon window (Day 3-4 of trial)
 */
export function isInHoneymoonWindow(trialEndsAt: string): boolean {
  const trialEnd = new Date(trialEndsAt);
  const trialStart = new Date(
    trialEnd.getTime() - RATING_CONFIG.TRIAL_DAYS * 24 * 60 * 60 * 1000
  );
  const now = new Date();

  const daysSinceTrialStart = Math.floor(
    (now.getTime() - trialStart.getTime()) / (24 * 60 * 60 * 1000)
  );

  return (
    daysSinceTrialStart >= RATING_CONFIG.HONEYMOON_START_DAY &&
    daysSinceTrialStart <= RATING_CONFIG.HONEYMOON_END_DAY
  );
}

/**
 * Check if user is in billing dead zone (72h after billing event)
 */
export function isInBillingDeadZone(lastBillingEventDate: string | null): boolean {
  if (!lastBillingEventDate) {
    return false;
  }

  const billingDate = new Date(lastBillingEventDate);
  const hoursSinceBilling =
    (Date.now() - billingDate.getTime()) / (60 * 60 * 1000);

  return hoursSinceBilling < RATING_CONFIG.BILLING_DEAD_ZONE_HOURS;
}

/**
 * Check if user has enough app opens in the last 48 hours
 */
export function hasEnoughAppOpens(timestamps: number[]): boolean {
  const cutoff = Date.now() - RATING_CONFIG.APP_OPEN_WINDOW_MS;
  const recentOpens = timestamps.filter((ts) => ts > cutoff);
  return recentOpens.length >= RATING_CONFIG.MIN_APP_OPENS_48H;
}

/**
 * Check if cooldown period has passed since last prompt
 */
export function hasPassedCooldown(lastPromptDate: string): boolean {
  const lastPrompt = new Date(lastPromptDate);
  const daysSincePrompt = Math.floor(
    (Date.now() - lastPrompt.getTime()) / (24 * 60 * 60 * 1000)
  );
  return daysSincePrompt >= RATING_CONFIG.MIN_DAYS_BETWEEN_PROMPTS;
}

/**
 * Get trial day (0-indexed from trial start)
 */
export function getTrialDay(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null;

  const trialEnd = new Date(trialEndsAt);
  const trialStart = new Date(
    trialEnd.getTime() - RATING_CONFIG.TRIAL_DAYS * 24 * 60 * 60 * 1000
  );
  const now = new Date();

  return Math.floor(
    (now.getTime() - trialStart.getTime()) / (24 * 60 * 60 * 1000)
  );
}
