import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { OnboardingFooter } from '@/components/onboarding/OnboardingFooter';
import { RequirementsStep } from '@/components/protocol/wizard/RequirementsStep';
import { colors } from '@/lib/theme';

export default function RequirementsScreen() {
  const router = useRouter();
  const { requirements, setRequirements } = useOnboarding();

  const handleNext = () => {
    router.push('/(onboarding)/personal-info');
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <OnboardingHeader
          currentStep={1}
          totalSteps={3}
          title="Hard requirements"
          description="Any constraints your protocol must respect — work schedule, workout frequency, bedtime, etc. This step is optional."
        />
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <RequirementsStep
            requirements={requirements}
            onChange={setRequirements}
          />
        </ScrollView>
        <OnboardingFooter
          onNext={handleNext}
          onBack={handleBack}
          nextLabel="Next"
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
