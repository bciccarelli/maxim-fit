'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, Brain, ClipboardCheck, Sparkles, CheckCircle } from 'lucide-react';

export type GenerationStage =
  | 'searching'
  | 'generating'
  | 'evaluating'
  | 'complete'
  | 'error';

interface GenerationModalProps {
  stage: GenerationStage;
  error?: string | null;
}

const stages: { id: GenerationStage; label: string; description: string; icon: React.ReactNode }[] = [
  {
    id: 'searching',
    label: 'Researching',
    description: 'Searching for the latest evidence-based health recommendations...',
    icon: <Search className="h-5 w-5" />,
  },
  {
    id: 'generating',
    label: 'Generating Protocol',
    description: 'Creating your personalized health protocol based on your goals...',
    icon: <Brain className="h-5 w-5" />,
  },
  {
    id: 'evaluating',
    label: 'Evaluating',
    description: 'Analyzing the protocol for adherence and effectiveness...',
    icon: <ClipboardCheck className="h-5 w-5" />,
  },
  {
    id: 'complete',
    label: 'Complete',
    description: 'Your protocol is ready!',
    icon: <Sparkles className="h-5 w-5" />,
  },
];

function getStageIndex(stage: GenerationStage): number {
  if (stage === 'error') return -1;
  return stages.findIndex((s) => s.id === stage);
}

export function GenerationModal({ stage, error }: GenerationModalProps) {
  const [dots, setDots] = useState('');
  const currentStageIndex = getStageIndex(stage);

  useEffect(() => {
    if (stage === 'complete' || stage === 'error') return;

    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    return () => clearInterval(interval);
  }, [stage]);

  if (stage === 'error') {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Generation Failed</CardTitle>
            <CardDescription>
              {error || 'An unexpected error occurred while generating your protocol.'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            {stage === 'complete' ? (
              <CheckCircle className="h-8 w-8 text-primary" />
            ) : (
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            )}
          </div>
          <CardTitle>
            {stage === 'complete'
              ? 'Protocol Generated!'
              : `Generating Your Protocol${dots}`}
          </CardTitle>
          <CardDescription>
            {stage === 'complete'
              ? 'Your personalized health protocol is ready to view.'
              : 'This may take a minute. We\'re using real-time research to create your protocol.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stages.slice(0, -1).map((s, index) => {
              const isActive = index === currentStageIndex;
              const isComplete = index < currentStageIndex || stage === 'complete';
              const isPending = index > currentStageIndex && stage !== 'complete';

              return (
                <div
                  key={s.id}
                  className={`flex items-start gap-4 p-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary/10 border border-primary/20'
                      : isComplete
                      ? 'bg-success/10'
                      : 'bg-muted/50'
                  }`}
                >
                  <div
                    className={`mt-0.5 ${
                      isActive
                        ? 'text-primary'
                        : isComplete
                        ? 'text-success'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : isActive ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      s.icon
                    )}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`font-medium text-sm ${
                        isPending ? 'text-muted-foreground' : ''
                      }`}
                    >
                      {s.label}
                    </p>
                    <p
                      className={`text-xs ${
                        isActive
                          ? 'text-primary/80'
                          : isComplete
                          ? 'text-success/80'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {isComplete ? 'Complete' : s.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
