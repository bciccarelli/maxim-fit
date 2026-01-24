'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthButton } from '@/components/auth/AuthButton';
import { ProtocolWizard } from '@/components/forms/ProtocolWizard';
import { ProtocolDisplay } from '@/components/protocol/ProtocolDisplay';
import type { DailyProtocol } from '@/lib/schemas/protocol';
import type { PersonalInfo, Goal } from '@/lib/schemas/user-config';

export default function HomePage() {
  const [protocol, setProtocol] = useState<DailyProtocol | null>(null);
  const [scores, setScores] = useState<{
    requirement_scores?: Array<{ requirement_name: string; target: number; achieved: number; adherence_percent: number; suggestions: string }>;
    goal_scores?: Array<{ goal_name: string; score: number; reasoning: string; suggestions: string }>;
    critiques?: Array<{ category: string; criticism: string; severity: 'minor' | 'moderate' | 'major'; suggestion: string }>;
    requirements_met?: boolean;
    weighted_goal_score?: number;
    viability_score?: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleGenerate = async (config: {
    personal_info: PersonalInfo;
    goals: Goal[];
    requirements: string[];
  }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/protocol/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate protocol');
      }

      setProtocol(data.protocol);
      setScores(data.evaluation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Protocol App</h1>
          <AuthButton />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!protocol ? (
          <>
            {/* Hero Section */}
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">
                Your Personalized Health Protocol
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Generate an evidence-based, AI-powered daily routine tailored to your goals,
                requirements, and lifestyle. Powered by the latest health research.
              </p>
            </div>

            {/* Feature Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 max-w-4xl mx-auto">
              <div className="p-6 rounded-lg border bg-muted/50">
                <h3 className="font-semibold mb-4">Anonymous Access</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>Basic protocol generation</li>
                  <li>Beginner & Intermediate fitness levels</li>
                  <li>Protocol expires in 24 hours</li>
                </ul>
              </div>
              <div className="p-6 rounded-lg border bg-primary/5 border-primary/20">
                <h3 className="font-semibold mb-4">Authenticated Access</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>All fitness levels including Advanced</li>
                  <li>Protocol optimization (iterations)</li>
                  <li>Save & view protocol history</li>
                  <li>Persistent knowledge base</li>
                </ul>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="max-w-2xl mx-auto mb-6 p-4 rounded-lg bg-destructive/10 text-destructive">
                {error}
              </div>
            )}

            {/* Protocol Wizard */}
            <ProtocolWizard
              isAuthenticated={false}
              onGenerate={handleGenerate}
              isLoading={loading}
            />
          </>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Your Protocol</h2>
              <button
                onClick={() => {
                  setProtocol(null);
                  setScores(null);
                }}
                className="text-sm text-primary hover:underline"
              >
                Generate New Protocol
              </button>
            </div>
            <ProtocolDisplay protocol={protocol} scores={scores ?? undefined} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>Protocol App - AI-Powered Health Optimization</p>
        </div>
      </footer>
    </div>
  );
}
