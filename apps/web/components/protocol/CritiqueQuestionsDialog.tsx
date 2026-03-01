'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Sparkles } from 'lucide-react';
import type { Critique } from '@/lib/schemas/protocol';

interface CritiqueAnswer {
  critiqueIndex: number;
  questionId: string;
  answer: string;
}

interface CritiqueQuestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  critiques: Array<{ index: number; critique: Critique }>;
  onSubmit: (answers: CritiqueAnswer[]) => Promise<void>;
}

export function CritiqueQuestionsDialog({
  open,
  onOpenChange,
  critiques,
  onSubmit,
}: CritiqueQuestionsDialogProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Build unique key for each answer: `${critiqueIndex}_${questionId}`
  const getAnswerKey = (critiqueIndex: number, questionId: string) =>
    `${critiqueIndex}_${questionId}`;

  const handleAnswerChange = (critiqueIndex: number, questionId: string, value: string) => {
    const key = getAnswerKey(critiqueIndex, questionId);
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Convert answers map to array format expected by API
      const answerArray: CritiqueAnswer[] = [];
      for (const { index, critique } of critiques) {
        for (const question of critique.questions || []) {
          const key = getAnswerKey(index, question.id);
          const answer = answers[key];
          if (answer) {
            answerArray.push({
              critiqueIndex: index,
              questionId: question.id,
              answer,
            });
          }
        }
      }
      await onSubmit(answerArray);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setAnswers({});
      onOpenChange(false);
    }
  };

  // Count total questions
  const totalQuestions = critiques.reduce(
    (sum, { critique }) => sum + (critique.questions?.length || 0),
    0
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Apply {critiques.length} recommendation{critiques.length > 1 ? 's' : ''}
          </DialogTitle>
          <DialogDescription>
            {totalQuestions > 0
              ? 'Answer these questions to help personalize the changes.'
              : 'Ready to apply the selected recommendations.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {critiques.map(({ index, critique }) => (
            <div key={index} className="space-y-4">
              {/* Critique summary */}
              <div className="border-l-2 border-l-primary pl-4 py-2">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium font-mono ${
                    critique.severity === 'major'
                      ? 'bg-destructive/15 text-destructive'
                      : critique.severity === 'moderate'
                        ? 'bg-warning/15 text-warning'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {critique.severity}
                </span>
                <span className="ml-2 text-sm text-muted-foreground">{critique.category}</span>
                <p className="mt-1 text-sm">{critique.criticism}</p>
              </div>

              {/* Questions for this critique */}
              {critique.questions && critique.questions.length > 0 && (
                <div className="space-y-4 pl-4">
                  {critique.questions.map((question) => {
                    const answerKey = getAnswerKey(index, question.id);
                    const currentAnswer = answers[answerKey] || '';

                    return (
                      <div key={question.id} className="space-y-2">
                        <Label htmlFor={answerKey} className="text-sm font-medium">
                          {question.question}
                        </Label>
                        {question.context && (
                          <p className="text-xs text-muted-foreground">{question.context}</p>
                        )}

                        {question.inputType === 'select' && question.options ? (
                          <Select
                            id={answerKey}
                            value={currentAnswer}
                            onChange={(e) =>
                              handleAnswerChange(index, question.id, e.target.value)
                            }
                            options={question.options}
                            placeholder="Select an option..."
                            className="w-full"
                          />
                        ) : (
                          <Input
                            id={answerKey}
                            value={currentAnswer}
                            onChange={(e) =>
                              handleAnswerChange(index, question.id, e.target.value)
                            }
                            placeholder="Type your answer..."
                            className="w-full"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Apply{totalQuestions > 0 ? ' with preferences' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
