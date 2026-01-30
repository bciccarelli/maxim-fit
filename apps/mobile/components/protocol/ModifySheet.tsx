import { View, Text, StyleSheet, Modal, TextInput, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useCallback } from 'react';
import { X, Wand2, Check, XCircle } from 'lucide-react-native';
import { useSSEStream } from '@/lib/useSSEStream';
import { apiUrl, getAuthHeaders } from '@/lib/api';
import { getStreamingStatus } from '@/lib/utils';
import { ScoreComparison } from './ScoreComparison';
import type { DailyProtocol } from '@protocol/shared/schemas';

type ModifyState = 'input' | 'streaming' | 'proposal' | 'error';

interface ModifyProposal {
  modificationId: string;
  proposal: {
    protocol: DailyProtocol;
    reasoning: string;
    verification: {
      weighted_goal_score: number;
      viability_score: number;
    };
  };
  currentScores: {
    weighted_goal_score: number | null;
    viability_score: number | null;
    requirements_met: boolean | null;
  };
}

interface ModifySheetProps {
  visible: boolean;
  onClose: () => void;
  protocolId: string;
  currentScores: {
    weighted_goal_score: number | null;
    viability_score: number | null;
  };
  onAccepted: (newProtocolId: string) => void;
}

export function ModifySheet({
  visible,
  onClose,
  protocolId,
  currentScores,
  onAccepted,
}: ModifySheetProps) {
  const [state, setState] = useState<ModifyState>('input');
  const [message, setMessage] = useState('');
  const [proposal, setProposal] = useState<ModifyProposal | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const { streamedText, error, isStreaming, startStream, reset } = useSSEStream<ModifyProposal>();

  const handleSubmit = useCallback(async () => {
    if (!message.trim()) return;

    setState('streaming');
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

    if (result) {
      setProposal(result);
      setState('proposal');
    } else if (error) {
      setState('error');
    }
  }, [message, protocolId, startStream, reset, error]);

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
                Describe what you'd like to change about your protocol. The AI will research and propose modifications.
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
            <View style={styles.streamingContainer}>
              <ActivityIndicator size="large" color="#2d5a2d" />
              <Text style={styles.streamingStatus}>
                {getStreamingStatus(streamedText)}
              </Text>
            </View>
          )}

          {state === 'proposal' && proposal && (
            <>
              <View style={styles.reasoningCard}>
                <Text style={styles.reasoningLabel}>Proposed Changes</Text>
                <Text style={styles.reasoningText}>{proposal.proposal.reasoning}</Text>
              </View>

              <ScoreComparison
                currentScores={currentScores}
                proposedScores={{
                  weighted_goal_score: proposal.proposal.verification.weighted_goal_score,
                  viability_score: proposal.proposal.verification.viability_score,
                }}
              />

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
  streamingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  streamingStatus: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
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
