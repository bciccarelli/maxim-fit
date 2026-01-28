'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ProtocolDisplay } from '@/components/protocol/ProtocolDisplay';
import { ProtocolActions } from '@/components/protocol/ProtocolActions';
import { VersionHistory } from '@/components/protocol/VersionHistory';
import { EditableProtocolName } from '@/components/protocol/EditableProtocolName';
import { EvaluationSummary } from '@/components/protocol/EvaluationSummary';
import { CritiquesSection } from '@/components/protocol/CritiquesSection';
import { Trash2, Loader2, History } from 'lucide-react';
import type { DailyProtocol, AdherenceScore, GoalScore, Critique } from '@/lib/schemas/protocol';

interface ProtocolListItem {
  id: string;
  name: string | null;
  created_at: string;
  version: number | null;
  weighted_goal_score: number | null;
  viability_score: number | null;
}

interface SelectedProtocol {
  id: string;
  name: string | null;
  protocol_data: DailyProtocol;
  requirement_scores: AdherenceScore[] | null;
  goal_scores: GoalScore[] | null;
  critiques: Critique[] | null;
  requirements_met: boolean | null;
  weighted_goal_score: number | null;
  viability_score: number | null;
  version: number | null;
  version_chain_id: string | null;
  verified: boolean | null;
  change_source: string | null;
  created_at: string;
}

interface DashboardProtocolViewProps {
  protocols: ProtocolListItem[];
  selectedProtocol: SelectedProtocol;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatLabel(p: ProtocolListItem): string {
  const displayName = p.name || (p.version != null && p.version > 1 ? `v${p.version}` : 'Protocol');
  const date = formatDate(p.created_at);
  return `${displayName} \u2014 ${date}`;
}

export function DashboardProtocolView({
  protocols,
  selectedProtocol,
}: DashboardProtocolViewProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const options = protocols.map((p) => ({
    value: p.id,
    label: formatLabel(p),
  }));

  const isVerified = selectedProtocol.verified ?? false;
  const versionChainId = selectedProtocol.version_chain_id ?? selectedProtocol.id;

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch('/api/protocol/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedProtocol.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete protocol. Please try again.');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleVerify = async () => {
    try {
      const response = await fetch('/api/protocol/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ protocolId: selectedProtocol.id }),
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
          protocolId: selectedProtocol.id,
          protocolData: updatedProtocol,
          changeNote: 'Direct edit',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save edits');
      }

      router.push(`?protocol=${data.id}`);
      router.refresh();
    } catch (error) {
      console.error('Edit error:', error);
      alert('Failed to save changes. Please try again.');
    }
  };

  const handleModificationAccepted = (newId: string) => {
    router.push(`?protocol=${newId}`);
    router.refresh();
  };

  const handleRevert = async (versionId: string) => {
    const response = await fetch('/api/protocol/revert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ protocolId: selectedProtocol.id, targetVersionId: versionId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to revert');
    }

    router.push(`?protocol=${data.id}`);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Row 1: Name + Evaluation + Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <EditableProtocolName
            protocolId={selectedProtocol.id}
            name={selectedProtocol.name}
          />
          <EvaluationSummary
            requirementsMet={selectedProtocol.requirements_met ?? undefined}
            goalScore={selectedProtocol.weighted_goal_score ?? undefined}
            viabilityScore={selectedProtocol.viability_score ?? undefined}
            verified={isVerified}
          />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ProtocolActions
            protocolId={selectedProtocol.id}
            protocol={selectedProtocol.protocol_data}
            verified={isVerified}
            versionChainId={versionChainId}
            onVerify={handleVerify}
            onModificationAccepted={handleModificationAccepted}
          />
          <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
            <History className="h-4 w-4 mr-2" />
            History
          </Button>
        </div>
      </div>

      {/* Row 2: Version selector + Delete */}
      <div className="flex items-center gap-2 max-w-md">
        <Select
          options={options}
          value={selectedProtocol.id}
          onChange={(e) => {
            setConfirmDelete(false);
            router.push(`?protocol=${e.target.value}`, { scroll: false });
          }}
          className="font-mono text-sm"
        />
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={deleting}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              aria-label="Confirm delete"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-muted-foreground"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            className="text-muted-foreground hover:text-destructive"
            aria-label="Delete protocol"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <ProtocolDisplay
        protocol={selectedProtocol.protocol_data}
        protocolId={selectedProtocol.id}
        editable
        verified={isVerified}
        onProtocolChange={handleProtocolChange}
        onVerify={handleVerify}
      />

      {selectedProtocol.critiques && selectedProtocol.critiques.length > 0 && (
        <CritiquesSection
          critiques={selectedProtocol.critiques}
          protocolId={selectedProtocol.id}
          verified={isVerified}
        />
      )}

      <VersionHistory
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        versionChainId={versionChainId}
        currentVersionId={selectedProtocol.id}
        onRevert={handleRevert}
      />
    </div>
  );
}
