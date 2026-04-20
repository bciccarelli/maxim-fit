import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard, Image, ActionSheetIOS, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, ChevronDown, Plus, Wand2, Lock, MessageSquare, ImageIcon, X } from 'lucide-react-native';
import { colors } from '@/lib/theme';
import * as ImagePicker from 'expo-image-picker';
import { useProtocol } from '@/contexts/ProtocolContext';
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';
import { useSSEStream } from '@/lib/useSSEStream';
import { apiUrl, getAuthHeaders } from '@/lib/api';
import { ModifySheet } from '@/components/protocol/ModifySheet';
import { GenerateProtocolModal } from '@/components/protocol/GenerateProtocolModal';
import { ChatCitationsDropdown } from '@/components/protocol/ChatCitationsDropdown';
import { ChatOperationsCard } from '@/components/protocol/ChatOperationsCard';
import type { Citation } from '@protocol/shared/schemas';
import type { ProtocolOperation } from '@protocol/shared';

type QuestionAnswer = {
  id: string;
  question: string;
  answer: string;
  created_at: string;
  citations?: Citation[];
  conversation_id?: string;
  image_url?: string;
  operations?: ProtocolOperation[];
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
  citations?: Citation[];
  conversationId?: string;
  imageUrl?: string;
  operations?: ProtocolOperation[];
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

  // Image state
  const [selectedImage, setSelectedImage] = useState<{
    base64: string;
    mimeType: string;
    uri: string;
  } | null>(null);
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);

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
    const hasContent = question.trim() || selectedImage;
    if (!hasContent || !selectedVersion || isStreaming) return;

    // Check Pro access before sending
    if (!hasAskAccess) {
      showUpgradeModal('ask');
      return;
    }

    const currentQuestion = question.trim() || 'What can you tell me about this image?';
    const currentImage = selectedImage;

    setPendingQuestion(currentQuestion);
    setPendingImageUri(currentImage?.uri || null);
    setQuestion('');
    setSelectedImage(null);
    reset();

    const headers = await getAuthHeaders();

    const body: Record<string, unknown> = {
      protocolId: selectedVersion.id,
      question: currentQuestion,
      conversationId: activeConversationId,
    };

    // Add image data if present
    if (currentImage) {
      body.image = {
        base64: currentImage.base64,
        mimeType: currentImage.mimeType,
      };
    }

    const finalResult = await startStream(apiUrl('/api/protocol/ask?stream=true'), {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (finalResult) {
      // Update active conversation ID if this was a new conversation
      if (!activeConversationId && finalResult.conversationId) {
        setActiveConversationId(finalResult.conversationId);
      }

      // Add to history with citations, image URL, and operations
      setHistory((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          question: currentQuestion,
          answer: finalResult.answer,
          created_at: new Date().toISOString(),
          citations: finalResult.citations,
          conversation_id: finalResult.conversationId,
          image_url: finalResult.imageUrl,
          operations: finalResult.operations,
        },
      ]);
      setPendingQuestion('');
      setPendingImageUri(null);
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
    } else {
      // Clear pending state on error
      setPendingImageUri(null);
    }
  }, [question, selectedImage, selectedVersion, selectedChain, isStreaming, hasAskAccess, showUpgradeModal, startStream, reset, activeConversationId]);

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

  const handleMessageLongPress = useCallback((text: string) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Copy'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) Clipboard.setStringAsync(text);
        }
      );
    } else {
      Alert.alert('Message', undefined, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Copy', onPress: () => Clipboard.setStringAsync(text) },
      ]);
    }
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

  const pickImage = useCallback(async (source: 'camera' | 'library') => {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
      exif: false,
    };

    try {
      let result;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Please allow camera access to take photos.');
          return;
        }
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Please allow photo library access to select photos.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          setSelectedImage({
            base64: asset.base64,
            mimeType: asset.mimeType || 'image/jpeg',
            uri: asset.uri,
          });
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  }, []);

  const showImagePicker = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) pickImage('camera');
          if (buttonIndex === 2) pickImage('library');
        }
      );
    } else {
      // For Android, use a simple alert with buttons
      Alert.alert(
        'Add Photo',
        'Choose an option',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Take Photo', onPress: () => pickImage('camera') },
          { text: 'Choose from Library', onPress: () => pickImage('library') },
        ]
      );
    }
  }, [pickImage]);

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
            <MessageSquare size={16} color={colors.primaryContainer} style={{ marginRight: 8 }} />
            <Text style={styles.selectorText} numberOfLines={1}>
              {dropdownLabel}
            </Text>
            <ChevronDown size={18} color={colors.onSurfaceVariant} />
          </Pressable>

          {showDropdown && (
            <View style={styles.dropdown}>
              {/* New Chat option */}
              <Pressable
                style={[styles.dropdownItem, !selectedConversation && styles.dropdownItemSelected]}
                onPress={handleNewChat}
              >
                <Plus size={16} color={colors.primaryContainer} />
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
          <Plus size={20} color={colors.primaryContainer} />
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
          <ActivityIndicator size="small" color={colors.primaryContainer} style={styles.loadingIndicator} />
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
                <Pressable style={styles.questionBubble} onLongPress={() => handleMessageLongPress(qa.question)}>
                  {qa.image_url && (
                    <Image
                      source={{ uri: qa.image_url }}
                      style={styles.questionImage}
                      resizeMode="cover"
                    />
                  )}
                  <Text style={styles.questionText}>{qa.question}</Text>
                </Pressable>
                <View style={styles.answerWrapper}>
                  <Pressable style={styles.answerBubble} onLongPress={() => handleMessageLongPress(qa.answer)}>
                    <Text style={styles.answerText}>{qa.answer}</Text>
                    {qa.citations && qa.citations.length > 0 && (
                      <ChatCitationsDropdown citations={qa.citations} />
                    )}
                  </Pressable>
                  {qa.operations && qa.operations.length > 0 && selectedVersion && parsedProtocol ? (
                    <ChatOperationsCard
                      operations={qa.operations}
                      protocolId={selectedVersion.id}
                      protocol={parsedProtocol}
                      onApplied={() => {}}
                    />
                  ) : (
                    <Pressable
                      style={styles.sparkleButton}
                      onPress={() => handleModifyFromChat(qa.answer)}
                    >
                      <Wand2 size={14} color={colors.primaryContainer} />
                      <Text style={styles.sparkleButtonText}>Modify</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ))}

            {/* Streaming response */}
            {isStreaming && (
              <View style={styles.qaContainer}>
                <View style={styles.questionBubble}>
                  {pendingImageUri && (
                    <Image
                      source={{ uri: pendingImageUri }}
                      style={styles.questionImage}
                      resizeMode="cover"
                    />
                  )}
                  <Text style={styles.questionText}>{pendingQuestion}</Text>
                </View>
                <View style={styles.answerWrapper}>
                  <View style={styles.answerBubble}>
                    {streamedText ? (
                      <Text style={styles.answerText}>{streamedText}</Text>
                    ) : (
                      <View style={styles.thinkingContainer}>
                        <ActivityIndicator size="small" color={colors.primaryContainer} />
                        <Text style={styles.thinkingText}>
                          {stage === 'researching' ? 'Researching...' : stage === 'generating' ? 'Generating...' : 'Thinking...'}
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

      {/* Image Preview */}
      {selectedImage && (
        <View style={styles.imagePreviewContainer}>
          <Image
            source={{ uri: selectedImage.uri }}
            style={styles.imagePreview}
          />
          <Pressable
            style={styles.removeImageButton}
            onPress={() => setSelectedImage(null)}
          >
            <X size={14} color={colors.onPrimary} />
          </Pressable>
        </View>
      )}

      {/* Input Area - extra padding for tab bar when keyboard is hidden */}
      <View style={[styles.inputContainer, { paddingBottom: keyboardVisible ? 0 : insets.bottom + 10 }]}>
        <Pressable
          style={[styles.photoButton, isStreaming && styles.photoButtonDisabled]}
          onPress={showImagePicker}
          disabled={isStreaming}
        >
          <ImageIcon size={20} color={isStreaming ? colors.outlineVariant : colors.primaryContainer} />
        </Pressable>
        <TextInput
          style={styles.input}
          value={question}
          onChangeText={setQuestion}
          placeholder={selectedImage ? 'Ask about this image...' : 'Ask a question...'}
          placeholderTextColor={colors.onSurfaceVariant}
          multiline
          editable={!isStreaming}
        />
        <Pressable
          style={[
            styles.sendButton,
            (!question.trim() && !selectedImage || isStreaming) && styles.sendButtonDisabled,
            !hasAskAccess && !isBypassEnabled && styles.sendButtonLocked,
          ]}
          onPress={handleSend}
          disabled={(!question.trim() && !selectedImage) || isStreaming}
        >
          {isStreaming ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : !hasAskAccess && !isBypassEnabled ? (
            <Lock size={18} color={colors.onPrimary} />
          ) : (
            <Send size={20} color={colors.onPrimary} />
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
    backgroundColor: colors.surfaceContainerLowest,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.onSurface,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 20,
  },
  generateButton: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 0,
  },
  generateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.onPrimary,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.surfaceContainerHigh,
    gap: 8,
  },
  selectorWrapper: {
    flex: 1,
    position: 'relative',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectorText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.onSurface,
    flex: 1,
  },
  newChatButton: {
    width: 40,
    height: 40,
    borderRadius: 0,
    backgroundColor: colors.selectedBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 0,
    marginTop: 4,
    maxHeight: 300,
  },
  dropdownDivider: {
    height: 8,
    backgroundColor: colors.surfaceContainerLow,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  dropdownItemSelected: {
    backgroundColor: colors.selectedBg,
  },
  dropdownItemText: {
    fontSize: 14,
    color: colors.onSurface,
    flex: 1,
  },
  dropdownItemTextSelected: {
    color: colors.primaryContainer,
    fontWeight: '500',
  },
  newChatText: {
    color: colors.primaryContainer,
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
    color: colors.onSurfaceVariant,
  },
  conversationCount: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  protocolIndicator: {
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  protocolIndicatorText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: colors.surface,
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
    borderLeftWidth: 3,
    borderLeftColor: colors.primaryContainer,
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
  answerWrapper: {
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  answerBubble: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.primaryContainer,
  },
  sparkleButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 0,
    backgroundColor: colors.selectedBg,
    marginTop: 6,
  },
  sparkleButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primaryContainer,
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
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
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
    backgroundColor: colors.surfaceContainerLow,
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
  sendButtonLocked: {
    backgroundColor: colors.warning,
  },
  // Image picker styles
  photoButton: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    backgroundColor: colors.selectedBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  photoButtonDisabled: {
    backgroundColor: colors.surfaceContainerLow,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginHorizontal: 12,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  imagePreview: {
    width: 100,
    height: 75,
    borderRadius: 0,
    backgroundColor: colors.surface,
  },
  removeImageButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 9999,
    padding: 4,
  },
  questionImage: {
    width: '100%',
    height: 120,
    borderRadius: 0,
    marginBottom: 8,
  },
});
