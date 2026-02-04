import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { fetchApi } from '@/lib/api';
import type { NotificationData } from './scheduler';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register notification categories with action buttons
 * Call this during app initialization
 */
export async function registerNotificationCategories(): Promise<void> {
  await Notifications.setNotificationCategoryAsync('protocol_activity', [
    {
      identifier: 'COMPLETE',
      buttonTitle: 'Done',
      options: {
        opensAppToForeground: false,
      },
    },
    {
      identifier: 'SNOOZE',
      buttonTitle: 'Snooze 15m',
      options: {
        opensAppToForeground: false,
      },
    },
  ]);
}

/**
 * Log a completion via the API
 */
async function logCompletion(data: NotificationData): Promise<void> {
  try {
    await fetchApi('/api/compliance/log', {
      method: 'POST',
      body: JSON.stringify({
        protocolId: data.protocolId,
        activityType: data.type,
        activityIndex: data.activityIndex,
        activityName: data.activityName,
        scheduledDate: data.scheduledDate,
        scheduledTime: data.scheduledTime,
        skipped: false,
      }),
    });
  } catch (error) {
    console.error('Failed to log completion from notification:', error);
  }
}

/**
 * Snooze a notification by scheduling a new one
 */
async function snoozeNotification(data: NotificationData, minutes: number): Promise<void> {
  const snoozeTime = new Date();
  snoozeTime.setMinutes(snoozeTime.getMinutes() + minutes);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Snoozed: ${data.activityName}`,
      body: 'Reminder snoozed',
      data,
      sound: true,
      categoryIdentifier: 'protocol_activity',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: snoozeTime,
    },
  });
}

/**
 * Set up notification response listener
 * Call this during app initialization and store the subscription
 */
export function setupNotificationResponseListener(): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(async (response) => {
    const data = response.notification.request.content.data as NotificationData;
    const actionId = response.actionIdentifier;

    if (!data || !data.type) {
      // Not a protocol notification, ignore
      return;
    }

    if (actionId === 'COMPLETE') {
      // iOS action button: Log completion silently (no app open)
      await logCompletion(data);
    } else if (actionId === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      // User tapped notification body: Log + navigate to Progress tab
      await logCompletion(data);
      router.push('/(app)/(tabs)/progress');
    } else if (actionId === 'SNOOZE') {
      // Reschedule notification for 15 minutes later
      await snoozeNotification(data, 15);
    }
  });
}

/**
 * Set up notification received listener (while app is foregrounded)
 */
export function setupNotificationReceivedListener(): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener((notification) => {
    // Notification received while app is in foreground
    // We can handle this if needed, but default behavior shows the notification
    console.log('Notification received:', notification.request.content.title);
  });
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  if (existingStatus === 'granted') {
    return true;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Check if notifications are enabled
 */
export async function areNotificationsEnabled(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}
