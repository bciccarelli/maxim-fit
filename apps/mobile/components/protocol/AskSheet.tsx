import { View, Text, StyleSheet, Modal, TextInput, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Send } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize } from '@/lib/theme';
import { useSSEStream } from '@/lib/useSSEStream';
import { apiUrl, getAuthHeaders } from '@/lib/api';
import { ChatCitationsDropdown } from './ChatCitationsDropdown';
import type { Citation } from '@protocol/shared/schemas';

type QuestionAnswer = {
  id: string;
  question: string;
  answer: string;
  created_at: string;
  citations?: Citation[];
};

type AskResult = {
  answer: string;
  suggestsModification: boolean;
  citations?: Citation[];
};

interface AskSheetProps {
  visible: boolean;
  onClose: () => void;
  protocolId: string;
  versionChainId: string;
  onExportToModify?: (context: string) => void;
}

export function AskSheet({
  visible,
  onClose,
  protocolId,
  versionChainId,
  onExportToModify,
}: AskSheetProps) {
  const [history, setHistory] = useState<QuestionAnswer[]>([]);
  const [question, setQuestion] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const { streamedText, result, error, isStreaming, stage, startStream, reset } = useSSEStream<AskResult>();

  // Fetch Q&A history when modal opens
  useEffect(() => {
    if (visible && versionChainId) {
      fetchHistory();
    }
  }, [visible, versionChainId]);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    const headers = await getAuthHeaders();

    try {
      const response = await fetch(
        apiUrl(`/api/protocol/ask?chainId=${versionChainId}`),
        { headers }
      );

      if (response.ok) {
        const data = await response.json();
        setHistory(data.questions || []);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Scroll to bottom when new content arrives
  useEffect(() => {
    if (streamedText || result) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [streamedText, result]);

  // Handle result
  useEffect(() => {
    if (result && currentQuestion) {
      setHistory((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          question: currentQuestion,
          answer: result.answer,
          created_at: new Date().toISOString(),
          citations: result.citations,
        },
      ]);
      setCurrentQuestion('');
      reset();
    }
  }, [result, currentQuestion, reset]);

  const handleSend = useCallback(async () => {
    if (!question.trim() || isStreaming) return;

    const q = question.trim();
    setCurrentQuestion(q);
    setQuestion('');
    reset();

    const headers = await getAuthHeaders();

    await startStream(apiUrl('/api/protocol/ask?stream=true'), {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        protocolId,
        question: q,
      }),
    });
  }, [question, protocolId, isStreaming, startStream, reset]);

  const handleExportToModify = useCallback(() => {
    if (!onExportToModify || history.length === 0) return;

    // Build context from last 3 Q&A pairs
    const recentHistory = history.slice(-3);
    const context = recentHistory
      .map((qa) => `Q: ${qa.question}\nA: ${qa.answer}`)
      .join('\n\n');

    onClose();
    onExportToModify(context);
  }, [history, onExportToModify, onClose]);

  const handleClose = useCallback(() => {
    setQuestion('');
    setCurrentQuestion('');
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
            <X size={24} color={colors.onSurfaceVariant} />
          </Pressable>
          <Text style={styles.title}>Ask About Protocol</Text>
          {history.length > 0 && onExportToModify && (
            <Pressable onPress={handleExportToModify} style={styles.exportButton}>
              <Text style={styles.exportButtonText}>Modify</Text>
            </Pressable>
          )}
          {(!history.length || !onExportToModify) && <View style={styles.placeholder} />}
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
        >
          {isLoadingHistory ? (
            <ActivityIndicator size="small" color={colors.primaryContainer} style={styles.loadingIndicator} />
          ) : history.length === 0 && !isStreaming ? (
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeTitle}>Ask a question</Text>
              <Text style={styles.welcomeText}>
                Get answers based on current research.
              </Text>
            </View>
          ) : (
            <>
              {history.map((qa) => (
                <View key={qa.id} style={styles.qaContainer}>
                  <View style={styles.questionBubble}>
                    <Text style={styles.questionText}>{qa.question}</Text>
                  </View>
                  <View style={styles.answerBubble}>
                    <Text style={styles.answerText}>{qa.answer}</Text>
                    {qa.citations && qa.citations.length > 0 && (
                      <ChatCitationsDropdown citations={qa.citations} />
                    )}
                  </View>
                </View>
              ))}

              {/* Streaming response */}
              {isStreaming && (
                <View style={styles.qaContainer}>
                  <View style={styles.questionBubble}>
                    <Text style={styles.questionText}>{currentQuestion}</Text>
                  </View>
                  <View style={styles.answerBubble}>
                    {streamedText ? (
                      <Text style={styles.answerText}>{streamedText}</Text>
                    ) : (
                      <View style={styles.thinkingContainer}>
                        <ActivityIndicator size="small" color={colors.primaryContainer} />
                        <Text style={styles.thinkingText}>
                          {stage === 'researching' ? 'Researching...' : 'Thinking...'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={question}
            onChangeText={setQuestion}
            placeholder="Ask a question..."
            placeholderTextColor={colors.onSurfaceVariant}
            multiline
            maxLength={500}
            editable={!isStreaming}
          />
          <Pressable
            style={[styles.sendButton, (!question.trim() || isStreaming) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!question.trim() || isStreaming}
          >
            {isStreaming ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Send size={20} color={colors.onPrimary} />
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
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.surfaceContainerLowest,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.onSurface,
  },
  exportButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.selectedBg,
    borderRadius: 0,
  },
  exportButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primaryContainer,
  },
  placeholder: {
    width: 60,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  loadingIndicator: {
    marginTop: 32,
  },
  welcomeContainer: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 0,
    padding: 24,
    alignItems: 'center',
    marginTop: 32,
  },
  welcomeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.onSurface,
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
  qaContainer: {
    marginBottom: 16,
  },
  questionBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primaryContainer,
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '80%',
    marginBottom: 8,
  },
  questionText: {
    fontSize: 14,
    color: colors.onPrimary,
    lineHeight: 20,
  },
  answerBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '85%',
    borderLeftWidth: 3,
    borderLeftColor: colors.primaryContainer,
  },
  answerText: {
    fontSize: 14,
    color: colors.onSurface,
    lineHeight: 20,
  },
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thinkingText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  errorContainer: {
    backgroundColor: colors.errorContainer,
    borderRadius: 0,
    padding: 12,
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.destructive,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: colors.surfaceContainerLowest,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 0,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingRight: 12,
    fontSize: 14,
    maxHeight: 100,
    color: colors.onSurface,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    backgroundColor: colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: colors.outlineVariant,
  },
});
