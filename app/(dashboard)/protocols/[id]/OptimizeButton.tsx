'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import type { DailyProtocol, Critique } from '@/lib/schemas/protocol';

interface OptimizeButtonProps {
  protocolId: string;
  currentProtocol: DailyProtocol;
  critiques: Critique[];
  iteration: number;
}

export function OptimizeButton({
  protocolId,
  currentProtocol,
  critiques,
  iteration,
}: OptimizeButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleOptimize = async () => {
    setLoading(true);

    try {
      // We need to get the config from somewhere - for now we'll skip this
      // In a real implementation, you'd store the config with the protocol
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
          critiques,
          iteration,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to optimize');
      }

      // Redirect to new protocol
      router.push(`/protocols/${data.id}`);
      router.refresh();
    } catch (error) {
      console.error('Optimization error:', error);
      alert('Failed to optimize protocol. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (critiques.length === 0) {
    return null;
  }

  return (
    <Button onClick={handleOptimize} disabled={loading}>
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Optimizing...
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4 mr-2" />
          Optimize Protocol
        </>
      )}
    </Button>
  );
}
