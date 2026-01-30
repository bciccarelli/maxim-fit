'use client';

import { useState, useEffect, useCallback } from 'react';
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
import type { Tier } from '@/lib/stripe/config';

interface ProtocolListItem {
  id: string;
  name: string | null;
  created_at: string;
  version: number | null;
  version_chain_id: string;
  weighted_goal_score: number | null;
  viability_score: number | null;
}

interface ProtocolVersion {
  id: string;
  name: string | null;
  version: number;
  version_chain_id: string;
  is_current: boolean;
  change_note: string | null;
  change_source: string | null;
  verified: boolean;
  verified_at: string | null;
  weighted_goal_score: number | null;
  viability_score: number | null;
  created_at: string;
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
  tier?: Tier;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const changeSourceLabels: Record<string, string> = {
  generated: 'Generated',
  imported: 'Imported',
  direct_edit: 'Edited',
  ai_modify: 'AI Modified',
  critique_apply: 'Critique Applied',
  revert: 'Reverted',
};

function getVersionLabel(version: ProtocolVersion): string {
  const source = version.change_source
    ? changeSourceLabels[version.change_source] || version.change_source
    : '';
  return `v${version.version}${source ? ` – ${source}` : ''}`;
}

export function DashboardProtocolView({
  protocols,
  selectedProtocol,
  tier = 'free',
}: DashboardProtocolViewProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Version dropdown state
  const [versions, setVersions] = useState<ProtocolVersion[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);

  const isVerified = selectedProtocol.verified ?? false;
  const versionChainId = selectedProtocol.version_chain_id ?? selectedProtocol.id;

  // Find current protocol chain from the list
  const currentChain = protocols.find(
    (p) => p.version_chain_id === versionChainId
  );

  // Protocol dropdown options (unique chains)
  const protocolOptions = protocols.map((p) => ({
    value: p.version_chain_id,
    label: p.name || 'Untitled Protocol',
  }));

  // Version dropdown options
  const versionOptions = versions.map((v) => ({
    value: v.id,
    label: getVersionLabel(v),
  }));

  // Fetch versions when chain changes
  const fetchVersions = useCallback(async (chainId: string) => {
    setIsLoadingVersions(true);
    try {
      const response = await fetch(`/api/protocol/versions?chainId=${chainId}`);
      if (response.ok) {
        const data = await response.json();
        setVersions(data.versions || []);
      }
    } catch (error) {
      console.error('Error fetching versions:', error);
    } finally {
      setIsLoadingVersions(false);
    }
  }, []);

  // Fetch versions on mount and when chain changes
  useEffect(() => {
    if (versionChainId) {
      fetchVersions(versionChainId);
    }
  }, [versionChainId, fetchVersions]);

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
            tier={tier}
          />
          <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
            <History className="h-4 w-4 mr-2" />
            History
          </Button>
        </div>
      </div>

      {/* Row 2: Protocol + Version selectors + Delete */}
      <div className="flex items-end gap-3">
        {/* Protocol Selector */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Protocol
          </label>
          <Select
            options={protocolOptions}
            value={versionChainId}
            onChange={(e) => {
              setConfirmDelete(false);
              // Find the current version for this chain and navigate to it
              const chain = protocols.find((p) => p.version_chain_id === e.target.value);
              if (chain) {
                router.push(`?protocol=${chain.id}`, { scroll: false });
              }
            }}
            className="min-w-[200px]"
          />
        </div>

        {/* Version Selector */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Version
          </label>
          {isLoadingVersions ? (
            <div className="h-10 min-w-[140px] flex items-center justify-center rounded-md border border-input bg-background">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Select
              options={versionOptions}
              value={selectedProtocol.id}
              onChange={(e) => {
                setConfirmDelete(false);
                router.push(`?protocol=${e.target.value}`, { scroll: false });
              }}
              className="min-w-[140px] font-mono text-sm"
            />
          )}
        </div>

        {/* Delete Button */}
        <div className="flex items-center h-10">
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
