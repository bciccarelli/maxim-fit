import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  RatingPromptState,
  DEFAULT_RATING_PROMPT_STATE,
  RATING_CONFIG,
} from '../types/ratingPrompt';

const STORAGE_KEY = 'rating_prompt_state';

export async function getRatingPromptState(): Promise<RatingPromptState> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as RatingPromptState;
    }
    return DEFAULT_RATING_PROMPT_STATE;
  } catch {
    return DEFAULT_RATING_PROMPT_STATE;
  }
}

export async function saveRatingPromptState(
  state: RatingPromptState
): Promise<void> {
  // Clean up old timestamps before saving
  const cutoff = Date.now() - RATING_CONFIG.APP_OPEN_WINDOW_MS;
  const cleanedState: RatingPromptState = {
    ...state,
    appOpenTimestamps: state.appOpenTimestamps
      .filter((ts) => ts > cutoff)
      .slice(-RATING_CONFIG.MAX_STORED_TIMESTAMPS),
  };

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cleanedState));
}

export async function resetRatingPromptState(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
