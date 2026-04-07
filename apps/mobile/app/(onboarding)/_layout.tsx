import { Stack } from 'expo-router';
import { colors } from '@/lib/theme';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 250,
        gestureEnabled: false,
        contentStyle: { backgroundColor: colors.surface },
      }}
    />
  );
}
