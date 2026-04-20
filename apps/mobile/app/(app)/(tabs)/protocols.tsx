import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Alert,
  TextInput,
  AppState,
} from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, Plus, Pencil, Trash2, Upload, History } from 'lucide-react-native';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useProtocol, type ProtocolChain } from '@/contexts/ProtocolContext';
import type { DailyProtocol } from '@protocol/shared/schemas';
import { ProtocolTabs } from '@/components/protocol/ProtocolTabs';
import { GenerateProtocolModal } from '@/components/protocol/GenerateProtocolModal';
import { ImportProtocolSheet } from '@/components/protocol/ImportProtocolSheet';
import { VersionHistorySheet } from '@/components/protocol/VersionHistorySheet';
import { scheduleProtocolNotifications } from '@/lib/notifications/scheduler';
import { getNotificationPreferences } from '@/lib/storage/notificationPreferences';
import { useUserConfig } from '@/hooks/useUserConfig';
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';
import { mf, fonts } from '@/lib/theme';
import { trackedSm } from '@/lib/mfStyles';
import { MFHeader, ScoreTile, MFButton } from '@/components/mf';

export default function ProtocolsScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { config: userConfig } = useUserConfig();

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

  const [showChainDropdown, setShowChainDropdown] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showImportSheet, setShowImportSheet] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  const { canAccess, showUpgradeModal } = useSubscriptionContext();

  const [confirmDeleteChainId, setConfirmDeleteChainId] = useState<string | null>(null);
  const [deletingChainId, setDeletingChainId] = useState<string | null>(null);

  // Schedule notifications when protocol loads / app returns to foreground
  const lastScheduledRef = useRef<{ protocolId: string; timestamp: number } | null>(null);
  const RESCHEDULE_INTERVAL_MS = 6 * 60 * 60 * 1000;

  const scheduleNotifications = useCallback(async () => {
    if (!parsedData || !selectedVersion) return;
    const now = Date.now();
    if (
      lastScheduledRef.current &&
      lastScheduledRef.current.protocolId === selectedVersion.id &&
      now - lastScheduledRef.current.timestamp < RESCHEDULE_INTERVAL_MS
    ) {
      return;
    }
    lastScheduledRef.current = { protocolId: selectedVersion.id, timestamp: now };
    try {
      const preferences = await getNotificationPreferences();
      if (preferences.enabled) {
        const result = await scheduleProtocolNotifications(parsedData, preferences, selectedVersion.id);
        if (result.permissionDenied) {
          lastScheduledRef.current = null;
        }
      }
    } catch {
      lastScheduledRef.current = null;
    }
  }, [parsedData, selectedVersion]);

  useEffect(() => {
    scheduleNotifications();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') scheduleNotifications();
    });
    return () => sub.remove();
  }, [scheduleNotifications]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshChains();
    if (selectedChain) await refreshVersions();
    setIsRefreshing(false);
  }, [refreshChains, refreshVersions, selectedChain]);

  const handleChainSelect = (chain: ProtocolChain) => {
    selectChain(chain);
    setShowChainDropdown(false);
  };

  const handleProtocolChange = useCallback(
    async (updatedProtocol: DailyProtocol) => {
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
        await refreshVersions();
      } catch (error) {
        Alert.alert('Error', 'Failed to save changes. Please try again.');
        throw error;
      }
    },
    [selectedVersion, refreshVersions],
  );

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
        body: JSON.stringify({ protocolId: selectedVersion.id, name: editedName.trim() }),
      });
      if (selectedChain) {
        updateSelectedChain({ name: editedName.trim() });
        setChains((prev) =>
          prev.map((c) =>
            c.version_chain_id === selectedChain.version_chain_id ? { ...c, name: editedName.trim() } : c,
          ),
        );
      }
    } catch {
      Alert.alert('Error', 'Failed to update name.');
    }
    setIsEditingName(false);
  };

  const handleDeleteChain = async (chainId: string) => {
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
      setShowChainDropdown(false);
      setConfirmDeleteChainId(null);
      await refreshChains();
    } catch {
      Alert.alert('Error', 'Failed to delete protocol.');
    } finally {
      setDeletingChainId(null);
    }
  };

  const handleGenerateComplete = useCallback(async () => {
    await refreshChains();
  }, [refreshChains]);

  const handleImportComplete = useCallback(async () => {
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

  const handleVersionRevert = useCallback(async () => {
    await refreshChains();
    await refreshVersions();
  }, [refreshChains, refreshVersions]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={mf.accent} />
      </View>
    );
  }

  if (chains.length === 0) {
    return (
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={styles.emptyContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={mf.accent} />}
      >
        <View style={styles.emptyState}>
          <Text style={[trackedSm(mf.fg3), { marginBottom: 8 }]}>MAXIM · FIT</Text>
          <Text style={styles.emptyTitle}>No protocol yet</Text>
          <Text style={styles.emptyText}>
            Create your personalized, evidence-based daily protocol to get started.
          </Text>
          <MFButton label="Generate Protocol" onPress={() => setShowGenerateModal(true)} />
        </View>
        <GenerateProtocolModal
          visible={showGenerateModal}
          onClose={() => setShowGenerateModal(false)}
          onComplete={handleGenerateComplete}
          initialConfig={
            userConfig
              ? {
                  personal_info: userConfig.personal_info,
                  goals: userConfig.goals,
                  requirements: userConfig.requirements,
                }
              : undefined
          }
        />
      </ScrollView>
    );
  }

  const goalScore = selectedVersion?.weighted_goal_score ?? null;
  const version = selectedVersion?.version ?? 1;
  const createdAt = selectedVersion?.created_at
    ? new Date(selectedVersion.created_at)
        .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        .toUpperCase()
    : '';
  const subLine = [`V${version}`, createdAt].filter(Boolean).join(' · ');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <MFHeader
        title={selectedChain?.name || 'Untitled Protocol'}
        titleRight={
          isEditingName ? null : (
            <Pressable hitSlop={6} onPress={handleStartEditName}>
              <Pencil size={12} color={mf.fg3} />
            </Pressable>
          )
        }
        sub={subLine}
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {goalScore != null && (
              <ScoreTile
                value={goalScore.toFixed(1)}
                label="GOAL"
                size="sm"
                tone="good"
                style={{ paddingVertical: 4, paddingHorizontal: 8 }}
              />
            )}
            <View style={{ position: 'relative' }}>
              <Pressable
                onPress={() => setShowChainDropdown((v) => !v)}
                style={styles.dropdownButton}
              >
                <ChevronDown size={16} color={mf.fg2} />
              </Pressable>
              {showChainDropdown && (
                <View style={styles.dropdownMenu}>
                  <Pressable
                    style={styles.dropdownItem}
                    onPress={() => {
                      setShowChainDropdown(false);
                      setShowGenerateModal(true);
                    }}
                  >
                    <Plus size={14} color={mf.accent} />
                    <Text style={styles.dropdownActionText}>GENERATE NEW</Text>
                  </Pressable>
                  <Pressable style={styles.dropdownItem} onPress={handleImportPress}>
                    <Upload size={14} color={mf.accent} />
                    <Text style={styles.dropdownActionText}>IMPORT</Text>
                  </Pressable>
                  <Pressable
                    style={styles.dropdownItem}
                    onPress={() => {
                      setShowChainDropdown(false);
                      setShowVersionHistory(true);
                    }}
                  >
                    <History size={14} color={mf.accent} />
                    <Text style={styles.dropdownActionText}>VERSION HISTORY</Text>
                  </Pressable>
                  <View style={styles.dropdownDivider} />
                  <Text style={[trackedSm(mf.fg3), { paddingHorizontal: 12, paddingVertical: 6 }]}>
                    ALL · {chains.length}
                  </Text>
                  {chains.map((chain) => {
                    const isDeleting = deletingChainId === chain.version_chain_id;
                    const isConfirming = confirmDeleteChainId === chain.version_chain_id;
                    const selected = chain.id === selectedChain?.id;
                    return (
                      <View
                        key={chain.id}
                        style={[
                          styles.chainRow,
                          selected && { backgroundColor: mf.surface2 },
                        ]}
                      >
                        <Pressable
                          style={{ flex: 1 }}
                          onPress={() => handleChainSelect(chain)}
                        >
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.chainName,
                              selected && { color: mf.accent },
                            ]}
                          >
                            {chain.name || 'Untitled Protocol'}
                          </Text>
                        </Pressable>
                        {isConfirming && !isDeleting ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Pressable onPress={() => handleDeleteChain(chain.version_chain_id)}>
                              <Trash2 size={13} color={mf.bad} />
                            </Pressable>
                            <Pressable onPress={() => setConfirmDeleteChainId(null)}>
                              <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: mf.fg3 }}>
                                CANCEL
                              </Text>
                            </Pressable>
                          </View>
                        ) : (
                          <Pressable
                            onPress={() => handleDeleteChain(chain.version_chain_id)}
                            disabled={isDeleting}
                            style={{ padding: 4 }}
                          >
                            {isDeleting ? (
                              <ActivityIndicator size="small" color={mf.fg3} />
                            ) : (
                              <Trash2 size={13} color={mf.fg3} />
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
        }
      />

      {isEditingName && (
        <View style={styles.editNameRow}>
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
        </View>
      )}

      {parsedData && selectedVersion ? (
        <ProtocolTabs
          protocol={parsedData}
          editable={true}
          onProtocolChange={handleProtocolChange}
          protocolId={selectedVersion.id}
          critiques={selectedVersion.critiques}
          verified={selectedVersion.verified}
          onCritiquesUpdated={(critiques) => updateSelectedVersion({ critiques })}
          onProtocolUpdated={refreshVersions}
        />
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={mf.accent} />
        </View>
      )}

      <GenerateProtocolModal
        visible={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onComplete={handleGenerateComplete}
        initialConfig={
          userConfig
            ? {
                personal_info: userConfig.personal_info,
                goals: userConfig.goals,
                requirements: userConfig.requirements,
              }
            : undefined
        }
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
    backgroundColor: mf.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: mf.bg,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  emptyState: {
    padding: 24,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: mf.line,
    borderLeftWidth: 2,
    borderLeftColor: mf.accent,
    backgroundColor: mf.surface,
  },
  emptyTitle: {
    fontFamily: fonts.sansMedium,
    fontSize: 20,
    color: mf.fg,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptyText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: mf.fg2,
    marginBottom: 20,
    lineHeight: 19,
  },
  dropdownButton: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderColor: mf.line2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 36,
    right: 0,
    minWidth: 240,
    backgroundColor: mf.surface,
    borderWidth: 1,
    borderColor: mf.line2,
    zIndex: 10,
    paddingVertical: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownActionText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    color: mf.fg,
    flex: 1,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: mf.line,
    marginVertical: 4,
  },
  chainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  chainName: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: mf.fg2,
  },
  editNameRow: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: mf.surface,
    borderBottomWidth: 1,
    borderBottomColor: mf.line,
  },
  nameInput: {
    fontFamily: fonts.sansMedium,
    fontSize: 18,
    color: mf.fg,
    borderWidth: 1,
    borderColor: mf.line2,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
