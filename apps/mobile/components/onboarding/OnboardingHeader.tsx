import { View, Text, StyleSheet } from 'react-native';
import { OnboardingProgressBar } from './OnboardingProgressBar';
import { colors, spacing, fontSize } from '@/lib/theme';

interface OnboardingHeaderProps {
  currentStep: number;
  totalSteps: number;
  title: string;
  description: string;
}

export function OnboardingHeader({ currentStep, totalSteps, title, description }: OnboardingHeaderProps) {
  return (
    <View style={styles.container}>
      <OnboardingProgressBar currentStep={currentStep} totalSteps={totalSteps} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: spacing.md,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
  },
});
