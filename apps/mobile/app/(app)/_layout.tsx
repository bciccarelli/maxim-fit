import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="protocol/[id]"
        options={{
          headerShown: true,
          headerStyle: {
            backgroundColor: '#1a2e1a',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerBackTitle: 'Back',
        }}
      />
    </Stack>
  );
}
