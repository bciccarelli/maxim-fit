import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, X, Wand2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, fontSize } from '@/lib/theme';
import type { Critique } from '@protocol/shared/schemas';
import { fetchApi } from '@/lib/api';
import { CritiqueQuestionsSheet } from './CritiqueQuestionsSheet';

interface CritiqueAnswer {
  critiqueIndex: number;
  questionId: string;
  answer: string;
}

type Props = {
  critiques: Critique[];
  protocolId: string;
  verified?: boolean;
  onCritiquesUpdated?: (critiques: Critique[]) => void;
  onProtocolUpdated?: () => void;
};

export function CritiquesSection({
  critiques,
  protocolId,
  verified = true,
  onCritiquesUpdated,
  onProtocolUpdated,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [selectedCritiques, setSelectedCritiques] = useState<Set<number>>(new Set());
  const [dismissing, setDismissing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [displayCritiques, setDisplayCritiques] = useState<Critique[]>(critiques);
  const [showQuestionsSheet, setShowQuestionsSheet] = useState(false);

  const activeCritiques = displayCritiques;
  if (activeCritiques.length === 0) return null;

  const toggleCritique = (index: number) => {
    setSelectedCritiques((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleDismiss = async () => {
    if (selectedCritiques.size === 0) return;
    setDismissing(true);
    try {
      const data = await fetchApi<{ critiques: Critique[] }>('/api/protocol/critiques', {
        method: 'POST',
        body: JSON.stringify({
          protocolId,
          critiqueIndices: Array.from(selectedCritiques),
          action: 'dismiss',
        }),
      });
      setDisplayCritiques(data.critiques);
      setSelectedCritiques(new Set());
      onCritiquesUpdated?.(data.critiques);
    } catch {
      // silent fail
    } finally {
      setDismissing(false);
    }
  };

  // Submit the apply request to the API
  const submitApply = async (answers: CritiqueAnswer[] = []) => {
    setApplying(true);
    try {
      const data = await fetchApi<{ critiques: Critique[] }>('/api/protocol/critiques', {
        method: 'POST',
        body: JSON.stringify({
          protocolId,
          critiqueIndices: Array.from(selectedCritiques),
          action: 'apply',
          answers,
        }),
      });
      setDisplayCritiques(data.critiques);
      setSelectedCritiques(new Set());
      setShowQuestionsSheet(false);
      onCritiquesUpdated?.(data.critiques);
      onProtocolUpdated?.();
    } catch {
      // silent fail
    } finally {
      setApplying(false);
    }
  };

  const handleApply = () => {
    if (selectedCritiques.size === 0) return;

    // Check if any selected critique has questions
    const selectedWithQuestions = Array.from(selectedCritiques)
      .map((i) => ({ index: i, critique: activeCritiques[i] }))
      .filter(({ critique }) => critique.questions && critique.questions.length > 0);

    if (selectedWithQuestions.length > 0) {
      // Show sheet to collect answers
      setShowQuestionsSheet(true);
      return;
    }

    // No questions - apply directly
    submitApply([]);
  };

  // Get critiques with questions for the sheet
  const critiquesForSheet = Array.from(selectedCritiques)
    .map((i) => ({ index: i, critique: activeCritiques[i] }))
    .filter(({ critique }) => critique.questions && critique.questions.length > 0);

  const majorCount = activeCritiques.filter((c) => c.severity === 'major').length;
  const moderateCount = activeCritiques.filter((c) => c.severity === 'moderate').length;

  const getSeverityBorderColor = (severity: string) => {
    switch (severity) {
      case 'major':
        return colors.destructive;
      case 'moderate':
        return colors.warning;
      default:
        return colors.outlineVariant;
    }
  };

  const getSeverityBadgeStyle = (severity: string) => {
    switch (severity) {
      case 'major':
        return styles.severityBadgeMajor;
      case 'moderate':
        return styles.severityBadgeModerate;
      default:
        return styles.severityBadgeMinor;
    }
  };

  const getSeverityTextStyle = (severity: string) => {
    switch (severity) {
      case 'major':
        return styles.severityTextMajor;
      case 'moderate':
        return styles.severityTextModerate;
      default:
        return styles.severityTextMinor;
    }
  };

  return (
    <>
      <View style={[styles.container, !verified && styles.containerUnverified]}>
        <Pressable style={styles.header} onPress={() => setExpanded(!expanded)}>
          <View style={styles.headerLeft}>
            <AlertCircle size={16} color={colors.warning} />
            <Text style={styles.headerTitle}>
              {activeCritiques.length} area{activeCritiques.length !== 1 ? 's' : ''} for improvement
            </Text>
            {majorCount > 0 && (
              <View style={[styles.countBadge, styles.countBadgeMajor]}>
                <Text style={styles.countBadgeMajorText}>{majorCount} major</Text>
              </View>
            )}
            {moderateCount > 0 && (
              <View style={[styles.countBadge, styles.countBadgeModerate]}>
                <Text style={styles.countBadgeModerateText}>{moderateCount} moderate</Text>
              </View>
            )}
          </View>
          {expanded ? (
            <ChevronUp size={16} color={colors.onSurfaceVariant} />
          ) : (
            <ChevronDown size={16} color={colors.onSurfaceVariant} />
          )}
        </Pressable>

        {expanded && (
          <View style={styles.content}>
            {activeCritiques.map((critique, i) => (
              <Pressable
                key={i}
                style={[
                  styles.critiqueItem,
                  { borderLeftColor: getSeverityBorderColor(critique.severity) },
                  selectedCritiques.has(i) && styles.critiqueItemSelected,
                ]}
                onPress={() => toggleCritique(i)}
              >
                <View style={styles.critiqueCheckbox}>
                  <View
                    style={[
                      styles.checkbox,
                      selectedCritiques.has(i) && styles.checkboxSelected,
                    ]}
                  >
                    {selectedCritiques.has(i) && (
                      <View style={styles.checkboxInner} />
                    )}
                  </View>
                </View>
                <View style={styles.critiqueContent}>
                  <View style={styles.critiqueHeader}>
                    <View style={[styles.severityBadge, getSeverityBadgeStyle(critique.severity)]}>
                      <Text style={[styles.severityText, getSeverityTextStyle(critique.severity)]}>
                        {critique.severity}
                      </Text>
                    </View>
                    <Text style={styles.critiqueCategory}>{critique.category}</Text>
                  </View>
                  <Text style={styles.critiqueCriticism}>{critique.criticism}</Text>
                  <Text style={styles.critiqueSuggestion}>
                    Suggestion: {critique.suggestion}
                  </Text>
                  {critique.questions && critique.questions.length > 0 && (
                    <Text style={styles.questionsHint}>
                      {critique.questions.length} question{critique.questions.length > 1 ? 's' : ''} to personalize
                    </Text>
                  )}
                </View>
              </Pressable>
            ))}

            {selectedCritiques.size > 0 && (
              <View style={styles.actions}>
                <Pressable
                  style={[styles.actionButton, styles.dismissButton]}
                  onPress={handleDismiss}
                  disabled={dismissing || applying}
                >
                  {dismissing ? (
                    <ActivityIndicator size="small" color={colors.onSurfaceVariant} />
                  ) : (
                    <>
                      <X size={16} color={colors.onSurfaceVariant} />
                      <Text style={styles.dismissButtonText}>Dismiss</Text>
                    </>
                  )}
                </Pressable>
                <Pressable
                  onPress={handleApply}
                  disabled={dismissing || applying}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.primaryContainer]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.actionButton, styles.applyButton]}
                  >
                    {applying ? (
                      <ActivityIndicator size="small" color={colors.onPrimary} />
                    ) : (
                      <>
                        <Wand2 size={16} color={colors.onPrimary} />
                        <Text style={styles.applyButtonText}>Apply recommendations</Text>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </View>

      <CritiqueQuestionsSheet
        visible={showQuestionsSheet}
        onClose={() => setShowQuestionsSheet(false)}
        critiques={critiquesForSheet}
        onSubmit={submitApply}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 0,
    overflow: 'hidden',
  },
  containerUnverified: {
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    flexWrap: 'wrap',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.onSurface,
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 0,
  },
  countBadgeMajor: {
    backgroundColor: 'rgba(198, 40, 40, 0.15)',
  },
  countBadgeMajorText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.destructive,
    fontVariant: ['tabular-nums'],
  },
  countBadgeModerate: {
    backgroundColor: 'rgba(249, 168, 37, 0.15)',
  },
  countBadgeModerateText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.warning,
    fontVariant: ['tabular-nums'],
  },
  content: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  critiqueItem: {
    flexDirection: 'row',
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 8,
  },
  critiqueItemSelected: {
    backgroundColor: 'rgba(45, 90, 45, 0.05)',
    borderRadius: 0,
  },
  critiqueCheckbox: {
    paddingTop: 2,
    paddingRight: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 0,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: colors.primaryContainer,
    backgroundColor: colors.primaryContainer,
  },
  checkboxInner: {
    width: 8,
    height: 8,
    borderRadius: 0,
    backgroundColor: colors.onPrimary,
  },
  critiqueContent: {
    flex: 1,
  },
  critiqueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  severityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 0,
  },
  severityBadgeMajor: {
    backgroundColor: 'rgba(198, 40, 40, 0.15)',
  },
  severityBadgeModerate: {
    backgroundColor: 'rgba(249, 168, 37, 0.15)',
  },
  severityBadgeMinor: {
    backgroundColor: colors.surface,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  severityTextMajor: {
    color: colors.destructive,
  },
  severityTextModerate: {
    color: colors.warning,
  },
  severityTextMinor: {
    color: colors.onSurfaceVariant,
  },
  critiqueCategory: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  critiqueCriticism: {
    fontSize: 13,
    color: colors.onSurface,
    lineHeight: 18,
    marginBottom: 4,
  },
  critiqueSuggestion: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    fontStyle: 'italic',
    lineHeight: 17,
  },
  questionsHint: {
    fontSize: 11,
    color: colors.primaryContainer,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 0,
    gap: 4,
  },
  dismissButton: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  dismissButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  applyButton: {},
  applyButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.onPrimary,
  },
});
