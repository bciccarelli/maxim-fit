import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from '../types/notifications';
import { supabase } from '../supabase';

const STORAGE_KEY = 'notification_preferences';

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as NotificationPreferences;
    }
    return DEFAULT_NOTIFICATION_PREFERENCES;
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export async function saveNotificationPreferences(
  preferences: NotificationPreferences
): Promise<void> {
  // Save to AsyncStorage for offline access
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));

  // Sync to Supabase for server-side push notifications (fire-and-forget)
  syncPreferencesToSupabase(preferences).catch((error) => {
    console.error('Failed to sync notification preferences to Supabase:', error);
  });
}

export async function resetNotificationPreferences(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

/**
 * Sync notification preferences to Supabase for server-side push notification scheduling.
 * This runs in the background and doesn't block the UI.
 */
async function syncPreferencesToSupabase(preferences: NotificationPreferences): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from('notification_preferences').upsert(
    {
      user_id: user.id,
      enabled: preferences.enabled,
      schedule_enabled: preferences.categories.schedule.enabled,
      schedule_wake_time: preferences.categories.schedule.wakeTime,
      schedule_sleep_time: preferences.categories.schedule.sleepTime,
      schedule_activity_blocks: preferences.categories.schedule.activityBlocks,
      meals_enabled: preferences.categories.meals.enabled,
      supplements_enabled: preferences.categories.supplements.enabled,
      workouts_enabled: preferences.categories.workouts.enabled,
      hydration_enabled: preferences.categories.hydration.enabled,
      hydration_interval_minutes: preferences.categories.hydration.intervalMinutes,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'user_id',
    }
  );

  if (error) {
    throw error;
  }
}

/**
 * Load preferences from Supabase and merge with local storage.
 * Call this on app start to ensure preferences are in sync.
 */
export async function loadPreferencesFromSupabase(): Promise<NotificationPreferences | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error || !data) return null;

  // Convert Supabase format back to app format
  const preferences: NotificationPreferences = {
    enabled: data.enabled,
    categories: {
      schedule: {
        enabled: data.schedule_enabled,
        wakeTime: data.schedule_wake_time,
        sleepTime: data.schedule_sleep_time,
        activityBlocks: data.schedule_activity_blocks,
      },
      meals: { enabled: data.meals_enabled },
      supplements: { enabled: data.supplements_enabled },
      workouts: { enabled: data.workouts_enabled },
      hydration: {
        enabled: data.hydration_enabled,
        intervalMinutes: data.hydration_interval_minutes,
      },
    },
  };

  // Update local storage with server preferences
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));

  return preferences;
}
