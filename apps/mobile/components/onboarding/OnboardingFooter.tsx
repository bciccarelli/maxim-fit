import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronLeft, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, fontSize } from '@/lib/theme';

interface OnboardingFooterProps {
  onNext: () => void;
  onBack?: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  showGenerateIcon?: boolean;
}

export function OnboardingFooter({
  onNext,
  onBack,
  nextDisabled = false,
  nextLabel = 'Next',
  showGenerateIcon = false,
}: OnboardingFooterProps) {
  return (
    <View style={styles.container}>
      {onBack ? (
        <Pressable onPress={onBack} style={styles.backButton}>
          <ChevronLeft size={20} color={colors.onSurfaceVariant} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      ) : (
        <View style={styles.backPlaceholder} />
      )}

      <Pressable
        style={[styles.nextWrapper, nextDisabled && styles.nextDisabledWrapper]}
        onPress={onNext}
        disabled={nextDisabled}
      >
        {nextDisabled ? (
          <View style={[styles.nextButton, styles.nextButtonDisabled]}>
            {showGenerateIcon && <Sparkles size={18} color={colors.onPrimary} />}
            <Text style={styles.nextButtonText}>{nextLabel}</Text>
          </View>
        ) : (
          <LinearGradient
            colors={[colors.primary, colors.primaryContainer]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextButton}
          >
            {showGenerateIcon && <Sparkles size={18} color={colors.onPrimary} />}
            <Text style={styles.nextButtonText}>{nextLabel}</Text>
          </LinearGradient>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: colors.surfaceContainerLowest,
    gap: spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: 2,
  },
  backText: {
    fontSize: fontSize.sm,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  backPlaceholder: {
    width: 60,
  },
  nextWrapper: {
    flex: 1,
  },
  nextDisabledWrapper: {
    opacity: 1,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  nextButtonDisabled: {
    backgroundColor: colors.outlineVariant,
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.onPrimary,
  },
});
