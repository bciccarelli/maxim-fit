import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { OnboardingFooter } from '@/components/onboarding/OnboardingFooter';
import { PersonalInfoStep } from '@/components/protocol/wizard/PersonalInfoStep';
import { colors } from '@/lib/theme';

export default function PersonalInfoScreen() {
  const router = useRouter();
  const { personalInfo, setPersonalInfo } = useOnboarding();

  const handleNext = () => {
    router.push('/(onboarding)/generating');
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
          currentStep={2}
          totalSteps={3}
          title="About you (optional)"
          description="All fields are optional. Anything you share helps us calibrate nutrition targets, training load, and recovery — but you can skip and generate a protocol right away."
        />
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <PersonalInfoStep
            personalInfo={personalInfo}
            onChange={setPersonalInfo}
          />
        </ScrollView>
        <OnboardingFooter
          onNext={handleNext}
          onBack={handleBack}
          nextLabel="Generate protocol"
          showGenerateIcon
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
