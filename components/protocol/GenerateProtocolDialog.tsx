'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { ProtocolWizard } from '@/components/forms/ProtocolWizard';
import { GenerationModal, type GenerationStage } from './GenerationModal';
import type { PersonalInfo, Goal } from '@/lib/schemas/user-config';

interface GenerateProtocolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GenerateProtocolDialog({ open, onOpenChange }: GenerateProtocolDialogProps) {
  const router = useRouter();
  const [generationStage, setGenerationStage] = useState<GenerationStage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (inputConfig: {
    personal_info: PersonalInfo;
    goals: Goal[];
    requirements: string[];
  }) => {
    setError(null);
    setGenerationStage('searching');

    const fullConfig = { ...inputConfig, iterations: 1 };

    try {
      const response = await fetch('/api/protocol/generate?stream=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullConfig),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Generation failed' }));
        throw new Error(data.error || 'Failed to generate protocol');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let resultId: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6);
          if (!jsonStr) continue;

          try {
            const message = JSON.parse(jsonStr);

            if ('stage' in message) {
              if (message.stage === 'generating') setGenerationStage('generating');
              if (message.stage === 'evaluating') setGenerationStage('evaluating');
            } else if ('done' in message && message.done) {
              resultId = message.result?.id;
            } else if ('error' in message) {
              throw new Error(message.error);
            }
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue;
            throw parseErr;
          }
        }
      }

      setGenerationStage('complete');

      await new Promise((resolve) => setTimeout(resolve, 1500));

      onOpenChange(false);
      if (resultId) {
        router.push(`?protocol=${resultId}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setGenerationStage('error');

      setTimeout(() => {
        setGenerationStage(null);
      }, 3000);
    }
  };

  const handleClose = (open: boolean) => {
    if (generationStage && generationStage !== 'error') return;
    setGenerationStage(null);
    setError(null);
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {generationStage ? (
          <div className="p-6">
            <GenerationModal stage={generationStage} error={error} inline />
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Generate protocol</h2>
              <p className="text-sm text-muted-foreground">
                Create a personalized health protocol based on your goals and requirements.
              </p>
            </div>

            {error && !generationStage && (
              <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <ProtocolWizard
              isAuthenticated={true}
              onGenerate={handleGenerate}
              isLoading={!!generationStage}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
