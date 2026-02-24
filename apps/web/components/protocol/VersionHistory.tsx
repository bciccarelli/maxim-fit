'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { X, RotateCcw, Shield, Loader2, AlertCircle } from 'lucide-react';
import type { ProtocolVersion } from '@/lib/schemas/protocol';

interface VersionHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versionChainId: string;
  currentVersionId: string;
  onRevert: (versionId: string) => Promise<void>;
}

const SOURCE_LABELS: Record<string, string> = {
  generated: 'Generated',
  imported: 'Imported',
  direct_edit: 'Edited',
  ai_modify: 'AI Modified',
  revert: 'Reverted',
  critique_apply: 'Applied',
};

export function VersionHistory({
  open,
  onOpenChange,
  versionChainId,
  currentVersionId,
  onRevert,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<ProtocolVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [confirmRevertId, setConfirmRevertId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open && versionChainId) {
      fetchVersions();
    }
  }, [open, versionChainId]);

  const fetchVersions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/protocol/versions?chainId=${versionChainId}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || 'Failed to load versions');
        return;
      }
      const data = await response.json();
      setVersions(data.versions ?? []);
    } catch {
      setError('Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  const handleRevert = async (versionId: string) => {
    if (confirmRevertId !== versionId) {
      setConfirmRevertId(versionId);
      return;
    }

    setRevertingId(versionId);
    try {
      await onRevert(versionId);
      onOpenChange(false);
    } catch {
      // Error handled by parent
    } finally {
      setRevertingId(null);
      setConfirmRevertId(null);
    }
  };

  if (!open || !mounted) return null;

  const drawer = (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l-2 border-l-primary bg-card shadow-lg overflow-y-auto">
        <div className="p-5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold tracking-tight">Version history</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {error && (
            <div className="border-l-2 border-l-destructive pl-4 py-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : versions.length === 0 && !error ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-sm text-muted-foreground">No version history found.</p>
              <p className="text-xs text-muted-foreground">This protocol may not have a version chain yet.</p>
            </div>
          ) : versions.length === 1 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center py-4">
                No changes yet. This is the original protocol.
              </p>
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="rounded-lg border p-4 bg-primary/5 border-primary/20"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold tabular-nums">
                        v{version.version}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                        {SOURCE_LABELS[version.change_source ?? ''] ?? version.change_source}
                      </span>
                      {version.verified && (
                        <Shield className="h-3.5 w-3.5 text-success" />
                      )}
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/15 text-primary">
                        Current
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-mono tabular-nums">
                        {new Date(version.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {version.weighted_goal_score != null && (
                        <span className="font-mono tabular-nums">
                          Goal {version.weighted_goal_score.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version) => {
                const isCurrent = version.id === currentVersionId;
                return (
                  <div
                    key={version.id}
                    className={`rounded-lg border p-4 ${
                      isCurrent
                        ? 'bg-primary/5 border-primary/20'
                        : 'bg-card'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold tabular-nums">
                            v{version.version}
                          </span>
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                            {SOURCE_LABELS[version.change_source ?? ''] ?? version.change_source}
                          </span>
                          {version.verified && (
                            <Shield className="h-3.5 w-3.5 text-success" />
                          )}
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/15 text-primary">
                              Current
                            </span>
                          )}
                        </div>
                        {version.change_note && (
                          <p className="text-xs text-muted-foreground">{version.change_note}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="font-mono tabular-nums">
                            {new Date(version.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {version.weighted_goal_score != null && (
                            <span className="font-mono tabular-nums">
                              Goal {version.weighted_goal_score.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                      {!isCurrent && (
                        <div className="flex items-center gap-1">
                          {confirmRevertId === version.id ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRevert(version.id)}
                                disabled={!!revertingId}
                                className="text-destructive hover:text-destructive text-xs"
                              >
                                {revertingId === version.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  'Confirm'
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmRevertId(null)}
                                className="text-xs text-muted-foreground"
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevert(version.id)}
                              className="text-xs"
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Revert
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(drawer, document.body);
}
