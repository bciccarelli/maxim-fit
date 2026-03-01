import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Search, ArrowRight, ExternalLink } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize } from '@/lib/theme';
import type { ClarifyingQuestion, Citation } from '@protocol/shared/schemas';

const OTHER_VALUE = '__other__';

// Map well-known domains to display colors
const DOMAIN_COLORS: Record<string, string> = {
  'pubmed.gov': '#1a73e8',
  'ncbi.nlm.nih.gov': '#1a73e8',
  'nih.gov': '#0071bc',
  'examine.com': '#2d5a2d',
  'mayoclinic.org': '#c41230',
  'healthline.com': '#00adef',
  'webmd.com': '#d92228',
};

interface QuestionsCardProps {
  questions: ClarifyingQuestion[];
  citations: Citation[];
  researchSummary: string;
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, answer: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
  isSubmitting: boolean;
}

function CitationBadge({ citation }: { citation: Citation }) {
  const domain = citation.domain || new URL(citation.url).hostname.replace('www.', '');
  const color = DOMAIN_COLORS[domain] || colors.textSecondary;

  return (
    <View style={[styles.citationBadge, { backgroundColor: color + '15' }]}>
      <Text style={[styles.citationBadgeText, { color }]}>{domain}</Text>
    </View>
  );
}

