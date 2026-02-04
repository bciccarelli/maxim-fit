/**
 * Rating prompt state and configuration types
 */

export interface RatingPromptState {
  /** Whether the user has already rated the app */
  hasRated: boolean;
  /** Whether the user has permanently declined to rate */
  hasDeclinedPermanently: boolean;
  /** ISO date string of last prompt shown */
  lastPromptDate: string | null;
  /** Total number of times user has been prompted */
  promptCount: number;
  /** Timestamps (epoch ms) of app opens for behavioral filtering */
  appOpenTimestamps: number[];
  /** Core actions completed (win moments) */
  coreActionsCompleted: CoreAction[];
  /** ISO date string when billing event occurred (trial → paid) */
  lastBillingEventDate: string | null;
}

export type CoreAction =
  | 'protocol_generated'
  | 'workout_completed'
  | 'meal_logged'
  | 'supplement_logged'
  | 'compliance_streak_3';

export const DEFAULT_RATING_PROMPT_STATE: RatingPromptState = {
  hasRated: false,
  hasDeclinedPermanently: false,
  lastPromptDate: null,
  promptCount: 0,
  appOpenTimestamps: [],
  coreActionsCompleted: [],
  lastBillingEventDate: null,
};

export const RATING_CONFIG = {
  /** Day of trial to start showing prompts (inclusive) */
  HONEYMOON_START_DAY: 3,
  /** Day of trial to stop showing prompts (inclusive) */
  HONEYMOON_END_DAY: 4,
  /** Hours after billing event to block prompts */
  BILLING_DEAD_ZONE_HOURS: 72,
  /** Minimum app opens in window to be eligible */
  MIN_APP_OPENS_48H: 3,
  /** Window for counting app opens (48 hours in ms) */
  APP_OPEN_WINDOW_MS: 48 * 60 * 60 * 1000,
  /** Minimum days between prompt attempts */
  MIN_DAYS_BETWEEN_PROMPTS: 30,
  /** Maximum number of prompt attempts */
  MAX_PROMPT_COUNT: 3,
  /** Trial period length in days */
  TRIAL_DAYS: 7,
  /** Maximum timestamps to keep in storage (cleanup threshold) */
  MAX_STORED_TIMESTAMPS: 50,
} as const;
