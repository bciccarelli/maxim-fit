'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Loader2, Send, ArrowRight, MessageSquarePlus } from 'lucide-react';
import { useSSEStream } from '@/lib/hooks/useSSEStream';
import type { ProtocolQuestion } from '@/lib/schemas/protocol';

interface AskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  protocolId: string;
  versionChainId: string;
  onExportToModify?: (context: string) => void;
}

export function AskModal({ open, onOpenChange, protocolId, versionChainId, onExportToModify }: AskModalProps) {
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState<ProtocolQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const historyEndRef = useRef<HTMLDivElement>(null);
  const [sessionStart, setSessionStart] = useState<string | null>(null);

  const { streamedText, result, isStreaming, stage, startStream, reset } = useSSEStream<{
    answer: string;
    suggestsModification: boolean;
  }>();

  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);

  useEffect(() => {
    if (open && versionChainId) {
      fetchHistory();
    }
  }, [open, versionChainId]);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, streamedText]);

  useEffect(() => {
    if (result && pendingQuestion) {
      setHistory((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          question: pendingQuestion,
          answer: result.answer,
          created_at: new Date().toISOString(),
        },
      ]);
      setPendingQuestion(null);
      reset();
    }
  }, [result, pendingQuestion, reset]);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`/api/protocol/ask?chainId=${versionChainId}`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data.questions ?? []);
      }
    } catch {
      // Non-critical
    }
  };

  const handleSubmit = async () => {
    if (!question.trim() || isStreaming) return;

    const q = question.trim();
    setQuestion('');
    setError(null);
    setPendingQuestion(q);

    const finalResult = await startStream('/api/protocol/ask?stream=true', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        protocolId,
        question: q,
        sessionStart: sessionStart ?? undefined,
      }),
    });

    if (!finalResult) {
      setError('Failed to get answer. Please try again.');
      setPendingQuestion(null);
    }
  };

  const handleNewChat = () => {
    const now = new Date().toISOString();
    setSessionStart(now);
    setHistory([]);
    setQuestion('');
    setError(null);
    reset();
  };

  // Filter history based on session start
  const displayedHistory = sessionStart
    ? history.filter((qa) => qa.created_at && qa.created_at > sessionStart)
    : history;

  const handleExportToModify = () => {
    const recent = displayedHistory.slice(-3);
    const contextParts = recent.map((qa) => `Q: ${qa.question}\nA: ${qa.answer}`);
    const context = `Based on our discussion:\n${contextParts.join('\n\n')}\n\nPlease modify the protocol accordingly.`;
    onExportToModify?.(context);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Ask about your protocol</DialogTitle>
          <DialogDescription>
            Ask questions about your protocol. Answers are saved for reference.
          </DialogDescription>
        </DialogHeader>

        {/* Q&A History */}
        <div className="flex-1 overflow-y-auto space-y-3 max-h-[400px]">
          {displayedHistory.length > 0 && displayedHistory.map((qa) => (
            <div key={qa.id} className="space-y-2">
              <div className="border-l-2 border-l-primary pl-4 py-1">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Question</p>
                <p className="text-sm">{qa.question}</p>
              </div>
              <div className="border-l-2 border-l-info pl-4 py-1">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Answer</p>
                <p className="text-sm whitespace-pre-wrap">{qa.answer}</p>
              </div>
            </div>
          ))}

          {/* Streaming answer in progress */}
          {pendingQuestion && (
            <div className="space-y-2">
              <div className="border-l-2 border-l-primary pl-4 py-1">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Question</p>
                <p className="text-sm">{pendingQuestion}</p>
              </div>
              <div className="border-l-2 border-l-info pl-4 py-1">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Answer</p>
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
          )}

          <div ref={historyEndRef} />
        </div>

        {/* Action buttons */}
        {!isStreaming && (
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={handleNewChat}>
              <MessageSquarePlus className="h-4 w-4 mr-2" />
              New chat
            </Button>
            {onExportToModify && displayedHistory.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleExportToModify} className="flex-1">
                <ArrowRight className="h-4 w-4 mr-2" />
                Export to modify
              </Button>
            )}
          </div>
        )}

        {/* Input */}
        <div className="space-y-3 pt-2 border-t">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Textarea
            placeholder="Ask a question about your protocol..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !isStreaming) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={!question.trim() || isStreaming} size="sm">
              {isStreaming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {stage === 'researching' ? 'Researching...' : 'Thinking...'}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Ask
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
