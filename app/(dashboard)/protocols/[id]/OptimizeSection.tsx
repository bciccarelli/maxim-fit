'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2, MessageSquarePlus } from 'lucide-react';
import { FeedbackModal } from '@/components/protocol/FeedbackModal';
import type { DailyProtocol, Critique } from '@/lib/schemas/protocol';

interface OptimizeSectionProps {
  protocolId: string;
  currentProtocol: DailyProtocol;
  critiques: Critique[] | null;
  iteration: number;
}

export function OptimizeSection({
  protocolId,
  currentProtocol,
  critiques,
  iteration,
}: OptimizeSectionProps) {
  const [loading, setLoading] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const router = useRouter();

  const runOptimize = async (userCritiques?: Critique[]) => {
    setLoading(true);

    try {
      const isPureIteration = !userCritiques || userCritiques.length === 0;
      const allCritiques = [
        ...(critiques ?? []),
        ...(userCritiques ?? []).map((c) => ({
          ...c,
          criticism: `[USER FEEDBACK] ${c.criticism}`,
        })),
      ];

      const response = await fetch('/api/protocol/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            personal_info: {
              age: 30,
              weight_lbs: 180,
              height_in: 70,
              sex: 'male',
              genetic_background: 'Mixed',
              health_conditions: [],
              fitness_level: 'intermediate',
              dietary_restrictions: [],
            },
            goals: [
              { name: 'General Health', weight: 1.0, description: 'Improve overall health' },
            ],
            requirements: [],
            iterations: 3,
          },
          currentProtocol,
          critiques: allCritiques,
          iteration,
          isPureIteration,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to optimize');
      }

      router.push(`/protocols/${data.id}`);
      router.refresh();
    } catch (error) {
      console.error('Optimization error:', error);
      alert('Failed to optimize protocol. Please try again.');
    } finally {
      setLoading(false);
      setFeedbackOpen(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button onClick={() => runOptimize()} disabled={loading} variant="outline">
          {loading && !feedbackOpen ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Optimizing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Quick Optimize
            </>
          )}
        </Button>
        <Button onClick={() => setFeedbackOpen(true)} disabled={loading}>
          <MessageSquarePlus className="h-4 w-4 mr-2" />
          Add Feedback
        </Button>
      </div>

      <FeedbackModal
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        onSubmit={runOptimize}
        loading={loading}
      />
    </>
  );
}
