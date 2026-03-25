import { View, Text, StyleSheet, Pressable, ActivityIndicator, RefreshControl, ScrollView, Alert, TextInput, AppState } from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, Plus, Pencil, Trash2, Upload, History } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useProtocol, type ProtocolChain } from '@/contexts/ProtocolContext';
import type { DailyProtocol } from '@protocol/shared/schemas';
import { ProtocolTabs } from '@/components/protocol/ProtocolTabs';
import { CritiquesSection } from '@/components/protocol/CritiquesSection';
import { ModifySheet } from '@/components/protocol/ModifySheet';
import { GenerateProtocolModal } from '@/components/protocol/GenerateProtocolModal';
import { ImportProtocolSheet } from '@/components/protocol/ImportProtocolSheet';
import { VersionHistorySheet } from '@/components/protocol/VersionHistorySheet';
import { scheduleProtocolNotifications } from '@/lib/notifications/scheduler';
import { getNotificationPreferences } from '@/lib/storage/notificationPreferences';
import { useUserConfig } from '@/hooks/useUserConfig';
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, fontSize } from '@/lib/theme';

export default function ProtocolsScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { config: userConfig } = useUserConfig();

  // Use shared protocol context
  const {
    chains,
    setChains,
    selectedChain,
    selectChain,
    updateSelectedChain,
    selectedVersion,
    updateSelectedVersion,
    parsedProtocol: parsedData,
    isLoadingChains: isLoading,
    refreshChains,
    refreshVersions,
  } = useProtocol();

  // Local UI state
  const [showChainDropdown, setShowChainDropdown] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Name editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  // Modals
  const [showModifySheet, setShowModifySheet] = useState(false);
  const [modifyContext, setModifyContext] = useState<string | undefined>(undefined);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showImportSheet, setShowImportSheet] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Subscription context for Pro feature gating
  const { canAccess, showUpgradeModal } = useSubscriptionContext();

  // Delete state
  const [confirmDeleteChainId, setConfirmDeleteChainId] = useState<string | null>(null);
  const [deletingChainId, setDeletingChainId] = useState<string | null>(null);

  // Schedule notifications when protocol is loaded or app returns to foreground
  const lastScheduledRef = useRef<{ protocolId: string; timestamp: number } | null>(null);
  const RESCHEDULE_INTERVAL_MS = 6 * 60 * 60 * 1000; // Re-schedule every 6 hours

  const scheduleNotifications = useCallback(async () => {
    if (!parsedData || !selectedVersion) return;

    // Skip if same protocol version was scheduled recently (within 6 hours)
    const now = Date.now();
    if (
      lastScheduledRef.current &&
      lastScheduledRef.current.protocolId === selectedVersion.id &&
      now - lastScheduledRef.current.timestamp < RESCHEDULE_INTERVAL_MS
    ) {
      return;
    }

    try {
      const preferences = await getNotificationPreferences();
      if (preferences.enabled) {
        const result = await scheduleProtocolNotifications(
          parsedData,
          preferences,
          selectedVersion.id
        );
        if (result.permissionDenied) {
          console.warn('Notification permissions not granted — skipping scheduling');
        } else {
          console.log(`Scheduled ${result.scheduled}/${result.total} notifications for protocol`);
          lastScheduledRef.current = { protocolId: selectedVersion.id, timestamp: now };
        }
      }
    } catch (error) {
      console.error('Error scheduling notifications:', error);
    }
  }, [parsedData, selectedVersion]);

  // Schedule on protocol load
  useEffect(() => {
    scheduleNotifications();
  }, [scheduleNotifications]);

  // Re-schedule when app returns to foreground (keeps the rolling 3-day window filled)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        scheduleNotifications();
      }
    });
    return () => subscription.remove();
  }, [scheduleNotifications]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshChains();
    if (selectedChain) {
      await refreshVersions();
    }
    setIsRefreshing(false);
  }, [refreshChains, refreshVersions, selectedChain]);

  const handleChainSelect = (chain: ProtocolChain) => {
    selectChain(chain);
    setShowChainDropdown(false);
  };

  const handleModifyAccepted = useCallback(async (newProtocolId: string) => {
    // Refresh to get the new version
    await refreshVersions();
  }, [refreshVersions]);

  const handleProtocolChange = useCallback(async (updatedProtocol: DailyProtocol) => {
    if (!selectedVersion) return;
    try {
      await fetchApi<{ id: string }>('/api/protocol/edit', {
        method: 'POST',
        body: JSON.stringify({
          protocolId: selectedVersion.id,
          protocolData: updatedProtocol,
          changeNote: 'Direct edit (mobile)',
        }),
      });
      // Refresh versions to get the new version
      await refreshVersions();
    } catch (error) {
      Alert.alert('Error', 'Failed to save changes. Please try again.');
      throw error;
    }
  }, [selectedVersion, refreshVersions]);

  const handleStartEditName = () => {
    setEditedName(selectedChain?.name || '');
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!selectedVersion || !editedName.trim()) {
      setIsEditingName(false);
      return;
    }

    try {
      await fetchApi('/api/protocol/name', {
        method: 'POST',
        body: JSON.stringify({
          protocolId: selectedVersion.id,
          name: editedName.trim(),
        }),
      });
      // Update local state via context
      if (selectedChain) {
        updateSelectedChain({ name: editedName.trim() });
        setChains(prev => prev.map(c =>
          c.version_chain_id === selectedChain.version_chain_id
            ? { ...c, name: editedName.trim() }
            : c
        ));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update name.');
    }
    setIsEditingName(false);
  };

  const handleNewProtocol = () => {
    setShowGenerateModal(true);
  };

  const handleDeleteChain = async (chainId: string) => {
    // Find any protocol in this chain to get its ID for deletion
    const chainProtocol = chains.find((c) => c.version_chain_id === chainId);
    if (!chainProtocol) return;

    if (confirmDeleteChainId !== chainId) {
      setConfirmDeleteChainId(chainId);
      return;
    }

    setDeletingChainId(chainId);
    try {
      await fetchApi('/api/protocol/delete', {
        method: 'POST',
        body: JSON.stringify({ id: chainProtocol.id }),
      });

      // Close dropdown and reset state
      setShowChainDropdown(false);
      setConfirmDeleteChainId(null);

      // Refresh chains - context will handle selection if current was deleted
      await refreshChains();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete protocol. Please try again.');
    } finally {
      setDeletingChainId(null);
    }
  };

  const handleGenerateComplete = useCallback(async (protocolId: string) => {
    // Refresh protocols to show the new one
    await refreshChains();
  }, [refreshChains]);

  const handleImportComplete = useCallback(async (protocolId: string) => {
    // Refresh protocols to show the new one
    await refreshChains();
  }, [refreshChains]);

  const handleImportPress = useCallback(() => {
    if (!canAccess('import')) {
      showUpgradeModal('Import Protocol');
      return;
    }
    setShowChainDropdown(false);
    setShowImportSheet(true);
  }, [canAccess, showUpgradeModal]);

  const handleVersionRevert = useCallback(async (newProtocolId: string) => {
    // Refresh both chains (to update current version ID) and versions
    await refreshChains();
    await refreshVersions();
  }, [refreshChains, refreshVersions]);

  const openModifyWithContext = (context?: string) => {
    setModifyContext(context);
    setShowModifySheet(true);
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primaryContainer} />
      </View>
    );
  }

  if (chains.length === 0) {
    return (
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={styles.emptyContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primaryContainer} />
        }
      >
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No protocols yet</Text>
          <Text style={styles.emptyText}>
            Create your personalized health protocol to get started.
          </Text>
          <Pressable
            onPress={() => setShowGenerateModal(true)}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryContainer]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.generateButton}
            >
              <Text style={styles.generateButtonText}>Generate Protocol</Text>
            </LinearGradient>
          </Pressable>
        </View>
        <GenerateProtocolModal
          visible={showGenerateModal}
          onClose={() => setShowGenerateModal(false)}
          onComplete={handleGenerateComplete}
          initialConfig={userConfig ? {
            personal_info: userConfig.personal_info,
            goals: userConfig.goals,
            requirements: userConfig.requirements,
          } : undefined}
        />
      </ScrollView>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header with Name and Dropdown */}
      <View style={styles.headerContainer}>
        {/* Editable Name */}
        <View style={styles.nameContainer}>
          {isEditingName ? (
            <TextInput
              style={styles.nameInput}
              value={editedName}
              onChangeText={setEditedName}
              onBlur={handleSaveName}
              onSubmitEditing={handleSaveName}
              autoFocus
              selectTextOnFocus
              maxLength={100}
            />
          ) : (
            <Pressable style={styles.nameRow} onPress={handleStartEditName}>
              <Text style={styles.protocolName} numberOfLines={1}>
                {selectedChain?.name || 'Untitled Protocol'}
              </Text>
              <Pencil size={14} color={colors.onSurfaceVariant} />
            </Pressable>
          )}
        </View>

        {/* Score + History */}
        {selectedVersion?.weighted_goal_score != null && (
          <View style={styles.scoreChip}>
            <Text style={styles.scoreChipValue}>
              {selectedVersion.weighted_goal_score.toFixed(1)}
            </Text>
            <Text style={styles.scoreChipLabel}>goal</Text>
          </View>
        )}
        <Pressable
          style={styles.iconButton}
          onPress={() => setShowVersionHistory(true)}
        >
          <History size={18} color={colors.onSurfaceVariant} />
        </Pressable>

        {/* Protocol Dropdown Button */}
        <View style={[styles.dropdownButtonWrapper, { zIndex: 20 }]}>
          <Pressable
            style={styles.dropdownButton}
            onPress={() => setShowChainDropdown(!showChainDropdown)}
          >
            <ChevronDown size={20} color={colors.onSurfaceVariant} />
          </Pressable>

          {showChainDropdown && (
            <View style={styles.dropdownMenu}>
              <Pressable
                style={styles.dropdownItem}
                onPress={() => {
                  setShowChainDropdown(false);
                  handleNewProtocol();
                }}
              >
                <Plus size={16} color={colors.primaryContainer} />
                <Text style={[styles.dropdownItemText, styles.newProtocolText]}>
                  New Protocol
                </Text>
              </Pressable>
              <Pressable
                style={styles.dropdownItem}
                onPress={handleImportPress}
              >
                <Upload size={16} color={colors.primaryContainer} />
                <Text style={[styles.dropdownItemText, styles.newProtocolText]}>
                  Import Protocol
                </Text>
              </Pressable>
              <View style={styles.dropdownDivider} />
              {chains.map((chain) => {
                const isDeleting = deletingChainId === chain.version_chain_id;
                const isConfirming = confirmDeleteChainId === chain.version_chain_id;

                return (
                  <View
                    key={chain.id}
                    style={[
                      styles.dropdownItem,
                      chain.id === selectedChain?.id && styles.dropdownItemSelected,
                    ]}
                  >
                    <Pressable
                      style={styles.dropdownItemContent}
                      onPress={() => handleChainSelect(chain)}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          chain.id === selectedChain?.id && styles.dropdownItemTextSelected,
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {chain.name || 'Untitled Protocol'}
                      </Text>
                    </Pressable>

                    {isConfirming && !isDeleting ? (
                      <View style={styles.deleteConfirmRow}>
                        <Pressable
                          style={styles.deleteConfirmButton}
                          onPress={() => handleDeleteChain(chain.version_chain_id)}
                        >
                          <Trash2 size={14} color={colors.destructive} />
                        </Pressable>
                        <Pressable
                          onPress={() => setConfirmDeleteChainId(null)}
                        >
                          <Text style={styles.deleteCancelText}>Cancel</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        style={styles.deleteButton}
                        onPress={() => handleDeleteChain(chain.version_chain_id)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <ActivityIndicator size="small" color={colors.onSurfaceVariant} />
                        ) : (
                          <Trash2 size={14} color={colors.onSurfaceVariant} />
                        )}
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>

      {/* Protocol Content */}
      {parsedData && selectedVersion ? (
        <ProtocolTabs
          protocol={parsedData}
          editable={true}
          onProtocolChange={handleProtocolChange}
          protocolId={selectedVersion.id}
          critiques={selectedVersion.critiques}
          verified={selectedVersion.verified}
          onCritiquesUpdated={(critiques) => {
            updateSelectedVersion({ critiques });
          }}
          onProtocolUpdated={refreshVersions}
        />
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primaryContainer} />
        </View>
      )}

      {/* Modals */}
      {selectedVersion && (
        <ModifySheet
          visible={showModifySheet}
          onClose={() => {
            setShowModifySheet(false);
            setModifyContext(undefined);
          }}
          protocolId={selectedVersion.id}
          currentScores={{
            weighted_goal_score: selectedVersion.weighted_goal_score,
            viability_score: selectedVersion.viability_score,
          }}
          onAccepted={handleModifyAccepted}
          initialMessage={modifyContext}
          currentProtocol={parsedData ?? undefined}
        />
      )}
      <GenerateProtocolModal
        visible={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onComplete={handleGenerateComplete}
        initialConfig={userConfig ? {
          personal_info: userConfig.personal_info,
          goals: userConfig.goals,
          requirements: userConfig.requirements,
        } : undefined}
      />
      <ImportProtocolSheet
        visible={showImportSheet}
        onClose={() => setShowImportSheet(false)}
        onComplete={handleImportComplete}
      />
      {selectedChain && selectedVersion && (
        <VersionHistorySheet
          visible={showVersionHistory}
          onClose={() => setShowVersionHistory(false)}
          versionChainId={selectedChain.version_chain_id}
          currentVersionId={selectedVersion.id}
          onRevert={handleVersionRevert}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  emptyState: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  generateButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md / 2 + spacing.sm / 2,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  generateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.surfaceContainerLowest,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md / 2 + spacing.sm / 2,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  nameContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  protocolName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.onSurface,
    flexShrink: 1,
  },
  nameInput: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.onSurface,
    padding: 0,
    margin: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.primaryContainer,
  },
  dropdownButtonWrapper: {
    position: 'relative',
  },
  dropdownButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    minWidth: 220,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  dropdownDivider: {
    height: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md / 2 + spacing.sm / 2,
    paddingVertical: spacing.md / 2 + spacing.sm / 2,
    gap: spacing.sm,
  },
  dropdownItemSelected: {
    backgroundColor: colors.selectedBg,
  },
  dropdownItemText: {
    fontSize: fontSize.sm,
    color: colors.onSurface,
    flex: 1,
  },
  dropdownItemTextSelected: {
    color: colors.primaryContainer,
    fontWeight: '500',
  },
  newProtocolText: {
    color: colors.primaryContainer,
    fontWeight: '500',
  },
  dropdownItemContent: {
    flex: 1,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  deleteConfirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deleteConfirmButton: {
    padding: spacing.xs,
  },
  deleteCancelText: {
    fontSize: fontSize.xs,
    color: colors.onSurfaceVariant,
  },
  scoreChip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: 2,
  },
  scoreChipValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurface,
    fontVariant: ['tabular-nums'],
  },
  scoreChipLabel: {
    fontSize: 9,
    color: colors.onSurfaceVariant,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
