import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ProtocolProvider } from '@/contexts/ProtocolContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { RatingPromptProvider, useRatingPromptContext } from '@/contexts/RatingPromptContext';
import { GlobalUpgradeModal } from '@/components/subscription/GlobalUpgradeModal';
import {
  registerNotificationCategories,
  setupNotificationResponseListener,
  setupNotificationReceivedListener,
} from '@/lib/notifications/handlers';
import { setupPushNotifications } from '@/lib/notifications/pushToken';
import { KeyboardAccessoryProvider } from '@/components/shared/KeyboardAccessoryProvider';
import type { EventSubscription } from 'expo-notifications';

function RootLayoutNav() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { trackAppOpen } = useRatingPromptContext();
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

  // Track app open for rating prompt behavioral filtering
  useEffect(() => {
    trackAppOpen();
  }, [trackAppOpen]);

  // Register push token when user is authenticated
  useEffect(() => {
    if (session?.user) {
      setupPushNotifications();
    }
  }, [session?.user?.id]);

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ProtocolProvider>
            <SubscriptionProvider>
              <RatingPromptProvider>
                <KeyboardAccessoryProvider>
                  <RootLayoutNav />
                  <GlobalUpgradeModal />
                </KeyboardAccessoryProvider>
              </RatingPromptProvider>
            </SubscriptionProvider>
          </ProtocolProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
