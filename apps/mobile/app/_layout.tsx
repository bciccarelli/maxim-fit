import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ProtocolProvider } from '@/contexts/ProtocolContext';
import { ScheduleProvider } from '@/contexts/ScheduleContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { RatingPromptProvider, useRatingPromptContext } from '@/contexts/RatingPromptContext';
import { OnboardingProvider, useOnboarding } from '@/contexts/OnboardingContext';
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
  const { hasCompletedOnboarding } = useOnboarding();
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

  // 3-way redirect: auth → onboarding → app
  useEffect(() => {
    if (isLoading || hasCompletedOnboarding === null) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inAppGroup = segments[0] === '(app)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    if (!session && (inAppGroup || inOnboardingGroup)) {
      // Not authenticated — redirect to login
      router.replace('/login');
    } else if (session && inAuthGroup) {
      if (hasCompletedOnboarding) {
        // Authenticated + onboarded — go to app
        router.replace('/(app)/(tabs)/protocols');
      } else {
        // Authenticated + not onboarded — go to onboarding
        router.replace('/(onboarding)/goals');
      }
    } else if (session && inOnboardingGroup && hasCompletedOnboarding) {
      // Already onboarded but somehow in onboarding — redirect to app
      router.replace('/(app)/(tabs)/protocols');
    }
  }, [session, isLoading, segments, hasCompletedOnboarding]);

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
          <OnboardingProvider>
            <ProtocolProvider>
              <ScheduleProvider>
                <SubscriptionProvider>
                  <RatingPromptProvider>
                    <KeyboardAccessoryProvider>
                      <RootLayoutNav />
                      <GlobalUpgradeModal />
                    </KeyboardAccessoryProvider>
                  </RatingPromptProvider>
                </SubscriptionProvider>
              </ScheduleProvider>
            </ProtocolProvider>
          </OnboardingProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
