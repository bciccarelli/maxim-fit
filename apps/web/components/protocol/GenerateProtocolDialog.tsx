'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { ProtocolWizard } from '@/components/forms/ProtocolWizard';
import { GenerationModal, type GenerationStage } from './GenerationModal';
import { Loader2 } from 'lucide-react';
import type { PersonalInfo, Goal } from '@/lib/schemas/user-config';

interface UserConfig {
  personal_info: PersonalInfo;
  goals: Goal[];
  requirements: string[];
}

interface GenerateProtocolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GenerateProtocolDialog({ open, onOpenChange }: GenerateProtocolDialogProps) {
  const router = useRouter();
  const [generationStage, setGenerationStage] = useState<GenerationStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<UserConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [configFetched, setConfigFetched] = useState(false);

  // Fetch user's saved config when dialog opens
  useEffect(() => {
    if (open && !configFetched && !configLoading) {
      setConfigLoading(true);
      fetch('/api/config')
        .then(res => res.json())
        .then(data => {
          setConfig(data.config ?? null);
          setConfigFetched(true);
        })
        .catch(err => {
          console.error('Error fetching config:', err);
          setConfigFetched(true);
        })
        .finally(() => setConfigLoading(false));
    }
  }, [open, configFetched, configLoading]);

  const handleGenerate = async (inputConfig: {
    personal_info: PersonalInfo;
    goals: Goal[];
    requirements: string[];
  }) => {
    setError(null);
    setGenerationStage('generating');

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
        ) : configLoading ? (
          <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">Loading your settings...</p>
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
              onGenerate={handleGenerate}
              isLoading={!!generationStage}
              initialConfig={config ? {
                personal_info: config.personal_info,
                goals: config.goals,
                requirements: config.requirements,
              } : undefined}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
