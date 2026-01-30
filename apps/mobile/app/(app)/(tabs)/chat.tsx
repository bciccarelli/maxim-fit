import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Send, ChevronDown } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useSSEStream } from '@/lib/useSSEStream';
import { apiUrl, getAuthHeaders } from '@/lib/api';

type ProtocolOption = {
  id: string;
  name: string | null;
  version_chain_id: string;
};

type QuestionAnswer = {
  id: string;
  question: string;
  answer: string;
  created_at: string;
};

type AskResult = {
  answer: string;
  suggestsModification: boolean;
};

export default function ChatScreen() {
  const { user } = useAuth();
  const [protocols, setProtocols] = useState<ProtocolOption[]>([]);
  const [selectedProtocol, setSelectedProtocol] = useState<ProtocolOption | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [history, setHistory] = useState<QuestionAnswer[]>([]);
  const [question, setQuestion] = useState('');
  const [pendingQuestion, setPendingQuestion] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const { streamedText, result, error, isStreaming, startStream, reset } = useSSEStream<AskResult>();

  // Fetch user's protocols
  useEffect(() => {
    async function fetchProtocols() {
      if (!user) return;

      const { data } = await supabase
        .from('protocols')
        .select('id, name, version_chain_id')
        .eq('user_id', user.id)
        .eq('is_current', true)
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        setProtocols(data);
        setSelectedProtocol(data[0]);
      }
    }

    fetchProtocols();
  }, [user]);

  // Fetch Q&A history when protocol changes
  useEffect(() => {
    async function fetchHistory() {
      if (!selectedProtocol) return;

      setIsLoadingHistory(true);
      const headers = await getAuthHeaders();

      try {
        const response = await fetch(
          apiUrl(`/api/protocol/ask?chainId=${selectedProtocol.version_chain_id}`),
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
    }

    fetchHistory();
  }, [selectedProtocol]);

  // Scroll to bottom when new content arrives
  useEffect(() => {
    if (streamedText || result) {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  }, [streamedText, result]);

  const handleSend = useCallback(async () => {
    if (!question.trim() || !selectedProtocol || isStreaming) return;

    const currentQuestion = question.trim();
    setPendingQuestion(currentQuestion);
    setQuestion('');
    reset();

    const headers = await getAuthHeaders();

    const finalResult = await startStream(apiUrl('/api/protocol/ask?stream=true'), {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        protocolId: selectedProtocol.id,
        question: currentQuestion,
      }),
    });

    if (finalResult) {
      // Add to history
      setHistory((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          question: currentQuestion,
          answer: finalResult.answer,
          created_at: new Date().toISOString(),
        },
      ]);
      setPendingQuestion('');
      reset();
    }
  }, [question, selectedProtocol, isStreaming, startStream, reset]);

  if (!selectedProtocol) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No protocols available</Text>
        <Text style={styles.emptyText}>
          Generate a protocol on the web app to start chatting.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      {/* Protocol Selector */}
      <View style={styles.selectorContainer}>
        <Pressable
          style={styles.selector}
          onPress={() => setShowDropdown(!showDropdown)}
        >
          <Text style={styles.selectorText} numberOfLines={1}>
            {selectedProtocol.name || 'Untitled Protocol'}
          </Text>
          <ChevronDown size={20} color="#666" />
        </Pressable>

        {showDropdown && (
          <View style={styles.dropdown}>
            {protocols.map((protocol) => (
              <Pressable
                key={protocol.id}
                style={[
                  styles.dropdownItem,
                  protocol.id === selectedProtocol.id && styles.dropdownItemSelected,
                ]}
                onPress={() => {
                  setSelectedProtocol(protocol);
                  setShowDropdown(false);
                  setHistory([]);
                }}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    protocol.id === selectedProtocol.id && styles.dropdownItemTextSelected,
                  ]}
                  numberOfLines={1}
                >
                  {protocol.name || 'Untitled Protocol'}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Chat Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {isLoadingHistory ? (
          <ActivityIndicator size="small" color="#2d5a2d" style={styles.loadingIndicator} />
        ) : history.length === 0 && !isStreaming ? (
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeTitle}>Ask about your protocol</Text>
            <Text style={styles.welcomeText}>
              Ask questions about your protocol and get AI-powered answers based on current research.
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
                </View>
              </View>
            ))}

            {/* Streaming response */}
            {isStreaming && (
              <View style={styles.qaContainer}>
                <View style={styles.questionBubble}>
                  <Text style={styles.questionText}>{pendingQuestion}</Text>
                </View>
                <View style={styles.answerBubble}>
                  {streamedText ? (
                    <Text style={styles.answerText}>{streamedText}</Text>
                  ) : (
                    <Text style={styles.thinkingText}>Thinking...</Text>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f0',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f0',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a2e1a',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  selectorContainer: {
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    zIndex: 10,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectorText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a2e1a',
    flex: 1,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 12,
    right: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemSelected: {
    backgroundColor: '#e8f5e9',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
  },
  dropdownItemTextSelected: {
    color: '#2d5a2d',
    fontWeight: '500',
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
