'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSSEStream } from '@/lib/hooks/useSSEStream';
import { ConversationSidebar, type Conversation } from './ConversationSidebar';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { Loader2, PanelLeftClose, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Citation } from '@/lib/schemas/protocol';

interface ProtocolOption {
  id: string;
  name: string | null;
  version_chain_id: string;
}

interface ChatPageClientProps {
  protocols: ProtocolOption[];
}

interface QAMessage {
  id: string;
  question: string;
  answer: string;
  citations?: Citation[];
  imageUrl?: string | null;
}

interface AskResult {
  answer: string;
  citations?: Citation[];
  conversationId: string;
  imageUrl?: string | null;
}

export function ChatPageClient({ protocols }: ChatPageClientProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<QAMessage[]>([]);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const selected = protocols[selectedIdx] ?? null;
  const chainId = selected?.version_chain_id ?? null;

  const { streamedText, result, isStreaming, stage, startStream, reset } = useSSEStream<AskResult>();

  // Fetch conversations when protocol changes
  const fetchConversations = useCallback(async () => {
    if (!chainId) return;
    setIsLoadingConversations(true);
    try {
      const res = await fetch(`/api/protocol/ask?chainId=${chainId}`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations ?? []);
      }
    } catch (e) {
      console.error('Failed to fetch conversations:', e);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [chainId]);

  useEffect(() => {
    fetchConversations();
    setActiveConversationId(null);
    setMessages([]);
  }, [fetchConversations]);

  // Fetch messages when conversation changes
  const fetchMessages = useCallback(async (convId: string) => {
    if (!chainId) return;
    setIsLoadingMessages(true);
    try {
      const res = await fetch(`/api/protocol/ask?chainId=${chainId}&conversationId=${convId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(
          (data.questions ?? []).map((q: Record<string, unknown>) => ({
            id: q.id as string,
            question: q.question as string,
            answer: q.answer as string,
            citations: q.citations as Citation[] | undefined,
            imageUrl: q.image_url as string | null,
          }))
        );
      }
    } catch (e) {
      console.error('Failed to fetch messages:', e);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [chainId]);

  const handleSelectConversation = (convId: string) => {
    setActiveConversationId(convId);
    fetchMessages(convId);
    reset();
    setPendingQuestion(null);
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    reset();
    setPendingQuestion(null);
  };

  // When streaming result arrives, add to messages
  useEffect(() => {
    if (result && pendingQuestion) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          question: pendingQuestion,
          answer: result.answer,
          citations: result.citations,
          imageUrl: result.imageUrl,
        },
      ]);
      // Update conversation ID for this session
      if (result.conversationId && !activeConversationId) {
        setActiveConversationId(result.conversationId);
      }
      setPendingQuestion(null);
      setPendingImageUrl(null);
      reset();
      // Refresh conversations list
      fetchConversations();
    }
  }, [result, pendingQuestion, activeConversationId, reset, fetchConversations]);

  const handleSubmit = async (question: string, image?: { base64: string; mimeType: string }) => {
    if (!selected) return;

    setPendingQuestion(question);

    await startStream('/api/protocol/ask?stream=true', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        protocolId: selected.id,
        question,
        conversationId: activeConversationId || undefined,
        image: image || undefined,
      }),
    });
  };

  if (protocols.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-sm">No protocols yet. Generate one first to start chatting.</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] border rounded-lg overflow-hidden">
      {/* Conversation sidebar */}
      <div className={`border-r bg-card transition-all duration-150 ${sidebarOpen ? 'w-[280px]' : 'w-0 overflow-hidden'}`}>
        <ConversationSidebar
          conversations={conversations}
          activeId={activeConversationId}
          onSelect={handleSelectConversation}
          onNewConversation={handleNewConversation}
        />
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="shrink-0"
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeft className="h-4 w-4" />
            )}
          </Button>

          {/* Protocol selector */}
          {protocols.length > 1 && (
            <select
              className="border border-input rounded-md px-3 py-1.5 text-sm bg-background max-w-[200px]"
              value={selectedIdx}
              onChange={(e) => setSelectedIdx(Number(e.target.value))}
            >
              {protocols.map((p, i) => (
                <option key={p.id} value={i}>
                  {p.name || 'Untitled Protocol'}
                </option>
              ))}
            </select>
          )}

          {isLoadingConversations && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Messages area */}
        {isLoadingMessages ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading messages...
          </div>
        ) : (
          <ChatMessages
            messages={messages}
            pendingQuestion={pendingQuestion}
            pendingImageUrl={pendingImageUrl}
            streamedText={streamedText}
            isStreaming={isStreaming}
            stage={stage}
          />
        )}

        {/* Input */}
        <ChatInput
          onSubmit={handleSubmit}
          isStreaming={isStreaming}
          onImagePreviewUrl={setPendingImageUrl}
        />
      </div>
    </div>
  );
}
