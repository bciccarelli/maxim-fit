'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertCircle, ChevronDown, ChevronUp, Loader2, X, Sparkles } from 'lucide-react';
import { CritiqueQuestionsDialog } from './CritiqueQuestionsDialog';
import type { Critique } from '@/lib/schemas/protocol';

interface CritiqueAnswer {
  critiqueIndex: number;
  questionId: string;
  answer: string;
}

interface CritiquesSectionProps {
  critiques: Critique[];
  protocolId: string;
  verified?: boolean;
  onCritiquesUpdated?: (critiques: Critique[]) => void;
}

export function CritiquesSection({
  critiques,
  protocolId,
  verified = true,
  onCritiquesUpdated,
}: CritiquesSectionProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [selectedCritiques, setSelectedCritiques] = useState<Set<number>>(new Set());
  const [dismissing, setDismissing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [displayCritiques, setDisplayCritiques] = useState<Critique[]>(critiques);
  const [showQuestionsDialog, setShowQuestionsDialog] = useState(false);

  const activeCritiques = displayCritiques;
  if (activeCritiques.length === 0) return null;

  const toggleCritique = (index: number) => {
    setSelectedCritiques((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleDismiss = async () => {
    if (selectedCritiques.size === 0) return;
    setDismissing(true);
    try {
      const response = await fetch('/api/protocol/critiques', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocolId,
          critiqueIndices: Array.from(selectedCritiques),
          action: 'dismiss',
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setDisplayCritiques(data.critiques);
        setSelectedCritiques(new Set());
        onCritiquesUpdated?.(data.critiques);
      }
    } catch {
      // silent fail
    } finally {
      setDismissing(false);
    }
  };

  // Submit the apply request to the API
  const submitApply = async (answers: CritiqueAnswer[] = []) => {
    setApplying(true);
    try {
      const response = await fetch('/api/protocol/critiques', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocolId,
          critiqueIndices: Array.from(selectedCritiques),
          action: 'apply',
          answers,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setDisplayCritiques(data.critiques);
        setSelectedCritiques(new Set());
        setShowQuestionsDialog(false);
        onCritiquesUpdated?.(data.critiques);
        router.refresh();
      }
    } catch {
      // silent fail
    } finally {
      setApplying(false);
    }
  };

  const handleApply = () => {
    if (selectedCritiques.size === 0) return;

    // Check if any selected critique has questions
    const selectedWithQuestions = Array.from(selectedCritiques)
      .map((i) => ({ index: i, critique: activeCritiques[i] }))
      .filter(({ critique }) => critique.questions && critique.questions.length > 0);

    if (selectedWithQuestions.length > 0) {
      // Show dialog to collect answers
      setShowQuestionsDialog(true);
      return;
    }

    // No questions - apply directly
    submitApply([]);
  };

  // Get critiques with questions for the dialog
  const critiquesForDialog = Array.from(selectedCritiques)
    .map((i) => ({ index: i, critique: activeCritiques[i] }))
    .filter(({ critique }) => critique.questions && critique.questions.length > 0);

  const majorCount = activeCritiques.filter(c => c.severity === 'major').length;
  const moderateCount = activeCritiques.filter(c => c.severity === 'moderate').length;

  return (
    <>
      <div className={`border rounded-lg ${!verified ? 'opacity-60' : ''}`}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-warning" />
            <span className="text-sm font-medium">
              {activeCritiques.length} area{activeCritiques.length !== 1 ? 's' : ''} for improvement
            </span>
            {majorCount > 0 && (
              <span className="px-2 py-0.5 rounded text-xs font-medium font-mono bg-destructive/15 text-destructive">
                {majorCount} major
              </span>
            )}
            {moderateCount > 0 && (
              <span className="px-2 py-0.5 rounded text-xs font-medium font-mono bg-warning/15 text-warning">
                {moderateCount} moderate
              </span>
            )}
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {expanded && (
          <div className="px-4 pb-4 space-y-2">
            {activeCritiques.map((critique, i) => (
              <div
                key={i}
                className={`border-l-2 pl-4 py-2 text-sm flex gap-3 ${
                  critique.severity === 'major' ? 'border-l-destructive' :
                  critique.severity === 'moderate' ? 'border-l-warning' :
                  'border-l-border'
                } ${selectedCritiques.has(i) ? 'bg-muted/50 rounded-r-lg' : ''}`}
              >
                <div className="flex-shrink-0 pt-0.5">
                  <input
                    type="checkbox"
                    checked={selectedCritiques.has(i)}
                    onChange={() => toggleCritique(i)}
                    className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-start gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium font-mono ${
                      critique.severity === 'major' ? 'bg-destructive/15 text-destructive' :
                      critique.severity === 'moderate' ? 'bg-warning/15 text-warning' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {critique.severity}
                    </span>
                    <span className="text-muted-foreground">{critique.category}</span>
                  </div>
                  <p className="mt-1">{critique.criticism}</p>
                  <p className="mt-1 text-muted-foreground italic">Suggestion: {critique.suggestion}</p>
                  {critique.questions && critique.questions.length > 0 && (
                    <p className="mt-1 text-xs text-primary">
                      {critique.questions.length} question{critique.questions.length > 1 ? 's' : ''} to personalize
                    </p>
                  )}
                </div>
              </div>
            ))}

            {selectedCritiques.size > 0 && (
              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDismiss}
                  disabled={dismissing || applying}
                >
                  {dismissing ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <X className="h-4 w-4 mr-1" />
                  )}
                  Dismiss
                </Button>
                <Button
                  size="sm"
                  onClick={handleApply}
                  disabled={dismissing || applying}
                >
                  {applying ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-1" />
                  )}
                  Apply recommendations
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <CritiqueQuestionsDialog
        open={showQuestionsDialog}
        onOpenChange={setShowQuestionsDialog}
        critiques={critiquesForDialog}
        onSubmit={submitApply}
      />
    </>
  );
}
