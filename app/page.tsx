'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AuthButton } from '@/components/auth/AuthButton';
import { ProtocolWizard } from '@/components/forms/ProtocolWizard';
import { ProtocolDisplay } from '@/components/protocol/ProtocolDisplay';
import { EvaluationSummary } from '@/components/protocol/EvaluationSummary';
import { GenerationModal, type GenerationStage } from '@/components/protocol/GenerationModal';
import type { DailyProtocol } from '@/lib/schemas/protocol';
import type { PersonalInfo, Goal } from '@/lib/schemas/user-config';

const FEATURES = [
  {
    title: 'Schedule',
    description: 'Wake-to-sleep time blocks. Every hour accounted for.',
  },
  {
    title: 'Diet',
    description: 'Macro targets, meals, hydration. Calorie-precise.',
  },
  {
    title: 'Training',
    description: 'Programmed workouts with sets, reps, and rest periods.',
  },
  {
    title: 'Supplements',
    description: 'Evidence-based stack with dosages and timing.',
  },
  {
    title: 'Evaluation',
    description: 'Goal and viability scores. Requirement adherence.',
  },
  {
    title: 'Modification',
    description: 'Push back on any decision. AI researches and adapts.',
  },
];

export default function HomePage() {
  const [protocol, setProtocol] = useState<DailyProtocol | null>(null);
  const [scores, setScores] = useState<{
    requirements_met?: boolean;
    weighted_goal_score?: number;
    viability_score?: number;
  } | null>(null);
  const [generationStage, setGenerationStage] = useState<GenerationStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wizardRef = useRef<HTMLDivElement>(null);

  const scrollToWizard = () => {
    wizardRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleGenerate = async (config: {
    personal_info: PersonalInfo;
    goals: Goal[];
    requirements: string[];
  }) => {
    setError(null);
    setGenerationStage('generating');

    try {
      const evaluatingTimer = setTimeout(() => {
        setGenerationStage('evaluating');
      }, 5000);

      const response = await fetch('/api/protocol/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      clearTimeout(evaluatingTimer);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate protocol');
      }

      setGenerationStage('complete');
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setProtocol(data.protocol);
      setScores(data.evaluation ? {
        requirements_met: data.evaluation.requirements_met,
        weighted_goal_score: data.evaluation.weighted_goal_score,
        viability_score: data.evaluation.viability_score,
      } : null);
      setGenerationStage(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setGenerationStage('error');
      setTimeout(() => {
        setGenerationStage(null);
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {generationStage && (
        <GenerationModal stage={generationStage} error={error} />
      )}

      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Image src="/wordmark.png" alt="oo.coach" width={80} height={30} />
          <AuthButton />
        </div>
      </header>

      <main>
        {!protocol ? (
          <>
            {/* Hero */}
            <section className="container mx-auto px-4 pt-4 pb-8 text-center">
              <h1 className="text-3xl font-bold tracking-tight pt-4 mt-4 mb-2">
                You have a life.
              </h1>
              <h1 className="text-3xl font-bold tracking-tight text-primary mb-2">
                Get a protocol that works around it. 
              </h1>
              <h2 className="text-1xl font-bold tracking-tight text-primary mb-4">
                (For free)
              </h2>
              
              <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                Evidence-based daily routines — schedule, diet, supplements,
                training — tailored to your goals. Scored, verifiable,
                challengeable.
              </p>
            </section>

            {/* Wizard */}
            <section ref={wizardRef} className="container mx-auto px-4 py-8">
              <div className="max-w-xl mx-auto">
                {error && !generationStage && (
                  <div className="border-l-2 border-l-destructive pl-4 py-2 mb-6">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <ProtocolWizard
                  onGenerate={handleGenerate}
                  isLoading={!!generationStage}
                />

                <p className="text-center text-xs text-muted-foreground mt-6">
                  Sign in to save protocols and unlock AI modifications.
                </p>
              </div>
            </section>

            {/* Features */}
            <section className="container mx-auto px-4 py-8">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-6">
                  What you get
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {FEATURES.map((feature) => (
                    <div
                      key={feature.title}
                      className="border-l-2 border-l-primary pl-4 py-3"
                    >
                      <h3 className="text-sm font-semibold mb-1">{feature.title}</h3>
                      <p className="text-xs text-muted-foreground">{feature.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        ) : (
          <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold tracking-tight">Your protocol</h2>
                {scores && (
                  <EvaluationSummary
                    requirementsMet={scores.requirements_met}
                    goalScore={scores.weighted_goal_score}
                    viabilityScore={scores.viability_score}
                  />
                )}
              </div>
              <button
                onClick={() => {
                  setProtocol(null);
                  setScores(null);
                  setError(null);
                }}
                className="text-sm text-primary hover:underline"
              >
                Generate new
              </button>
            </div>
            <ProtocolDisplay protocol={protocol} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-xs text-muted-foreground">
          Protocol — Evidence-based health optimization
        </div>
      </footer>
    </div>
  );
}