export function QuestionsCard({
  questions,
  citations,
  researchSummary,
  answers,
  onAnswerChange,
  onSubmit,
  onSkip,
  isSubmitting,
}: QuestionsCardProps) {
  // Track which questions have "Other" selected
  const [otherSelected, setOtherSelected] = useState<Record<string, boolean>>({});

  const allAnswered = questions.every((q) => {
    const answer = answers[q.id];
    return answer && answer.trim().length > 0;
  });

  const handleOptionSelect = (questionId: string, value: string) => {
    if (value === OTHER_VALUE) {
      setOtherSelected((prev) => ({ ...prev, [questionId]: true }));
      onAnswerChange(questionId, ''); // Clear answer to trigger text input
    } else {
      setOtherSelected((prev) => ({ ...prev, [questionId]: false }));
      onAnswerChange(questionId, value);
    }
  };

  const isOtherSelected = (questionId: string) => {
    return otherSelected[questionId] === true;
  };

  return (
    <View style={styles.container}>
      {/* Research Summary Card */}
      <View style={styles.researchCard}>
        <View style={styles.researchHeader}>
          <Search size={16} color={colors.primary} />
          <Text style={styles.researchLabel}>Research Complete</Text>
        </View>
        <Text style={styles.researchSummary}>{researchSummary}</Text>

        {citations.length > 0 && (
          <View style={styles.citationsContainer}>
            <Text style={styles.citationsLabel}>
              {citations.length} source{citations.length !== 1 ? 's' : ''} found
            </Text>
            <View style={styles.citationsList}>
              {citations.slice(0, 3).map((citation) => (
                <CitationBadge key={citation.id} citation={citation} />
              ))}
              {citations.length > 3 && (
                <Text style={styles.moreCount}>+{citations.length - 3} more</Text>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Questions Section */}
      <View style={styles.questionsSection}>
        <Text style={styles.questionsTitle}>A few quick questions</Text>
        <Text style={styles.questionsSubtitle}>
          Help me tailor this modification to your preferences
        </Text>

        <ScrollView style={styles.questionsList} showsVerticalScrollIndicator={false}>
          {questions.map((question, index) => (
            <View key={question.id} style={styles.questionCard}>
              <Text style={styles.questionNumber}>
                {index + 1} of {questions.length}
              </Text>
              <Text style={styles.questionText}>{question.question}</Text>

              {question.context && (
                <Text style={styles.questionContext}>{question.context}</Text>
              )}

              {question.inputType === 'select' && question.options ? (
                <View style={styles.optionsContainer}>
                  {question.options.map((option) => {
                    const isSelected =
                      answers[question.id] === option.value && !isOtherSelected(question.id);
                    return (
                      <Pressable
                        key={option.value}
                        style={[
                          styles.optionButton,
                          isSelected && styles.optionButtonSelected,
                        ]}
                        onPress={() => handleOptionSelect(question.id, option.value)}
                      >
                        <View
                          style={[
                            styles.optionRadio,
                            isSelected && styles.optionRadioSelected,
                          ]}
                        >
                          {isSelected && <View style={styles.optionRadioInner} />}
                        </View>
                        <Text
                          style={[
                            styles.optionLabel,
                            isSelected && styles.optionLabelSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}

                  {/* Other option */}
                  <Pressable
                    style={[
                      styles.optionButton,
                      isOtherSelected(question.id) && styles.optionButtonSelected,
                    ]}
                    onPress={() => handleOptionSelect(question.id, OTHER_VALUE)}
                  >
                    <View
                      style={[
                        styles.optionRadio,
                        isOtherSelected(question.id) && styles.optionRadioSelected,
                      ]}
                    >
                      {isOtherSelected(question.id) && <View style={styles.optionRadioInner} />}
                    </View>
                    <Text
                      style={[
                        styles.optionLabel,
                        isOtherSelected(question.id) && styles.optionLabelSelected,
                      ]}
                    >
                      Other
                    </Text>
                  </Pressable>

                  {/* Text input for "Other" */}
                  {isOtherSelected(question.id) && (
                    <TextInput
                      style={styles.otherInput}
                      value={answers[question.id] || ''}
                      onChangeText={(text) => onAnswerChange(question.id, text)}
                      placeholder="Enter your answer..."
                      placeholderTextColor={colors.textMuted}
                      multiline
                      numberOfLines={2}
                      autoFocus
                    />
                  )}
                </View>
              ) : (
                <TextInput
                  style={styles.answerInput}
                  value={answers[question.id] || ''}
                  onChangeText={(text) => onAnswerChange(question.id, text)}
                  placeholder="Type your answer..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={2}
                />
              )}
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <Pressable style={styles.skipButton} onPress={onSkip} disabled={isSubmitting}>
          <Text style={styles.skipButtonText}>Skip questions</Text>
        </Pressable>

        <Pressable
          style={[
            styles.continueButton,
            (!allAnswered || isSubmitting) && styles.continueButtonDisabled,
          ]}
          onPress={onSubmit}
          disabled={!allAnswered || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.continueButtonText}>Continue</Text>
              <ArrowRight size={18} color="#fff" />
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Research Card
  researchCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    marginBottom: spacing.lg,
  },
  researchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  researchLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  researchSummary: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  citationsContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  citationsLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  citationsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  citationBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  citationBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  moreCount: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    alignSelf: 'center',
    marginLeft: spacing.xs,
  },

  // Questions Section
  questionsSection: {
    flex: 1,
  },
  questionsTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  questionsSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  questionsList: {
    flex: 1,
  },
  questionCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  questionNumber: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  questionText: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: colors.text,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  questionContext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },

  // Options
  optionsContainer: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  optionButtonSelected: {
    backgroundColor: colors.primary + '10',
    borderColor: colors.primary,
  },
  optionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRadioSelected: {
    borderColor: colors.primary,
  },
  optionRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  optionLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 1,
  },
  optionLabelSelected: {
    color: colors.primary,
    fontWeight: '500',
  },

  // Text Input
  answerInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.sm,
    color: colors.text,
    minHeight: 60,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginTop: spacing.sm,
  },
  otherInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.sm,
    color: colors.text,
    minHeight: 60,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.primary,
    marginTop: spacing.xs,
  },

  // Actions
  actionsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  skipButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  skipButtonText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  continueButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
  },
  continueButtonDisabled: {
    backgroundColor: colors.textMuted,
  },
  continueButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#fff',
  },
});
