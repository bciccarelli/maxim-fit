'use client';

import { useRef, useEffect } from 'react';
import { Loader2, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { ChatCitationsDropdown } from '@/components/protocol/ChatCitationsDropdown';
import type { Citation } from '@/lib/schemas/protocol';

interface QAMessage {
  id: string;
  question: string;
  answer: string;
  citations?: Citation[];
  imageUrl?: string | null;
}

interface ChatMessagesProps {
  messages: QAMessage[];
  pendingQuestion: string | null;
  pendingImageUrl?: string | null;
  streamedText: string;
  isStreaming: boolean;
  stage: string | null;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-1 rounded hover:bg-muted"
      aria-label="Copy message"
    >
      {copied ? (
        <Check className="h-3 w-3 text-success" />
      ) : (
        <Copy className="h-3 w-3 text-muted-foreground" />
      )}
    </button>
  );
}

export function ChatMessages({
  messages,
  pendingQuestion,
  pendingImageUrl,
  streamedText,
  isStreaming,
  stage,
}: ChatMessagesProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamedText]);

  if (messages.length === 0 && !pendingQuestion) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p className="text-sm">Ask a question about your protocol to get started.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {messages.map((msg) => (
        <div key={msg.id} className="space-y-3">
          {/* User question */}
          <div className="flex justify-end">
            <div className="max-w-[80%]">
              {msg.imageUrl && (
                <img
                  src={msg.imageUrl}
                  alt="Attached image"
                  className="max-h-40 rounded-lg mb-2 ml-auto"
                />
              )}
              <div className="bg-primary text-primary-foreground rounded-lg px-3 py-2">
                <p className="text-sm">{msg.question}</p>
              </div>
            </div>
          </div>

          {/* AI answer */}
          <div className="flex justify-start group">
            <div className="max-w-[80%] border-l-2 border-l-primary pl-4">
              <p className="text-sm whitespace-pre-wrap">{msg.answer}</p>
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-2">
                  <ChatCitationsDropdown citations={msg.citations} />
                </div>
              )}
              <div className="mt-1">
                <CopyButton text={msg.answer} />
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Pending question with streaming answer */}
      {pendingQuestion && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <div className="max-w-[80%]">
              {pendingImageUrl && (
                <img
                  src={pendingImageUrl}
                  alt="Attached image"
                  className="max-h-40 rounded-lg mb-2 ml-auto"
                />
              )}
              <div className="bg-primary text-primary-foreground rounded-lg px-3 py-2">
                <p className="text-sm">{pendingQuestion}</p>
              </div>
            </div>
          </div>
          <div className="flex justify-start">
            <div className="max-w-[80%] border-l-2 border-l-primary pl-4">
              {streamedText ? (
                <p className="text-sm whitespace-pre-wrap">{streamedText}</p>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {stage === 'researching' ? 'Researching...' : 'Thinking...'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}
