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
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Wand2, Check, X } from 'lucide-react';
import { useSSEStream } from '@/lib/hooks/useSSEStream';

type ModifyState = 'input' | 'streaming' | 'proposal' | 'error';

interface ModifyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  protocolId: string;
  onAccepted: (newId: string) => void;
  initialMessage?: string;
}

interface StreamResult {
  modificationId: string;
  proposal: {
    reasoning: string;
    verification: {
      weighted_goal_score?: number;
      viability_score?: number;
    };
  };
  currentScores: {
    weighted_goal_score?: number | null;
    viability_score?: number | null;
  };
}

interface ProposalData {
  modificationId: string;
  reasoning: string;
  currentScores: {
    weighted_goal_score?: number | null;
    viability_score?: number | null;
  };
  proposedScores: {
    weighted_goal_score?: number;
    viability_score?: number;
  };
}

export function ModifyModal({ open, onOpenChange, protocolId, onAccepted, initialMessage }: ModifyModalProps) {
  const [state, setState] = useState<ModifyState>('input');
  const [message, setMessage] = useState('');
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const reasoningEndRef = useRef<HTMLDivElement>(null);

  const {
    streamedText,
    result: streamResult,
    error: streamError,
    isStreaming,
    startStream,
    reset: resetStream,
  } = useSSEStream<StreamResult>();

  // Pre-fill message when initialMessage changes
  useEffect(() => {
    if (initialMessage && open) {
      setMessage(initialMessage);
    }
  }, [initialMessage, open]);

  // Auto-scroll reasoning as it streams
  useEffect(() => {
    reasoningEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [streamedText]);

  // Handle stream completion
  useEffect(() => {
    if (streamResult && !isStreaming && state === 'streaming') {
      setProposal({
        modificationId: streamResult.modificationId,
        reasoning: streamResult.proposal.reasoning,
        currentScores: streamResult.currentScores,
        proposedScores: {
          weighted_goal_score: streamResult.proposal.verification.weighted_goal_score,
          viability_score: streamResult.proposal.verification.viability_score,
        },
      });
      setState('proposal');
      resetStream();
    }
  }, [streamResult, isStreaming, state, resetStream]);

  // Handle stream error
  useEffect(() => {
    if (streamError && state === 'streaming') {
      setError(streamError);
      setState('error');
    }
  }, [streamError, state]);

  const handleSubmit = async () => {
    if (!message.trim()) return;

    setState('streaming');
    setError(null);

    await startStream('/api/protocol/modify?stream=true', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ protocolId, userMessage: message }),
    });
  };

  const handleAccept = async () => {
    if (!proposal) return;
    setAccepting(true);

    try {
      const response = await fetch('/api/protocol/modify/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modificationId: proposal.modificationId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept modification');
      }

      onAccepted(data.id);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept');
    } finally {
      setAccepting(false);
    }
  };

  const handleReject = async () => {
    if (!proposal) return;

    try {
      await fetch('/api/protocol/modify/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modificationId: proposal.modificationId }),
      });
    } catch {
      // Rejection is best-effort
    }

    handleClose();
  };

  const handleClose = () => {
    setState('input');
    setMessage('');
    setProposal(null);
    setError(null);
    resetStream();
    onOpenChange(false);
  };

  const formatScore = (score: number | null | undefined) =>
    score != null ? score.toFixed(1) : '--';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modify protocol</DialogTitle>
          <DialogDescription>
            Describe what you'd like to change. AI will research your suggestions and propose modifications.
          </DialogDescription>
        </DialogHeader>

        {state === 'input' && (
          <div className="space-y-4">
            <Textarea
              placeholder="What would you like to change? (e.g., 'Switch to a plant-based diet', 'Add more mobility work', 'Reduce training volume')"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!message.trim()}>
                <Wand2 className="h-4 w-4 mr-2" />
                Research & modify
              </Button>
            </DialogFooter>
          </div>
        )}

        {state === 'streaming' && (
          <div className="space-y-4">
            <div className="border-l-2 border-l-info pl-4 py-2">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">AI reasoning</p>
              <div className="max-h-[300px] overflow-y-auto">
                {streamedText ? (
                  <p className="text-sm whitespace-pre-wrap">{streamedText}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Thinking...</p>
                )}
                <div ref={reasoningEndRef} />
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              {streamedText ? 'Generating modified protocol...' : 'Researching your suggestions...'}
            </div>
          </div>
        )}

        {state === 'proposal' && proposal && (
          <div className="space-y-4">
            {/* Reasoning */}
            <div className="border-l-2 border-l-info pl-4 py-2">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">AI reasoning</p>
              <p className="text-sm">{proposal.reasoning}</p>
            </div>

            {/* Score comparison */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-lg bg-muted text-center">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">Current</p>
                <div className="flex items-center justify-center gap-4">
                  <div>
                    <p className="font-mono text-lg font-semibold tabular-nums">
                      {formatScore(proposal.currentScores.weighted_goal_score)}
                    </p>
                    <p className="text-xs text-muted-foreground">Goal</p>
                  </div>
                  <div>
                    <p className="font-mono text-lg font-semibold tabular-nums">
                      {formatScore(proposal.currentScores.viability_score)}
                    </p>
                    <p className="text-xs text-muted-foreground">Viability</p>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-center">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">Proposed</p>
                <div className="flex items-center justify-center gap-4">
                  <div>
                    <p className="font-mono text-lg font-semibold tabular-nums">
                      {formatScore(proposal.proposedScores.weighted_goal_score)}
                    </p>
                    <p className="text-xs text-muted-foreground">Goal</p>
                  </div>
                  <div>
                    <p className="font-mono text-lg font-semibold tabular-nums">
                      {formatScore(proposal.proposedScores.viability_score)}
                    </p>
                    <p className="text-xs text-muted-foreground">Viability</p>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleReject} disabled={accepting}>
                <X className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button onClick={handleAccept} disabled={accepting}>
                {accepting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Accept changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {state === 'error' && (
          <div className="space-y-4">
            <div className="border-l-2 border-l-destructive pl-4 py-2">
              <p className="text-sm text-destructive">{error || 'An error occurred'}</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={() => setState('input')}>
                Try again
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
