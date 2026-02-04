import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import {
  registerNotificationCategories,
  setupNotificationResponseListener,
  setupNotificationReceivedListener,
} from '@/lib/notifications/handlers';
import type { EventSubscription } from 'expo-notifications';

function RootLayoutNav() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const notificationResponseSubscription = useRef<EventSubscription | null>(null);
  const notificationReceivedSubscription = useRef<EventSubscription | null>(null);

  // Initialize notification handlers
  useEffect(() => {
    // Register notification categories (iOS action buttons)
    registerNotificationCategories();

    // Set up notification listeners
    notificationResponseSubscription.current = setupNotificationResponseListener();
    notificationReceivedSubscription.current = setupNotificationReceivedListener();

    return () => {
      // Clean up subscriptions
      notificationResponseSubscription.current?.remove();
      notificationReceivedSubscription.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inAppGroup = segments[0] === '(app)';

    if (!session && inAppGroup) {
      // Redirect to login if not authenticated
      router.replace('/login');
    } else if (session && inAuthGroup) {
      // Redirect to app if authenticated
      router.replace('/(app)/(tabs)/protocols');
    }
  }, [session, isLoading, segments]);

  return (
    <>
      <StatusBar style="auto" />
      <Slot />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
