import { View, Text, StyleSheet, Modal, TextInput, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { X, Wand2, Check, XCircle } from 'lucide-react-native';
import { useModifyJob, type JobStatus } from '@/lib/useModifyJob';
import { apiUrl, getAuthHeaders } from '@/lib/api';
import { ScoreComparison } from './ScoreComparison';
import { QuestionsCard } from './QuestionsCard';
import { ModifyLoadingView } from './ModifyLoadingView';
import { ProposalComparisonView } from './ProposalComparisonView';
import type { DailyProtocol } from '@protocol/shared/schemas';

type ModifyState = 'input' | 'streaming' | 'questions' | 'proposal' | 'error';

interface ModifySheetProps {
  visible: boolean;
  onClose: () => void;
  protocolId: string;
  currentScores: {
    weighted_goal_score: number | null;
  };
  onAccepted: (newProtocolId: string) => void;
  initialMessage?: string;
  currentProtocol?: DailyProtocol;
}

export function ModifySheet({
  visible,
  onClose,
  protocolId,
  currentScores,
  onAccepted,
  initialMessage,
  currentProtocol,
}: ModifySheetProps) {
  const [message, setMessage] = useState(initialMessage || '');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // Use the job-based hook for background-resilient modify operations
  const {
    status: jobStatus,
    stage,
    questions: questionsData,
    proposal: jobProposal,
    currentScores: jobCurrentScores,
    modificationId,
    error,
    isLoading,
    upgradeRequired,
    startJob,
    submitAnswers,
    reset: resetJob,
  } = useModifyJob();

  // Map job status to UI state
  const state = useMemo((): ModifyState => {
    switch (jobStatus) {
      case 'idle':
        return 'input';
      case 'pending':
      case 'researching':
      case 'research_complete':
      case 'applying':
      case 'verifying':
        return 'streaming';
      case 'awaiting_answers':
        return 'questions';
      case 'completed':
        return 'proposal';
      case 'failed':
        return 'error';
      default:
        return 'input';
    }
  }, [jobStatus]);

  // Build status history from stage changes
  const statusHistory = useMemo((): string[] => {
    const history: string[] = [];

    const addIfNotPresent = (status: string) => {
      if (!history.includes(status)) {
        history.push(status);
      }
    };

    // Add stages in order based on current stage
    const stages: Array<{ stage: JobStatus | string; label: string }> = [
      { stage: 'pending', label: 'Starting...' },
      { stage: 'researching', label: 'Researching your request...' },
      { stage: 'analyzing', label: 'Analyzing for questions...' },
      { stage: 'awaiting_answers', label: 'Waiting for your input...' },
      { stage: 'applying', label: 'Applying modifications...' },
      { stage: 'verifying', label: 'Verifying changes...' },
    ];

    // Find current stage index
    const currentIndex = stages.findIndex(s => s.stage === jobStatus || s.stage === stage);

    // Add all completed stages
    for (let i = 0; i <= currentIndex && i < stages.length; i++) {
      addIfNotPresent(stages[i].label);
    }

    return history;
  }, [jobStatus, stage]);

  // Set initial message when prop changes
  useEffect(() => {
    if (initialMessage && visible) {
      setMessage(initialMessage);
    }
  }, [initialMessage, visible]);

  // Build proposal object for UI
  const proposal = useMemo(() => {
    if (!jobProposal || !modificationId) return null;

    return {
      modificationId,
      proposal: {
        protocol: jobProposal.protocol,
        reasoning: jobProposal.reasoning,
        verification: jobProposal.verification,
      },
      currentScores: jobCurrentScores || { weighted_goal_score: null, requirements_met: null },
    };
  }, [jobProposal, modificationId, jobCurrentScores]);

  const handleSubmit = useCallback(async () => {
    if (!message.trim()) return;
    await startJob(protocolId, message.trim());
  }, [message, protocolId, startJob]);

  const handleAnswerChange = useCallback((questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  }, []);

  const handleAnswersSubmit = useCallback(async () => {
    const answersList = Object.entries(answers).map(([questionId, answer]) => ({
      questionId,
      answer,
    }));
    await submitAnswers(answersList);
    setAnswers({});
  }, [answers, submitAnswers]);

  const handleSkipQuestions = useCallback(async () => {
    await submitAnswers([]);
    setAnswers({});
  }, [submitAnswers]);

  const handleAccept = useCallback(async () => {
    if (!modificationId) return;

    setIsAccepting(true);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(apiUrl('/api/protocol/modify/accept'), {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modificationId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        onAccepted(data.protocolId);
        handleClose();
      }
    } catch (err) {
      console.error('Error accepting modification:', err);
    } finally {
      setIsAccepting(false);
    }
  }, [modificationId, onAccepted]);

  const handleReject = useCallback(async () => {
    if (!modificationId) return;

    setIsRejecting(true);

    try {
      const headers = await getAuthHeaders();
      await fetch(apiUrl('/api/protocol/modify/reject'), {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modificationId,
        }),
      });
    } catch (err) {
      console.error('Error rejecting modification:', err);
    } finally {
      setIsRejecting(false);
      handleClose();
    }
  }, [modificationId]);

  const handleClose = useCallback(() => {
    setMessage('');
    setAnswers({});
    resetJob();
    onClose();
  }, [onClose, resetJob]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <X size={24} color="#666" />
          </Pressable>
          <Text style={styles.title}>Modify Protocol</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {state === 'input' && (
            <>
              <Text style={styles.description}>
                Describe what you'd like to change about your protocol. Maxim will research and propose modifications.
              </Text>

              <TextInput
                style={styles.input}
                value={message}
                onChangeText={setMessage}
                placeholder="e.g., I want to add more protein to my diet, or move my workout to the evening..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <Pressable
                style={[styles.submitButton, (!message.trim() || isLoading) && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={!message.trim() || isLoading}
              >
                <Wand2 size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Generate Modification</Text>
              </Pressable>
            </>
          )}

          {state === 'streaming' && (
            <ModifyLoadingView statusHistory={statusHistory} />
          )}

          {state === 'questions' && questionsData && questionsData.questions.length > 0 && (
            <QuestionsCard
              questions={questionsData.questions}
              citations={questionsData.citations}
              researchSummary={questionsData.researchSummary}
              answers={answers}
              onAnswerChange={handleAnswerChange}
              onSubmit={handleAnswersSubmit}
              onSkip={handleSkipQuestions}
              isSubmitting={isLoading}
            />
          )}

          {state === 'proposal' && proposal && (
            <>
              <View style={styles.reasoningCard}>
                <Text style={styles.reasoningLabel}>Proposed Changes</Text>
                <Text style={styles.reasoningText}>{proposal.proposal.reasoning}</Text>
              </View>

              <ScoreComparison
                currentScores={proposal.currentScores}
                proposedScores={{
                  weighted_goal_score: proposal.proposal.verification.weighted_goal_score,
                }}
              />

              {currentProtocol && (
                <View style={styles.comparisonContainer}>
                  <ProposalComparisonView
                    currentProtocol={currentProtocol}
                    proposedProtocol={proposal.proposal.protocol}
                  />
                </View>
              )}

              <View style={styles.actionButtons}>
                <Pressable
                  style={[styles.rejectButton, isRejecting && styles.buttonLoading]}
                  onPress={handleReject}
                  disabled={isAccepting || isRejecting}
                >
                  {isRejecting ? (
                    <ActivityIndicator size="small" color="#c62828" />
                  ) : (
                    <>
                      <XCircle size={20} color="#c62828" />
                      <Text style={styles.rejectButtonText}>Reject</Text>
                    </>
                  )}
                </Pressable>

                <Pressable
                  style={[styles.acceptButton, isAccepting && styles.buttonLoading]}
                  onPress={handleAccept}
                  disabled={isAccepting || isRejecting}
                >
                  {isAccepting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Check size={20} color="#fff" />
                      <Text style={styles.acceptButtonText}>Accept Changes</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </>
          )}

          {(state === 'error' || error) && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                {upgradeRequired
                  ? 'This feature requires a Pro subscription'
                  : error || 'An error occurred'}
              </Text>
              {!upgradeRequired && (
                <Pressable
                  style={styles.retryButton}
                  onPress={() => {
                    resetJob();
                  }}
                >
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </Pressable>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a2e1a',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#333',
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    marginBottom: 16,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2d5a2d',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  reasoningCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#2d5a2d',
  },
  reasoningLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  reasoningText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  comparisonContainer: {
    marginTop: 16,
    marginHorizontal: -16,
    height: 400,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#c62828',
  },
  rejectButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#c62828',
  },
  acceptButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2d5a2d',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  acceptButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  buttonLoading: {
    opacity: 0.7,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#c62828',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2d5a2d',
  },
});
