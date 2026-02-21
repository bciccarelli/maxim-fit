import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

/**
 * Register for push notifications and get the Expo push token.
 * Returns null if on simulator, permissions denied, or on web.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications only work on physical devices
  if (Platform.OS === 'web') {
    console.log('Push notifications not supported on web');
    return null;
  }

  // Check/request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return null;
  }

  // Get the project ID from app config
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.error('No EAS project ID found in app config');
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  } catch (error) {
    console.error('Failed to get push token:', error);
    return null;
  }
}

/**
 * Save the push token to Supabase for server-side push notifications.
 */
export async function savePushToken(token: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.log('No user session, skipping push token save');
    return;
  }

  try {
    const { error } = await supabase.from('device_tokens').upsert(
      {
        user_id: user.id,
        expo_push_token: token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,expo_push_token',
      }
    );

    if (error) {
      console.error('Failed to save push token:', error);
    } else {
      console.log('Push token saved successfully');
    }
  } catch (error) {
    console.error('Error saving push token:', error);
  }
}

/**
 * Remove a push token from Supabase (e.g., on logout).
 */
export async function removePushToken(token: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  try {
    await supabase
      .from('device_tokens')
      .delete()
      .eq('user_id', user.id)
      .eq('expo_push_token', token);
  } catch (error) {
    console.error('Error removing push token:', error);
  }
}

/**
 * Register push token and save to backend.
 * Call this after user authenticates.
 */
export async function setupPushNotifications(): Promise<void> {
  const token = await registerForPushNotifications();
  if (token) {
    await savePushToken(token);
  }
}
