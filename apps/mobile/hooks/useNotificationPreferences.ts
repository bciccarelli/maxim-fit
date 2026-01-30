import { useState, useEffect, useCallback } from 'react';
import {
  NotificationPreferences,
  NotificationCategory,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from '../lib/types/notifications';
import {
  getNotificationPreferences,
  saveNotificationPreferences,
} from '../lib/storage/notificationPreferences';

type CategoryPreferences = NotificationPreferences['categories'];

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const prefs = await getNotificationPreferences();
      setPreferences(prefs);
      setIsLoading(false);
    }
    load();
  }, []);

  const updatePreferences = useCallback(
    async (updates: Partial<NotificationPreferences>) => {
      if (!preferences) return;
      const updated = { ...preferences, ...updates };
      setPreferences(updated);
      await saveNotificationPreferences(updated);
    },
    [preferences]
  );

  const updateCategory = useCallback(
    async <K extends NotificationCategory>(
      category: K,
      updates: Partial<CategoryPreferences[K]>
    ) => {
      if (!preferences) return;
      const updated: NotificationPreferences = {
        ...preferences,
        categories: {
          ...preferences.categories,
          [category]: {
            ...preferences.categories[category],
            ...updates,
          },
        },
      };
      setPreferences(updated);
      await saveNotificationPreferences(updated);
    },
    [preferences]
  );

  const setAllEnabled = useCallback(
    async (enabled: boolean) => {
      const updated: NotificationPreferences = {
        enabled,
        categories: enabled
          ? preferences?.categories ?? DEFAULT_NOTIFICATION_PREFERENCES.categories
          : {
              schedule: { ...DEFAULT_NOTIFICATION_PREFERENCES.categories.schedule, enabled: false },
              meals: { enabled: false },
              supplements: { enabled: false },
              workouts: { enabled: false },
              hydration: { ...DEFAULT_NOTIFICATION_PREFERENCES.categories.hydration, enabled: false },
            },
      };
      setPreferences(updated);
      await saveNotificationPreferences(updated);
    },
    [preferences]
  );

  return {
    preferences,
    isLoading,
    updatePreferences,
    updateCategory,
    setAllEnabled,
  };
}
