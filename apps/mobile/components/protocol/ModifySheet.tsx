import { View, Text, StyleSheet, Modal, TextInput, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useCallback, useEffect, useRef } from 'react';
import { X, Wand2, Check, XCircle } from 'lucide-react-native';
import { useSSEStream } from '@/lib/useSSEStream';
import { apiUrl, getAuthHeaders } from '@/lib/api';
import { getStreamingStatus } from '@/lib/utils';
import { ScoreComparison } from './ScoreComparison';
import { QuestionsCard } from './QuestionsCard';
import { ModifyLoadingView } from './ModifyLoadingView';
import { ProposalComparisonView } from './ProposalComparisonView';
import type { DailyProtocol, ClarifyingQuestion, Citation } from '@protocol/shared/schemas';

type ModifyState = 'input' | 'streaming' | 'questions' | 'proposal' | 'error';

interface ModifyProposal {
  modificationId: string;
  proposal: {
    protocol: DailyProtocol;
    reasoning: string;
    verification: {
      weighted_goal_score: number;
    };
  };
  currentScores: {
    weighted_goal_score: number | null;
    requirements_met: boolean | null;
  };
}

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
  const [state, setState] = useState<ModifyState>('input');
  const [message, setMessage] = useState(initialMessage || '');
  const [proposal, setProposal] = useState<ModifyProposal | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [statusHistory, setStatusHistory] = useState<string[]>([]);
  const lastStatusRef = useRef<string>('');

  // Questions flow state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ClarifyingQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [citations, setCitations] = useState<Citation[]>([]);
  const [researchSummary, setResearchSummary] = useState<string>('');
  const [isSubmittingAnswers, setIsSubmittingAnswers] = useState(false);

  const { streamedText, error, isStreaming, startStream, reset, questionsData, stage } = useSSEStream<ModifyProposal>();

  // Set initial message when prop changes
  useEffect(() => {
    if (initialMessage && visible) {
      setMessage(initialMessage);
    }
  }, [initialMessage, visible]);

  // Map stage to human-readable status
  const getStageStatus = (s: string): string => {
    switch (s) {
      case 'researching': return 'Researching your request...';
      case 'analyzing': return 'Analyzing for questions...';
      case 'modifying': return 'Applying modifications...';
      case 'verifying': return 'Verifying changes...';
      default: return s;
    }
  };

  // Track stage changes
  useEffect(() => {
    if (state === 'streaming' && stage) {
      const stageStatus = getStageStatus(stage);
      setStatusHistory(prev => {
        if (prev.includes(stageStatus)) return prev;
        return [...prev, stageStatus];
      });
    }
  }, [stage, state]);

  // Track detailed status changes from JSON content
  const currentStatus = getStreamingStatus(streamedText);
  useEffect(() => {
    if (state === 'streaming' && currentStatus !== lastStatusRef.current) {
      lastStatusRef.current = currentStatus;
      setStatusHistory(prev => {
        // Don't add duplicates
        if (prev.includes(currentStatus)) return prev;
        return [...prev, currentStatus];
      });
    }
  }, [currentStatus, state]);

  // Watch for questionsData being set from SSE stream
  useEffect(() => {
    if (questionsData && state === 'streaming') {
      setQuestions(questionsData.questions);
      setCitations(questionsData.citations);
      setResearchSummary(questionsData.researchSummary);
      setSessionId(questionsData.sessionId);
      setAnswers({});
      setState('questions');
    }
  }, [questionsData, state]);

  const handleSubmit = useCallback(async () => {
    if (!message.trim()) return;

    setState('streaming');
    setStatusHistory([]);
    lastStatusRef.current = '';
    reset();

    const headers = await getAuthHeaders();

    const result = await startStream(apiUrl('/api/protocol/modify?stream=true'), {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        protocolId,
        userMessage: message.trim(),
      }),
    });

    // If result is null, check if questionsData was set (handled by effect above)
    // Otherwise, it's a regular modify result
    if (result && 'modificationId' in result) {
      setProposal(result as ModifyProposal);
      setState('proposal');
    } else if (!result && error) {
      setState('error');
    }
    // Note: If result is null and no error, questionsData effect will handle the state change
  }, [message, protocolId, startStream, reset, error]);

  const handleAnswerChange = useCallback((questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  }, []);

  const handleAnswersSubmit = useCallback(async () => {
    if (!sessionId) return;

    setIsSubmittingAnswers(true);
    setState('streaming');
    setStatusHistory([]);
    lastStatusRef.current = '';
    reset();

    const headers = await getAuthHeaders();

    const result = await startStream(apiUrl('/api/protocol/modify?stream=true'), {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          questionId,
          answer,
        })),
      }),
    });

    setIsSubmittingAnswers(false);

    if (result && 'modificationId' in result) {
      setProposal(result as ModifyProposal);
      setState('proposal');
    } else if (error) {
      setState('error');
    }
  }, [sessionId, answers, startStream, reset, error]);

  const handleSkipQuestions = useCallback(async () => {
    if (!sessionId) return;

    setIsSubmittingAnswers(true);
    setState('streaming');
    setStatusHistory([]);
    lastStatusRef.current = '';
    reset();

    const headers = await getAuthHeaders();

    const result = await startStream(apiUrl('/api/protocol/modify?stream=true'), {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        answers: [], // Empty answers = skip
      }),
    });

    setIsSubmittingAnswers(false);

    if (result && 'modificationId' in result) {
      setProposal(result as ModifyProposal);
      setState('proposal');
    } else if (error) {
      setState('error');
    }
  }, [sessionId, startStream, reset, error]);

  const handleAccept = useCallback(async () => {
    if (!proposal) return;

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
          modificationId: proposal.modificationId,
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
  }, [proposal, onAccepted]);

  const handleReject = useCallback(async () => {
    if (!proposal) return;

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
          modificationId: proposal.modificationId,
        }),
      });
    } catch (err) {
      console.error('Error rejecting modification:', err);
    } finally {
      setIsRejecting(false);
      handleClose();
    }
  }, [proposal]);

  const handleClose = useCallback(() => {
    setState('input');
    setMessage('');
    setProposal(null);
    setStatusHistory([]);
    lastStatusRef.current = '';
    // Reset questions state
    setSessionId(null);
    setQuestions([]);
    setAnswers({});
    setCitations([]);
    setResearchSummary('');
    setIsSubmittingAnswers(false);
    reset();
    onClose();
  }, [onClose, reset]);

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
                style={[styles.submitButton, !message.trim() && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={!message.trim()}
              >
                <Wand2 size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Generate Modification</Text>
              </Pressable>
            </>
          )}

          {state === 'streaming' && (
            <ModifyLoadingView statusHistory={statusHistory} />
          )}

          {state === 'questions' && questions.length > 0 && (
            <QuestionsCard
              questions={questions}
              citations={citations}
              researchSummary={researchSummary}
              answers={answers}
              onAnswerChange={handleAnswerChange}
              onSubmit={handleAnswersSubmit}
              onSkip={handleSkipQuestions}
              isSubmitting={isSubmittingAnswers}
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
              <Text style={styles.errorText}>{error || 'An error occurred'}</Text>
              <Pressable
                style={styles.retryButton}
                onPress={() => {
                  setState('input');
                  reset();
                }}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </Pressable>
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
