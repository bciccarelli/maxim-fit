'use client';

import { useState } from 'react';
import { ProtocolWizard } from '@/components/forms/ProtocolWizard';
import { ProtocolDisplay } from '@/components/protocol/ProtocolDisplay';
import { GenerationModal, type GenerationStage } from '@/components/protocol/GenerationModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, RefreshCw } from 'lucide-react';
import type { DailyProtocol, Critique } from '@/lib/schemas/protocol';
import type { PersonalInfo, Goal } from '@/lib/schemas/user-config';

export default function CreateProtocolPage() {
  const [protocol, setProtocol] = useState<DailyProtocol | null>(null);
  const [scores, setScores] = useState<{
    requirement_scores?: Array<{ requirement_name: string; target: number; achieved: number; adherence_percent: number; suggestions: string }>;
    goal_scores?: Array<{ goal_name: string; score: number; reasoning: string; suggestions: string }>;
    critiques?: Critique[];
    requirements_met?: boolean;
    weighted_goal_score?: number;
    viability_score?: number;
  } | null>(null);
  const [config, setConfig] = useState<{
    personal_info: PersonalInfo;
    goals: Goal[];
    requirements: string[];
    iterations: number;
  } | null>(null);
  const [generationStage, setGenerationStage] = useState<GenerationStage | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iterations, setIterations] = useState(3);
  const [currentIteration, setCurrentIteration] = useState(0);

  const handleGenerate = async (inputConfig: {
    personal_info: PersonalInfo;
    goals: Goal[];
    requirements: string[];
  }) => {
    setError(null);
    setGenerationStage('searching');

    const fullConfig = { ...inputConfig, iterations };
    setConfig(fullConfig);

    try {
      // Simulate stage progression while waiting for API
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

      // Brief pause to show completion state
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setProtocol(data.protocol);
      setScores(data.evaluation);
      setCurrentIteration(0);
      setGenerationStage(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setGenerationStage('error');

      // Reset after showing error
      setTimeout(() => {
        setGenerationStage(null);
      }, 3000);
    }
  };

  const handleOptimize = async () => {
    if (!protocol || !scores || !config) return;

    setOptimizing(true);
    setError(null);

    try {
      const response = await fetch('/api/protocol/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          currentProtocol: protocol,
          critiques: scores.critiques || [],
          iteration: currentIteration,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to optimize protocol');
      }

      setProtocol(data.protocol);
      setScores(data.evaluation);
      setCurrentIteration(data.iteration);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setOptimizing(false);
    }
  };

  const handleRunAllIterations = async () => {
    if (!config) return;

    for (let i = currentIteration; i < iterations; i++) {
      await handleOptimize();
    }
  };

  return (
    <div className="space-y-8">
      {/* Generation Modal */}
      {generationStage && (
        <GenerationModal stage={generationStage} error={error} />
      )}

      <div>
        <h1 className="text-3xl font-bold">Create Protocol</h1>
        <p className="text-muted-foreground">
          Generate a personalized health protocol with full optimization capabilities.
        </p>
      </div>

      {!protocol ? (
        <>
          {/* Iteration Settings */}
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Optimization Settings</CardTitle>
              <CardDescription>
                Configure how many optimization iterations to run
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="iterations">Number of Iterations (1-10)</Label>
                <Input
                  id="iterations"
                  type="number"
                  min={1}
                  max={10}
                  value={iterations}
                  onChange={(e) => setIterations(parseInt(e.target.value) || 3)}
                />
                <p className="text-xs text-muted-foreground">
                  More iterations = better optimization but longer wait time
                </p>
              </div>
            </CardContent>
          </Card>

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
        </>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Generated Protocol</h2>
              <p className="text-sm text-muted-foreground">
                Iteration {currentIteration} of {iterations}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {currentIteration < iterations && scores?.critiques && scores.critiques.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleOptimize}
                    disabled={optimizing}
                  >
                    {optimizing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Optimizing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Run 1 Iteration
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleRunAllIterations}
                    disabled={optimizing}
                  >
                    Run All ({iterations - currentIteration} left)
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                onClick={() => {
                  setProtocol(null);
                  setScores(null);
                  setConfig(null);
                  setCurrentIteration(0);
                  setError(null);
                }}
              >
                Start Over
              </Button>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
              {error}
            </div>
          )}

          <ProtocolDisplay protocol={protocol} scores={scores ?? undefined} />
        </div>
      )}
    </div>
  );
}
