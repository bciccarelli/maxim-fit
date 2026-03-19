import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { X, RotateCcw, ShieldCheck, AlertCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/lib/theme';
import { fetchApi } from '@/lib/api';
import type { ProtocolVersion } from '@/contexts/ProtocolContext';

interface VersionHistorySheetProps {
  visible: boolean;
  onClose: () => void;
  versionChainId: string;
  currentVersionId: string;
  onRevert: (protocolId: string) => Promise<void>;
}

const SOURCE_LABELS: Record<string, string> = {
  generated: 'Generated',
  imported: 'Imported',
  direct_edit: 'Edited',
  ai_modify: 'AI Modified',
  revert: 'Reverted',
  critique_apply: 'Applied',
};

export function VersionHistorySheet({
  visible,
  onClose,
  versionChainId,
  currentVersionId,
  onRevert,
}: VersionHistorySheetProps) {
  const [versions, setVersions] = useState<ProtocolVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [confirmRevertId, setConfirmRevertId] = useState<string | null>(null);

  useEffect(() => {
    if (visible && versionChainId) {
      fetchVersions();
    }
  }, [visible, versionChainId]);

  const fetchVersions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi<{ versions: ProtocolVersion[] }>(
        `/api/protocol/versions?chainId=${versionChainId}`
      );
      setVersions(data.versions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  const handleRevert = useCallback(
    async (versionId: string) => {
      if (confirmRevertId !== versionId) {
        setConfirmRevertId(versionId);
        return;
      }

      setRevertingId(versionId);
      try {
        const result = await fetchApi<{ id: string }>('/api/protocol/revert', {
          method: 'POST',
          body: JSON.stringify({ targetVersionId: versionId }),
        });
        await onRevert(result.id);
        handleClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to revert');
      } finally {
        setRevertingId(null);
        setConfirmRevertId(null);
      }
    },
    [confirmRevertId, onRevert]
  );

  const handleClose = useCallback(() => {
    setVersions([]);
    setError(null);
    setConfirmRevertId(null);
    onClose();
  }, [onClose]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <X size={24} color={colors.onSurfaceVariant} />
          </Pressable>
          <Text style={styles.title}>Version History</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {error && (
            <View style={styles.errorCard}>
              <AlertCircle size={18} color={colors.destructive} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primaryContainer} />
            </View>
          ) : versions.length === 0 && !error ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No version history found.</Text>
              <Text style={styles.emptySubtext}>
                This protocol may not have a version chain yet.
              </Text>
            </View>
          ) : versions.length === 1 ? (
            <View style={styles.singleVersionContainer}>
              <Text style={styles.singleVersionText}>
                No changes yet. This is the original protocol.
              </Text>
              {versions.map((version) => (
                <View key={version.id} style={[styles.versionCard, styles.versionCardCurrent]}>
                  <VersionItem
                    version={version}
                    isCurrent={true}
                    onRevert={() => {}}
                    confirmRevertId={null}
                    revertingId={null}
                    onCancelConfirm={() => {}}
                    formatDate={formatDate}
                  />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.versionList}>
              {versions.map((version) => {
                const isCurrent = version.id === currentVersionId;
                return (
                  <View
                    key={version.id}
                    style={[
                      styles.versionCard,
                      isCurrent && styles.versionCardCurrent,
                    ]}
                  >
                    <VersionItem
                      version={version}
                      isCurrent={isCurrent}
                      onRevert={handleRevert}
                      confirmRevertId={confirmRevertId}
                      revertingId={revertingId}
                      onCancelConfirm={() => setConfirmRevertId(null)}
                      formatDate={formatDate}
                    />
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

interface VersionItemProps {
  version: ProtocolVersion;
  isCurrent: boolean;
  onRevert: (versionId: string) => void;
  confirmRevertId: string | null;
  revertingId: string | null;
  onCancelConfirm: () => void;
  formatDate: (date: string) => string;
}

function VersionItem({
  version,
  isCurrent,
  onRevert,
  confirmRevertId,
  revertingId,
  onCancelConfirm,
  formatDate,
}: VersionItemProps) {
  const isConfirming = confirmRevertId === version.id;
  const isReverting = revertingId === version.id;

  return (
    <View style={styles.versionContent}>
      <View style={styles.versionHeader}>
        <Text style={styles.versionNumber}>v{version.version}</Text>
        <View style={styles.versionBadge}>
          <Text style={styles.versionBadgeText}>
            {SOURCE_LABELS[version.change_source ?? ''] ?? version.change_source}
          </Text>
        </View>
        {version.verified && (
          <ShieldCheck size={14} color={colors.primaryContainer} />
        )}
        {isCurrent && (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>Current</Text>
          </View>
        )}
      </View>

      {version.change_note && (
        <Text style={styles.changeNote}>{version.change_note}</Text>
      )}

      <View style={styles.versionMeta}>
        <Text style={styles.metaText}>{formatDate(version.created_at)}</Text>
        {version.weighted_goal_score != null && (
          <Text style={styles.metaText}>
            Goal {version.weighted_goal_score.toFixed(1)}
          </Text>
        )}
        {version.viability_score != null && (
          <Text style={styles.metaText}>
            Viability {version.viability_score.toFixed(1)}
          </Text>
        )}
      </View>

      {!isCurrent && (
        <View style={styles.revertActions}>
          {isConfirming ? (
            <>
              <Pressable
                style={[styles.confirmButton, isReverting && styles.buttonDisabled]}
                onPress={() => onRevert(version.id)}
                disabled={isReverting}
              >
                {isReverting ? (
                  <ActivityIndicator size="small" color={colors.destructive} />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirm Revert</Text>
                )}
              </Pressable>
              <Pressable style={styles.cancelButton} onPress={onCancelConfirm}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={() => onRevert(version.id)}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryContainer]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.revertButton}
              >
                <RotateCcw size={14} color={colors.onPrimary} />
                <Text style={styles.revertButtonText}>Revert</Text>
              </LinearGradient>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.surfaceContainerLowest,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.onSurface,
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorContainer,
    borderLeftWidth: 3,
    borderLeftColor: colors.destructive,
    borderRadius: 0,
    padding: 12,
    gap: 10,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: colors.destructive,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  singleVersionContainer: {
    gap: 16,
  },
  singleVersionText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 8,
  },
  versionList: {
    gap: 12,
  },
  versionCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 0,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  versionCardCurrent: {
    backgroundColor: colors.selectedBg,
    borderColor: colors.primaryFixedDim,
  },
  versionContent: {
    gap: 8,
  },
  versionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  versionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurface,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  versionBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 0,
  },
  versionBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  currentBadge: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 0,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.onPrimary,
  },
  changeNote: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  versionMeta: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  revertActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  revertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 0,
  },
  revertButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.onPrimary,
  },
  confirmButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 0,
    backgroundColor: colors.errorContainer,
    minWidth: 100,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.destructive,
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 0,
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
