'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtocolWizard } from '@/components/forms/ProtocolWizard';
import { GenerationModal, type GenerationStage } from '@/components/protocol/GenerationModal';
import type { PersonalInfo, Goal } from '@/lib/schemas/user-config';

export default function CreateProtocolPage() {
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
      const stageTimer = setTimeout(() => {
        setGenerationStage('generating');
      }, 2000);

      const evaluatingTimer = setTimeout(() => {
        setGenerationStage('evaluating');
      }, 8000);

      const response = await fetch('/api/protocol/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullConfig),
      });

      clearTimeout(stageTimer);
      clearTimeout(evaluatingTimer);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate protocol');
      }

      setGenerationStage('complete');

      // Brief pause to show completion state, then redirect
      await new Promise((resolve) => setTimeout(resolve, 1500));

      router.push(`/protocols/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setGenerationStage('error');

      setTimeout(() => {
        setGenerationStage(null);
      }, 3000);
    }
  };

  return (
    <div className="space-y-8">
      {/* Generation Modal */}
      {generationStage && (
        <GenerationModal stage={generationStage} error={error} />
      )}

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create protocol</h1>
        <p className="text-muted-foreground">
          Generate a personalized health protocol based on your goals and requirements.
        </p>
      </div>

      {/* Error Display (for non-modal errors) */}
      {error && !generationStage && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
          {error}
        </div>
      )}

      <ProtocolWizard
        isAuthenticated={true}
        onGenerate={handleGenerate}
        isLoading={!!generationStage}
      />
    </div>
  );
}
