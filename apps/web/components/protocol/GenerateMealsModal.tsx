'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Sparkles, Check, X, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { useSSEStream } from '@/lib/hooks/useSSEStream';
import type { Meal } from '@/lib/schemas/protocol';

type GenerateState = 'input' | 'streaming' | 'proposal' | 'error';

interface MacroComparison {
  current: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
  proposed: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
  targets: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
}

interface StreamResult {
  proposalId: string;
  meals: Meal[];
  reasoning: string;
  timingStrategy?: string;
  macroComparison: MacroComparison;
}

interface ProposalData {
  proposalId: string;
  meals: Meal[];
  reasoning: string;
  timingStrategy?: string;
  macroComparison: MacroComparison;
}

interface GenerateMealsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  protocolId: string;
  onAccepted: (newId: string) => void;
  currentMacros: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
}

export function GenerateMealsModal({
  open,
  onOpenChange,
  protocolId,
  onAccepted,
  currentMacros,
}: GenerateMealsModalProps) {
  const [state, setState] = useState<GenerateState>('input');
  const [mealCount, setMealCount] = useState(4);
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [expandedMeal, setExpandedMeal] = useState<number | null>(null);
  const reasoningEndRef = useRef<HTMLDivElement>(null);

  const {
    streamedText,
    result: streamResult,
    error: streamError,
    isStreaming,
    startStream,
    reset: resetStream,
  } = useSSEStream<StreamResult>();

  // Auto-scroll reasoning as it streams
  useEffect(() => {
    reasoningEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [streamedText]);

  // Handle stream completion
  useEffect(() => {
    if (streamResult && !isStreaming && state === 'streaming') {
      setProposal({
        proposalId: streamResult.proposalId,
        meals: streamResult.meals,
        reasoning: streamResult.reasoning,
        timingStrategy: streamResult.timingStrategy,
        macroComparison: streamResult.macroComparison,
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

  const handleGenerate = async () => {
    setState('streaming');
    setError(null);

    await startStream('/api/protocol/generate-meals?stream=true', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        protocolId,
        mealCount,
      }),
    });
  };

  const handleAccept = async () => {
    if (!proposal) return;
    setAccepting(true);

    try {
      const response = await fetch('/api/protocol/generate-meals/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId: proposal.proposalId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept meal plan');
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
      await fetch('/api/protocol/generate-meals/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId: proposal.proposalId }),
      });
    } catch {
      // Rejection is best-effort
    }

    handleClose();
  };

  const handleClose = () => {
    setState('input');
    setMealCount(4);
    setProposal(null);
    setError(null);
    setExpandedMeal(null);
    resetStream();
    onOpenChange(false);
  };

  const formatMacro = (value: number, unit: string = '') =>
    `${Math.round(value).toLocaleString()}${unit}`;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate meal timing</DialogTitle>
          <DialogDescription>
            AI will create meal slots with macro targets and timing guidance. You choose your own foods.
          </DialogDescription>
        </DialogHeader>

        {state === 'input' && (
          <div className="space-y-4">
            {/* Current targets display */}
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Daily targets</p>
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center">
                  <p className="font-mono text-sm font-semibold tabular-nums">{formatMacro(currentMacros.calories)}</p>
                  <p className="text-xs text-muted-foreground">cal</p>
                </div>
                <div className="text-center">
                  <p className="font-mono text-sm font-semibold tabular-nums">{formatMacro(currentMacros.protein_g)}g</p>
                  <p className="text-xs text-muted-foreground">protein</p>
                </div>
                <div className="text-center">
                  <p className="font-mono text-sm font-semibold tabular-nums">{formatMacro(currentMacros.carbs_g)}g</p>
                  <p className="text-xs text-muted-foreground">carbs</p>
                </div>
                <div className="text-center">
                  <p className="font-mono text-sm font-semibold tabular-nums">{formatMacro(currentMacros.fat_g)}g</p>
                  <p className="text-xs text-muted-foreground">fat</p>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="mealCount" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Number of meal slots
              </Label>
              <Input
                id="mealCount"
                type="number"
                min={2}
                max={6}
                value={mealCount}
                onChange={(e) => setMealCount(Math.min(6, Math.max(2, parseInt(e.target.value) || 4)))}
                className="font-mono mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                AI will distribute your daily macros across {mealCount} optimally-timed meals
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleGenerate}>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate timing
              </Button>
            </DialogFooter>
          </div>
        )}

        {state === 'streaming' && (
          <div className="space-y-4">
            <div className="border-l-2 border-l-info pl-4 py-2">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">Analyzing schedule</p>
              <div className="max-h-[300px] overflow-y-auto">
                {streamedText ? (
                  <p className="text-sm whitespace-pre-wrap">{streamedText}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Researching optimal nutrient timing...</p>
                )}
                <div ref={reasoningEndRef} />
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              {streamedText ? 'Generating meal slots...' : 'Analyzing your schedule and goals...'}
            </div>
          </div>
        )}

        {state === 'proposal' && proposal && (
          <div className="space-y-4">
            {/* Timing strategy */}
            {proposal.timingStrategy && (
              <div className="border-l-2 border-l-primary pl-4 py-2">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">Timing strategy</p>
                <p className="text-sm">{proposal.timingStrategy}</p>
              </div>
            )}

            {/* Reasoning */}
            <div className="border-l-2 border-l-info pl-4 py-2">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">Reasoning</p>
              <p className="text-sm">{proposal.reasoning}</p>
            </div>

            {/* Macro totals */}
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Total macro distribution</p>
              <div className="grid grid-cols-4 gap-2 text-sm">
                <div className="text-center">
                  <span className="font-mono tabular-nums font-semibold">{formatMacro(proposal.macroComparison.proposed.calories)}</span>
                  <p className="text-xs text-muted-foreground">cal</p>
                </div>
                <div className="text-center">
                  <span className="font-mono tabular-nums font-semibold">{formatMacro(proposal.macroComparison.proposed.protein_g)}g</span>
                  <p className="text-xs text-muted-foreground">protein</p>
                </div>
                <div className="text-center">
                  <span className="font-mono tabular-nums font-semibold">{formatMacro(proposal.macroComparison.proposed.carbs_g)}g</span>
                  <p className="text-xs text-muted-foreground">carbs</p>
                </div>
                <div className="text-center">
                  <span className="font-mono tabular-nums font-semibold">{formatMacro(proposal.macroComparison.proposed.fat_g)}g</span>
                  <p className="text-xs text-muted-foreground">fat</p>
                </div>
              </div>
            </div>

            {/* Proposed meal slots */}
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Meal slots</p>
              <div className="divide-y divide-border max-h-[250px] overflow-y-auto rounded-lg border">
                {proposal.meals.map((meal, index) => {
                  const isExpanded = expandedMeal === index;
                  return (
                    <div key={index} className="p-3">
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => setExpandedMeal(isExpanded ? null : index)}
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{meal.name}</p>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span className="font-mono text-xs">{meal.time}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm font-semibold tabular-nums">
                            {meal.target_calories || meal.calories}<span className="text-xs text-muted-foreground ml-0.5">cal</span>
                          </p>
                          <p className="font-mono text-xs text-muted-foreground tabular-nums">
                            P {Math.round(meal.target_protein_g || meal.protein_g)}g · C {Math.round(meal.target_carbs_g || meal.carbs_g)}g · F {Math.round(meal.target_fat_g || meal.fat_g)}g
                          </p>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="ml-6 mt-3 space-y-2">
                          {/* Timing context */}
                          {meal.timing_context && (
                            <div className="border-l-2 border-l-info pl-3 py-1">
                              <p className="text-xs text-muted-foreground">{meal.timing_context}</p>
                            </div>
                          )}
                          {/* Notes/guidance */}
                          {meal.notes && (
                            <p className="text-sm text-muted-foreground">{meal.notes}</p>
                          )}
                          {/* Empty foods note */}
                          <p className="text-xs text-muted-foreground italic">
                            You&apos;ll choose your own foods to hit these targets
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
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
                    Accept timing
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
