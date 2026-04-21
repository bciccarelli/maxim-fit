import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { OnboardingFooter } from '@/components/onboarding/OnboardingFooter';
import { GoalsStep } from '@/components/protocol/wizard/GoalsStep';
import { ImportProtocolSheet } from '@/components/protocol/ImportProtocolSheet';
import { armProtocolEditingTip } from '@/lib/storage/onboardingTipsStorage';
import { colors } from '@/lib/theme';
import { useState } from 'react';

export default function GoalsScreen() {
  const router = useRouter();
  const { goals, setGoals, markOnboardingComplete } = useOnboarding();
  const [showValidation, setShowValidation] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const handleNext = () => {
    if (goals.length === 0) {
      setShowValidation(true);
      return;
    }
    router.push('/(onboarding)/requirements');
  };

  const handleImportComplete = async () => {
    await armProtocolEditingTip();
    await markOnboardingComplete();
    router.replace('/(app)/(tabs)/protocols');
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
          <View style={styles.importRow}>
            <Text style={styles.importText}>Have an existing protocol?</Text>
            <Pressable onPress={() => setShowImport(true)} hitSlop={8}>
              <Text style={styles.importLink}>Import it →</Text>
            </Pressable>
          </View>
        </ScrollView>
        <OnboardingFooter
          onNext={handleNext}
          nextDisabled={false}
        />
      </KeyboardAvoidingView>
      <ImportProtocolSheet
        visible={showImport}
        onClose={() => setShowImport(false)}
        onComplete={handleImportComplete}
      />
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
  importRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 12,
  },
  importText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  importLink: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryContainer,
  },
});
