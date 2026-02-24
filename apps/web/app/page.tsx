'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Clock,
  Utensils,
  Dumbbell,
  Pill,
  BarChart3,
  MessageSquare,
  type LucideIcon
} from 'lucide-react';
import { AuthButton } from '@/components/auth/AuthButton';
import { ProtocolWizard } from '@/components/forms/ProtocolWizard';
import { ProtocolDisplay } from '@/components/protocol/ProtocolDisplay';
import { EvaluationSummary } from '@/components/protocol/EvaluationSummary';
import {
  GenerationModal,
  type GenerationStage
} from '@/components/protocol/GenerationModal';
import { Button, buttonVariants } from '@/components/ui/button';
import { setPendingProtocol } from '@/lib/hooks/useClaimPendingProtocol';
import {
  CredibilityStrip,
  MobileAppSection,
  HowItWorks
} from '@/components/landing';
import type { DailyProtocol } from '@/lib/schemas/protocol';
import type { PersonalInfo, Goal } from '@/lib/schemas/user-config';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: Clock,
    title: 'Schedule',
    description: 'Wake-to-sleep time blocks. Every hour accounted for.'
  },
  {
    icon: Utensils,
    title: 'Diet',
    description: 'Macro targets, meals, hydration. Calorie-precise.'
  },
  {
    icon: Dumbbell,
    title: 'Training',
    description: 'Programmed workouts with sets, reps, and rest periods.'
  },
  {
    icon: Pill,
    title: 'Supplements',
    description: 'Evidence-based stack with dosages and timing.'
  },
  {
    icon: BarChart3,
    title: 'Evaluation',
    description: 'Goal scores and requirement adherence.'
  },
  {
    icon: MessageSquare,
    title: 'Modification',
    description: 'Push back on any decision. Maxim researches and adapts.'
  }
];

export default function HomePage() {
  const [protocol, setProtocol] = useState<DailyProtocol | null>(null);
  const [scores, setScores] = useState<{
    requirements_met?: boolean;
    weighted_goal_score?: number;
  } | null>(null);
  const [generationStage, setGenerationStage] =
    useState<GenerationStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wizardRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<HTMLDivElement>(null);

  const scrollToWizard = () => {
    wizardRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToApp = () => {
    appRef.current?.scrollIntoView({ behavior: 'smooth' });
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
        body: JSON.stringify(config)
      });

      clearTimeout(evaluatingTimer);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate protocol');
      }

      setGenerationStage('complete');
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setProtocol(data.protocol);
      setScores(
        data.evaluation
          ? {
              requirements_met: data.evaluation.requirements_met,
              weighted_goal_score: data.evaluation.weighted_goal_score,
            }
          : null
      );

      // Store protocol ID for claiming after sign-up
      if (data.id) {
        setPendingProtocol(data.id);
      }

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
    <div className="min-h-screen landing-gradient">
      {generationStage && (
        <GenerationModal stage={generationStage} error={error} />
      )}

      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Maxim" width={32} height={32} />
            <span className="text-base font-semibold tracking-tight">
              Maxim
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <button
              onClick={scrollToFeatures}
              className="hover:text-foreground transition-colors duration-150"
            >
              Features
            </button>
            <button
              onClick={scrollToApp}
              className="hover:text-foreground transition-colors duration-150"
            >
              Mobile App
            </button>
          </nav>
          <AuthButton />
        </div>
      </header>

      <main>
        {!protocol ? (
          <>
            {/* Hero */}
            <section className="container mx-auto px-4 pt-12 pb-8 text-center">
              <p className="text-xs font-medium uppercase tracking-widest text-primary mb-4">
                Evidence-based health optimization
              </p>
              <h1 className="text-3xl font-bold tracking-tight mb-3">
                Your daily protocol, precisely engineered
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Schedule. Diet. Supplements. Training.{' '}
                <span className="text-foreground font-medium">
                  Scored, verifiable, challengeable.
                </span>
              </p>
            </section>

            {/* Credibility Strip */}
            {/* <CredibilityStrip /> */}

            {/* Wizard + Mobile App Side by Side */}
            <section ref={wizardRef} className="container mx-auto px-4 py-12">
              <div
                ref={appRef}
                className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-32 items-start"
              >
                {/* Wizard - hidden on mobile */}
                <div className="hidden md:block">
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
                    Sign in to save protocols and unlock modifications.
                  </p>
                </div>

                {/* Mobile App */}
                <MobileAppSection inline />
              </div>
            </section>

            {/* Features */}
            <section
              ref={featuresRef}
              className="container mx-auto px-4 py-12"
            >
              <div className="max-w-4xl mx-auto">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
                  What you get
                </p>
                <h2 className="text-lg font-semibold tracking-tight mb-8">
                  A complete daily system
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {FEATURES.map((feature) => (
                    <div
                      key={feature.title}
                      className="border-l-2 border-l-primary pl-4 py-3"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <feature.icon className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold">
                          {feature.title}
                        </h3>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* How It Works */}
            <HowItWorks />
          </>
        ) : (
          <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold tracking-tight">
                  Your protocol
                </h2>
                {scores && (
                  <EvaluationSummary
                    requirementsMet={scores.requirements_met}
                    goalScore={scores.weighted_goal_score}
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

            {/* CTA to save protocol */}
            <div className="border-l-2 border-l-primary pl-4 py-3 mt-6 bg-muted/50 rounded-r-lg">
              <p className="text-sm font-medium">Save this protocol?</p>
              <p className="text-xs text-muted-foreground mb-3">
                Sign up to keep it permanently and unlock AI-powered
                modifications.
              </p>
              <div className="flex gap-2">
                <Link href="/signup" className={buttonVariants({ size: 'sm' })}>
                  Sign up free
                </Link>
                <Link
                  href="/login"
                  className={buttonVariants({ size: 'sm', variant: 'ghost' })}
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Brand */}
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="Maxim" width={24} height={24} />
              <span className="text-sm font-medium">Maxim</span>
            </div>

            {/* Tagline */}
            <p className="text-xs text-muted-foreground">
              Evidence-based health optimization
            </p>

            {/* Links */}
            <div className="flex gap-4 text-xs text-muted-foreground">
              <Link
                href="/privacy"
                className="hover:text-foreground transition-colors duration-150"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="hover:text-foreground transition-colors duration-150"
              >
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
