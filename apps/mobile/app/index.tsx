import { Redirect } from 'expo-router';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { colors } from '@/lib/theme';

export default function Index() {
  const { session, isLoading } = useAuth();
  const { hasCompletedOnboarding } = useOnboarding();

  if (isLoading || hasCompletedOnboarding === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primaryContainer} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!hasCompletedOnboarding) {
    return <Redirect href="/(onboarding)/goals" />;
  }

  return <Redirect href="/(app)/(tabs)/protocols" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
});
