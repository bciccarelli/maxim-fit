import { Stack } from 'expo-router';
import { colors } from '@/lib/theme';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="protocol/[id]"
        options={{
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.onSurface,
          },
          headerTintColor: colors.surfaceContainerLowest,
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerBackTitle: 'Back',
        }}
      />
    </Stack>
  );
}
