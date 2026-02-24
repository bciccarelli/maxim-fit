import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, ChevronDown, Plus, Wand2, Lock, MessageSquare } from 'lucide-react-native';
import { useProtocol } from '@/contexts/ProtocolContext';
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';
import { useSSEStream } from '@/lib/useSSEStream';
import { apiUrl, getAuthHeaders } from '@/lib/api';
import { ModifySheet } from '@/components/protocol/ModifySheet';
import { GenerateProtocolModal } from '@/components/protocol/GenerateProtocolModal';
import { ChatCitationsDropdown } from '@/components/protocol/ChatCitationsDropdown';
import type { Citation } from '@protocol/shared/schemas';

type QuestionAnswer = {
  id: string;
  question: string;
  answer: string;
  created_at: string;
  citations?: Citation[];
  conversation_id?: string;
};

type Conversation = {
  id: string;
  firstQuestion: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
};

type AskResult = {
  answer: string;
  suggestsModification: boolean;
  citations?: Citation[];
  conversationId?: string;
};

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

export default function ChatScreen() {
  const { canAccess, showUpgradeModal, isBypassEnabled } = useSubscriptionContext();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  // Use shared protocol context
  const { selectedChain, selectedVersion, parsedProtocol, refreshChains } = useProtocol();

  // Conversation state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Chat state
  const [history, setHistory] = useState<QuestionAnswer[]>([]);
  const [question, setQuestion] = useState('');
  const [pendingQuestion, setPendingQuestion] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);

  const { streamedText, result, error, isStreaming, stage, startStream, reset } = useSSEStream<AskResult>();

  // Check if user has access to the ask feature
  const hasAskAccess = canAccess('ask');

  // Modify sheet state
  const [showModifySheet, setShowModifySheet] = useState(false);
  const [modifyContext, setModifyContext] = useState<string | undefined>(undefined);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  // Keyboard visibility for input padding
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Fetch conversations when protocol changes
  useEffect(() => {
    async function fetchConversations() {
      if (!selectedChain) {
        setConversations([]);
        return;
      }

      setIsLoadingConversations(true);
      const headers = await getAuthHeaders();

      try {
        const response = await fetch(
          apiUrl(`/api/protocol/ask?chainId=${selectedChain.version_chain_id}`),
          { headers }
        );

        if (response.ok) {
          const data = await response.json();
          setConversations(data.conversations || []);
        }
      } catch (err) {
        console.error('Error fetching conversations:', err);
      } finally {
        setIsLoadingConversations(false);
      }
    }

    fetchConversations();
  }, [selectedChain?.version_chain_id]);

  // Load messages for selected conversation
  useEffect(() => {
    async function loadConversationMessages() {
      if (!selectedChain || !selectedConversation) {
        return;
      }

      setIsLoadingHistory(true);
      const headers = await getAuthHeaders();

      try {
        const response = await fetch(
          apiUrl(`/api/protocol/ask?chainId=${selectedChain.version_chain_id}&conversationId=${selectedConversation.id}`),
          { headers }
        );

        if (response.ok) {
          const data = await response.json();
          setHistory(data.questions || []);
          setActiveConversationId(selectedConversation.id);
        }
      } catch (err) {
        console.error('Error loading conversation:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    }

    loadConversationMessages();
  }, [selectedChain?.version_chain_id, selectedConversation?.id]);

  // Scroll to bottom when new content arrives
  useEffect(() => {
    if (streamedText || result) {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  }, [streamedText, result]);

  const handleSend = useCallback(async () => {
    if (!question.trim() || !selectedVersion || isStreaming) return;

    // Check Pro access before sending
    if (!hasAskAccess) {
      showUpgradeModal('ask');
      return;
    }

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
        protocolId: selectedVersion.id,
        question: currentQuestion,
        conversationId: activeConversationId,
      }),
    });

    if (finalResult) {
      // Update active conversation ID if this was a new conversation
      if (!activeConversationId && finalResult.conversationId) {
        setActiveConversationId(finalResult.conversationId);
      }

      // Add to history with citations
      setHistory((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          question: currentQuestion,
          answer: finalResult.answer,
          created_at: new Date().toISOString(),
          citations: finalResult.citations,
          conversation_id: finalResult.conversationId,
        },
      ]);
      setPendingQuestion('');
      reset();

      // Refresh conversations list to include this new message
      if (selectedChain) {
        const refreshHeaders = await getAuthHeaders();
        try {
          const response = await fetch(
            apiUrl(`/api/protocol/ask?chainId=${selectedChain.version_chain_id}`),
            { headers: refreshHeaders }
          );
          if (response.ok) {
            const data = await response.json();
            setConversations(data.conversations || []);
          }
        } catch (err) {
          console.error('Error refreshing conversations:', err);
        }
      }
    }
  }, [question, selectedVersion, selectedChain, isStreaming, hasAskAccess, showUpgradeModal, startStream, reset, activeConversationId]);

  const handleNewChat = useCallback(() => {
    setSelectedConversation(null);
    setActiveConversationId(null);
    setHistory([]);
    reset();
    setShowDropdown(false);
  }, [reset]);

  const handleSelectConversation = useCallback((conversation: Conversation) => {
    setSelectedConversation(conversation);
    setShowDropdown(false);
  }, []);

  const handleModifyFromChat = useCallback((answerText: string) => {
    setModifyContext(`Based on this conversation about my protocol:\n\n"${answerText}"\n\nPlease make appropriate modifications.`);
    setShowModifySheet(true);
  }, []);

  const handleModifyAccepted = useCallback(() => {
    // Could refresh protocol data here if needed
  }, []);

  const handleGenerateComplete = useCallback(async (protocolId: string) => {
    await refreshChains();
  }, [refreshChains]);

  if (!selectedChain) {
    return (
      <View style={[styles.emptyContainer, { paddingTop: insets.top }]}>
        <Text style={styles.emptyTitle}>No protocol selected</Text>
        <Text style={styles.emptyText}>
          Create or select a protocol to start chatting about your health plan.
        </Text>
        <Pressable
          style={styles.generateButton}
          onPress={() => setShowGenerateModal(true)}
        >
          <Text style={styles.generateButtonText}>Generate Protocol</Text>
        </Pressable>
        <GenerateProtocolModal
          visible={showGenerateModal}
          onClose={() => setShowGenerateModal(false)}
          onComplete={handleGenerateComplete}
        />
      </View>
    );
  }

  const dropdownLabel = selectedConversation
    ? selectedConversation.firstQuestion.slice(0, 35) + (selectedConversation.firstQuestion.length > 35 ? '...' : '')
    : 'New Conversation';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
      {/* Header with Conversation Selector */}
      <View style={styles.headerContainer}>
        <View style={[styles.selectorWrapper, { zIndex: 10 }]}>
          <Pressable
            style={styles.selector}
            onPress={() => setShowDropdown(!showDropdown)}
          >
            <MessageSquare size={16} color="#2d5a2d" style={{ marginRight: 8 }} />
            <Text style={styles.selectorText} numberOfLines={1}>
              {dropdownLabel}
            </Text>
            <ChevronDown size={18} color="#666" />
          </Pressable>

          {showDropdown && (
            <View style={styles.dropdown}>
              {/* New Chat option */}
              <Pressable
                style={[styles.dropdownItem, !selectedConversation && styles.dropdownItemSelected]}
                onPress={handleNewChat}
              >
                <Plus size={16} color="#2d5a2d" />
                <Text style={[styles.dropdownItemText, styles.newChatText]}>New Conversation</Text>
              </Pressable>

              {conversations.length > 0 && <View style={styles.dropdownDivider} />}

              {/* Past conversations */}
              <ScrollView style={styles.conversationList} nestedScrollEnabled>
                {conversations.map((conversation) => (
                  <Pressable
                    key={conversation.id}
                    style={[
                      styles.dropdownItem,
                      conversation.id === selectedConversation?.id && styles.dropdownItemSelected,
                    ]}
                    onPress={() => handleSelectConversation(conversation)}
                  >
                    <View style={styles.conversationItemContent}>
                      <Text
                        style={[
                          styles.dropdownItemText,
                          conversation.id === selectedConversation?.id && styles.dropdownItemTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {conversation.firstQuestion.slice(0, 40)}
                        {conversation.firstQuestion.length > 40 ? '...' : ''}
                      </Text>
                      <View style={styles.conversationMeta}>
                        <Text style={styles.conversationDate}>
                          {formatRelativeDate(conversation.updatedAt || conversation.createdAt)}
                        </Text>
                        <Text style={styles.conversationCount}>
                          {conversation.messageCount} {conversation.messageCount === 1 ? 'msg' : 'msgs'}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* New Chat Button */}
        <Pressable style={styles.newChatButton} onPress={handleNewChat}>
          <Plus size={20} color="#2d5a2d" />
        </Pressable>
      </View>

      {/* Protocol indicator */}
      <View style={styles.protocolIndicator}>
        <Text style={styles.protocolIndicatorText} numberOfLines={1}>
          {selectedChain.name || 'Untitled Protocol'}
        </Text>
      </View>

      {/* Chat Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {isLoadingHistory || isLoadingConversations ? (
          <ActivityIndicator size="small" color="#2d5a2d" style={styles.loadingIndicator} />
        ) : history.length === 0 && !isStreaming ? (
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeTitle}>Ask about your protocol</Text>
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
                <View style={styles.answerWrapper}>
                  <View style={styles.answerBubble}>
                    <Text style={styles.answerText}>{qa.answer}</Text>
                    {qa.citations && qa.citations.length > 0 && (
                      <ChatCitationsDropdown citations={qa.citations} />
                    )}
                  </View>
                  <Pressable
                    style={styles.sparkleButton}
                    onPress={() => handleModifyFromChat(qa.answer)}
                  >
                    <Wand2 size={14} color="#2d5a2d" />
                    <Text style={styles.sparkleButtonText}>Modify</Text>
                  </Pressable>
                </View>
              </View>
            ))}

            {/* Streaming response */}
            {isStreaming && (
              <View style={styles.qaContainer}>
                <View style={styles.questionBubble}>
                  <Text style={styles.questionText}>{pendingQuestion}</Text>
                </View>
                <View style={styles.answerWrapper}>
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

      {/* Input Area - extra padding for tab bar when keyboard is hidden */}
      <View style={[styles.inputContainer, { paddingBottom: keyboardVisible ? 8 : insets.bottom + 50 }]}>
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
          style={[
            styles.sendButton,
            (!question.trim() || isStreaming) && styles.sendButtonDisabled,
            !hasAskAccess && !isBypassEnabled && styles.sendButtonLocked,
          ]}
          onPress={handleSend}
          disabled={!question.trim() || isStreaming}
        >
          {isStreaming ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : !hasAskAccess && !isBypassEnabled ? (
            <Lock size={18} color="#fff" />
          ) : (
            <Send size={20} color="#fff" />
          )}
        </Pressable>
      </View>

      {/* Modify Sheet */}
      {selectedVersion && (
        <ModifySheet
          visible={showModifySheet}
          onClose={() => {
            setShowModifySheet(false);
            setModifyContext(undefined);
          }}
          protocolId={selectedVersion.id}
          currentScores={{
            weighted_goal_score: selectedVersion.weighted_goal_score,
            viability_score: selectedVersion.viability_score,
          }}
          onAccepted={handleModifyAccepted}
          initialMessage={modifyContext}
          currentProtocol={parsedProtocol ?? undefined}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
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
    marginBottom: 20,
  },
  generateButton: {
    backgroundColor: '#2d5a2d',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  generateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    gap: 8,
  },
  selectorWrapper: {
    flex: 1,
    position: 'relative',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
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
  newChatButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 4,
    maxHeight: 300,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#e5e5e5',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  dropdownItemSelected: {
    backgroundColor: '#e8f5e9',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  dropdownItemTextSelected: {
    color: '#2d5a2d',
    fontWeight: '500',
  },
  newChatText: {
    color: '#2d5a2d',
    fontWeight: '500',
  },
  conversationList: {
    maxHeight: 200,
  },
  conversationItemContent: {
    flex: 1,
  },
  conversationMeta: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  conversationDate: {
    fontSize: 11,
    color: '#999',
  },
  conversationCount: {
    fontSize: 11,
    color: '#999',
  },
  protocolIndicator: {
    backgroundColor: '#f5f5f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  protocolIndicatorText: {
    fontSize: 12,
    color: '#666',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#f5f5f0',
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
  answerWrapper: {
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  answerBubble: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#2d5a2d',
  },
  sparkleButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#e8f5e9',
    marginTop: 6,
  },
  sparkleButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2d5a2d',
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
  sendButtonLocked: {
    backgroundColor: '#8B6914',
  },
});
