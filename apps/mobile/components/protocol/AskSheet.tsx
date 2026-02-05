import { View, Text, StyleSheet, Modal, TextInput, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Send } from 'lucide-react-native';
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
            <X size={24} color="#666" />
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
            <ActivityIndicator size="small" color="#2d5a2d" style={styles.loadingIndicator} />
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
                        <ActivityIndicator size="small" color="#2d5a2d" />
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
            placeholderTextColor="#999"
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
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Send size={20} color="#fff" />
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
  exportButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e8f5e9',
    borderRadius: 6,
  },
  exportButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2d5a2d',
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginTop: 32,
  },
  welcomeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a2e1a',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  qaContainer: {
    marginBottom: 16,
  },
  questionBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#2d5a2d',
    borderRadius: 16,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '80%',
    marginBottom: 8,
  },
  questionText: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  answerBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '85%',
    borderLeftWidth: 3,
    borderLeftColor: '#2d5a2d',
  },
  answerText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thinkingText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#c62828',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingRight: 12,
    fontSize: 14,
    maxHeight: 100,
    color: '#333',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2d5a2d',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
});
