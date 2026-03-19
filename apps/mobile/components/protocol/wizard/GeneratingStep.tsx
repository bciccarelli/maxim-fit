import { View, Text, StyleSheet, ActivityIndicator, Pressable, Platform } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import type { GeneratingStepProps } from './types';
import { colors, spacing, borderRadius, fontSize } from '@/lib/theme';

type Stage = 'generating' | 'evaluating' | 'complete';

const STAGES: { key: Stage; label: string }[] = [
  { key: 'generating', label: 'Generating protocol' },
  { key: 'evaluating', label: 'Evaluating with AI' },
  { key: 'complete', label: 'Saving protocol' },
];

function getCurrentStage(streamedText: string): Stage {
  if (!streamedText) return 'generating';
  // The API sends stage messages that include "evaluating"
  if (streamedText.includes('"stage":"evaluating"') || streamedText.includes('"stage": "evaluating"')) {
    return 'evaluating';
  }
  return 'generating';
}

export function GeneratingStep({ streamedText, error, onRetry }: GeneratingStepProps) {
  const currentStage = getCurrentStage(streamedText);

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Generation failed</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Creating your protocol...</Text>
      <Text style={styles.subtitle}>
        This may take a minute. We're researching and optimizing your personalized health protocol.
      </Text>

      <View style={styles.stagesList}>
        {STAGES.map((stage, index) => {
          const stageIndex = STAGES.findIndex(s => s.key === currentStage);
          const isComplete = index < stageIndex;
          const isCurrent = index === stageIndex;

          return (
            <View key={stage.key} style={styles.stageItem}>
              <View style={styles.stageIconContainer}>
                {isComplete ? (
                  <CheckCircle2 size={20} color={colors.primaryContainer} />
                ) : isCurrent ? (
                  <ActivityIndicator size="small" color={colors.primaryContainer} />
                ) : (
                  <View style={styles.stageDot} />
                )}
              </View>
              <Text
                style={[
                  styles.stageText,
                  isComplete && styles.stageTextComplete,
                  isCurrent && styles.stageTextCurrent,
                ]}
              >
                {stage.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  stagesList: {
    gap: 16,
    paddingHorizontal: 16,
  },
  stageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stageIconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.outlineVariant,
  },
  stageText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  stageTextComplete: {
    color: colors.onSurfaceVariant,
  },
  stageTextCurrent: {
    color: colors.primaryContainer,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: colors.errorContainer,
    borderRadius: 0,
    padding: 20,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.destructive,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.destructive,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.destructive,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.destructive,
  },
});
