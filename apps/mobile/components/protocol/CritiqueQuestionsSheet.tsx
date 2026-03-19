import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useState } from 'react';
import { X, Sparkles } from 'lucide-react-native';
import { colors } from '@/lib/theme';
import type { Critique } from '@protocol/shared/schemas';

interface CritiqueAnswer {
  critiqueIndex: number;
  questionId: string;
  answer: string;
}

interface CritiqueQuestionsSheetProps {
  visible: boolean;
  onClose: () => void;
  critiques: Array<{ index: number; critique: Critique }>;
  onSubmit: (answers: CritiqueAnswer[]) => Promise<void>;
}

export function CritiqueQuestionsSheet({
  visible,
  onClose,
  critiques,
  onSubmit,
}: CritiqueQuestionsSheetProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const getAnswerKey = (critiqueIndex: number, questionId: string) =>
    `${critiqueIndex}_${questionId}`;

  const handleAnswerChange = (critiqueIndex: number, questionId: string, value: string) => {
    const key = getAnswerKey(critiqueIndex, questionId);
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const answerArray: CritiqueAnswer[] = [];
      for (const { index, critique } of critiques) {
        for (const question of critique.questions || []) {
          const key = getAnswerKey(index, question.id);
          const answer = answers[key];
          if (answer) {
            answerArray.push({
              critiqueIndex: index,
              questionId: question.id,
              answer,
            });
          }
        }
      }
      await onSubmit(answerArray);
      setAnswers({});
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setAnswers({});
      onClose();
    }
  };

  const totalQuestions = critiques.reduce(
    (sum, { critique }) => sum + (critique.questions?.length || 0),
    0
  );

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'major':
        return colors.destructive;
      case 'moderate':
        return colors.warning;
      default:
        return colors.onSurfaceVariant;
    }
  };

  const getSeverityBgColor = (severity: string) => {
    switch (severity) {
      case 'major':
        return 'rgba(198, 40, 40, 0.15)';
      case 'moderate':
        return 'rgba(249, 168, 37, 0.15)';
      default:
        return colors.surface;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>
              Apply {critiques.length} recommendation{critiques.length > 1 ? 's' : ''}
            </Text>
            <Text style={styles.headerDescription}>
              {totalQuestions > 0
                ? 'Answer these questions to help personalize the changes.'
                : 'Ready to apply the selected recommendations.'}
            </Text>
          </View>
          <Pressable onPress={handleClose} style={styles.closeButton} disabled={submitting}>
            <X size={24} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>

        {/* Content */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {critiques.map(({ index, critique }) => (
            <View key={index} style={styles.critiqueSection}>
              {/* Critique summary */}
              <View
                style={[
                  styles.critiqueSummary,
                  { borderLeftColor: getSeverityColor(critique.severity) },
                ]}
              >
                <View style={styles.critiqueHeader}>
                  <View
                    style={[
                      styles.severityBadge,
                      { backgroundColor: getSeverityBgColor(critique.severity) },
                    ]}
                  >
                    <Text style={[styles.severityText, { color: getSeverityColor(critique.severity) }]}>
                      {critique.severity}
                    </Text>
                  </View>
                  <Text style={styles.categoryText}>{critique.category}</Text>
                </View>
                <Text style={styles.criticismText}>{critique.criticism}</Text>
              </View>

              {/* Questions for this critique */}
              {critique.questions && critique.questions.length > 0 && (
                <View style={styles.questionsContainer}>
                  {critique.questions.map((question) => {
                    const answerKey = getAnswerKey(index, question.id);
                    const currentAnswer = answers[answerKey] || '';

                    return (
                      <View key={question.id} style={styles.questionItem}>
                        <Text style={styles.questionText}>{question.question}</Text>
                        {question.context && (
                          <Text style={styles.contextText}>{question.context}</Text>
                        )}

                        {question.inputType === 'select' && question.options ? (
                          <View style={styles.optionsContainer}>
                            {question.options.map((option) => (
                              <Pressable
                                key={option.value}
                                style={[
                                  styles.optionButton,
                                  currentAnswer === option.value && styles.optionButtonSelected,
                                ]}
                                onPress={() => handleAnswerChange(index, question.id, option.value)}
                              >
                                <Text
                                  style={[
                                    styles.optionButtonText,
                                    currentAnswer === option.value && styles.optionButtonTextSelected,
                                  ]}
                                >
                                  {option.label}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        ) : (
                          <TextInput
                            style={styles.textInput}
                            value={currentAnswer}
                            onChangeText={(value) => handleAnswerChange(index, question.id, value)}
                            placeholder="Type your answer..."
                            placeholderTextColor={colors.onSurfaceVariant}
                            multiline
                          />
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable style={styles.cancelButton} onPress={handleClose} disabled={submitting}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <>
                <Sparkles size={16} color={colors.onPrimary} />
                <Text style={styles.submitButtonText}>
                  Apply{totalQuestions > 0 ? ' with preferences' : ''}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.surfaceContainerLow,
  },
  headerContent: {
    flex: 1,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.onSurface,
    marginBottom: 4,
  },
  headerDescription: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 24,
  },
  critiqueSection: {
    gap: 12,
  },
  critiqueSummary: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 8,
  },
  critiqueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  severityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 0,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  categoryText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  criticismText: {
    fontSize: 14,
    color: colors.onSurface,
    lineHeight: 20,
  },
  questionsContainer: {
    marginLeft: 16,
    gap: 16,
  },
  questionItem: {
    gap: 8,
  },
  questionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.onSurface,
  },
  contextText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 0,
    padding: 12,
    fontSize: 14,
    color: colors.onSurface,
    minHeight: 44,
  },
  optionsContainer: {
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  optionButtonSelected: {
    borderColor: colors.primaryContainer,
    backgroundColor: 'rgba(45, 90, 45, 0.05)',
  },
  optionButtonText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  optionButtonTextSelected: {
    color: colors.primaryContainer,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: colors.surfaceContainerLow,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 0,
    backgroundColor: colors.primaryContainer,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.onPrimary,
  },
});
