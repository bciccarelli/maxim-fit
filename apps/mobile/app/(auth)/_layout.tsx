import { Stack } from 'expo-router';
import { colors } from '@/lib/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.onSurface,
        },
        headerTintColor: colors.surfaceContainerLowest,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    />
  );
}
