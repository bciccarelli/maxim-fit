import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { OnboardingFooter } from '@/components/onboarding/OnboardingFooter';
import { GoalsStep } from '@/components/protocol/wizard/GoalsStep';
import { colors } from '@/lib/theme';
import { useState } from 'react';

export default function GoalsScreen() {
  const router = useRouter();
  const { goals, setGoals } = useOnboarding();
  const [showValidation, setShowValidation] = useState(false);

  const handleNext = () => {
    if (goals.length === 0) {
      setShowValidation(true);
      return;
    }
    router.push('/(onboarding)/requirements');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <OnboardingHeader
          currentStep={0}
          totalSteps={3}
          title="Your health goals"
          description="Add goals and adjust their relative importance. We'll optimize your protocol to maximize these."
        />
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <GoalsStep
            goals={goals}
            onChange={setGoals}
            showValidation={showValidation}
          />
        </ScrollView>
        <OnboardingFooter
          onNext={handleNext}
          nextDisabled={false}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
});
