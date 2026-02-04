'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtocolDisplay } from '@/components/protocol/ProtocolDisplay';
import { ProtocolActions } from '@/components/protocol/ProtocolActions';
import { VersionHistory } from '@/components/protocol/VersionHistory';
import { EvaluationSummary } from '@/components/protocol/EvaluationSummary';
import { CritiquesSection } from '@/components/protocol/CritiquesSection';
import { CitationsSection } from '@/components/protocol/CitationsSection';
import { Button } from '@/components/ui/button';
import { History } from 'lucide-react';
import type { DailyProtocol, AdherenceScore, GoalScore, Critique, Citation } from '@/lib/schemas/protocol';
import type { Tier } from '@/lib/stripe/config';

interface ProtocolData {
  id: string;
  name: string | null;
  protocol_data: DailyProtocol;
  requirement_scores: AdherenceScore[] | null;
  goal_scores: GoalScore[] | null;
  critiques: Critique[] | null;
  citations: Citation[] | null;
  requirements_met: boolean | null;
  weighted_goal_score: number | null;
  viability_score: number | null;
  version: number | null;
  version_chain_id: string | null;
  verified: boolean | null;
  change_source: string | null;
  created_at: string;
}

interface ProtocolDetailClientProps {
  protocol: ProtocolData;
  tier?: Tier;
}

export function ProtocolDetailClient({ protocol, tier = 'free' }: ProtocolDetailClientProps) {
  const router = useRouter();
  const [historyOpen, setHistoryOpen] = useState(false);

  const isVerified = protocol.verified ?? false;
  const versionChainId = protocol.version_chain_id ?? protocol.id;

  const handleVerify = async () => {
    try {
      const response = await fetch('/api/protocol/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ protocolId: protocol.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to verify');
      }

      router.refresh();
    } catch (error) {
      console.error('Verify error:', error);
      alert('Failed to verify protocol. Please try again.');
    }
  };

  const handleProtocolChange = async (updatedProtocol: DailyProtocol) => {
    try {
      const response = await fetch('/api/protocol/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocolId: protocol.id,
          protocolData: updatedProtocol,
          changeNote: 'Direct edit',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save edits');
      }

      router.push(`/protocols/${data.id}`);
      router.refresh();
    } catch (error) {
      console.error('Edit error:', error);
      alert('Failed to save changes. Please try again.');
    }
  };

  const handleModificationAccepted = (newId: string) => {
    router.push(`/protocols/${newId}`);
    router.refresh();
  };

  const handleRevert = async (versionId: string) => {
    const response = await fetch('/api/protocol/revert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ protocolId: protocol.id, targetVersionId: versionId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to revert');
    }

    router.push(`/protocols/${data.id}`);
    router.refresh();
  };

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <EvaluationSummary
          requirementsMet={protocol.requirements_met ?? undefined}
          goalScore={protocol.weighted_goal_score ?? undefined}
          viabilityScore={protocol.viability_score ?? undefined}
          verified={isVerified}
        />
        <div className="flex items-center gap-2">
          <ProtocolActions
            protocolId={protocol.id}
            protocol={protocol.protocol_data}
            verified={isVerified}
            versionChainId={versionChainId}
            onVerify={handleVerify}
            onModificationAccepted={handleModificationAccepted}
            tier={tier}
          />
          <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
            <History className="h-4 w-4 mr-2" />
            History
          </Button>
        </div>
      </div>

      <ProtocolDisplay
        protocol={protocol.protocol_data}
        protocolId={protocol.id}
        editable
        verified={isVerified}
        onProtocolChange={handleProtocolChange}
        onVerify={handleVerify}
        onMealsGenerated={handleModificationAccepted}
      />

      {protocol.critiques && protocol.critiques.length > 0 && (
        <CritiquesSection
          critiques={protocol.critiques}
          protocolId={protocol.id}
          verified={isVerified}
        />
      )}

      {protocol.citations && protocol.citations.length > 0 && (
        <CitationsSection citations={protocol.citations} />
      )}

      <VersionHistory
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        versionChainId={versionChainId}
        currentVersionId={protocol.id}
        onRevert={handleRevert}
      />
    </>
  );
}
