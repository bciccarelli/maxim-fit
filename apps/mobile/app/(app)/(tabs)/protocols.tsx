import { View, Text, StyleSheet, Pressable, ActivityIndicator, RefreshControl, ScrollView, Alert, TextInput } from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, Wand2, Plus, ShieldCheck, Pencil, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useProtocol, type ProtocolChain, type ProtocolVersion } from '@/contexts/ProtocolContext';
import type { DailyProtocol } from '@protocol/shared/schemas';
import { ProtocolTabs } from '@/components/protocol/ProtocolTabs';
import { CritiquesSection } from '@/components/protocol/CritiquesSection';
import { ModifySheet } from '@/components/protocol/ModifySheet';
import { GenerateProtocolModal } from '@/components/protocol/GenerateProtocolModal';
import { scheduleProtocolNotifications } from '@/lib/notifications/scheduler';
import { getNotificationPreferences } from '@/lib/storage/notificationPreferences';
import { ProFeatureButton } from '@/components/subscription/ProFeatureButton';
import { useUserConfig } from '@/hooks/useUserConfig';

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
    versions,
    selectedVersion,
    selectVersion,
    updateSelectedVersion,
    parsedProtocol: parsedData,
    isLoadingChains: isLoading,
    isLoadingVersions,
    refreshChains,
    refreshVersions,
  } = useProtocol();

  // Local UI state
  const [showChainDropdown, setShowChainDropdown] = useState(false);
  const [showVersionDropdown, setShowVersionDropdown] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Name editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  // Modals
  const [showModifySheet, setShowModifySheet] = useState(false);
  const [modifyContext, setModifyContext] = useState<string | undefined>(undefined);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  // Delete state
  const [confirmDeleteChainId, setConfirmDeleteChainId] = useState<string | null>(null);
  const [deletingChainId, setDeletingChainId] = useState<string | null>(null);

  // Schedule notifications when protocol is loaded
  const lastScheduledProtocolId = useRef<string | null>(null);
  useEffect(() => {
    async function scheduleNotifications() {
      if (!parsedData || !selectedVersion) return;

      // Only schedule once per protocol version
      if (lastScheduledProtocolId.current === selectedVersion.id) return;

      try {
        const preferences = await getNotificationPreferences();
        if (preferences.enabled) {
          const count = await scheduleProtocolNotifications(
            parsedData,
            preferences,
            selectedVersion.id
          );
          console.log(`Scheduled ${count} notifications for protocol`);
          lastScheduledProtocolId.current = selectedVersion.id;
        }
      } catch (error) {
        console.error('Error scheduling notifications:', error);
      }
    }

    scheduleNotifications();
  }, [parsedData, selectedVersion]);

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

  const handleVersionSelect = (version: ProtocolVersion) => {
    selectVersion(version);
    setShowVersionDropdown(false);
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

  const getVersionLabel = (version: ProtocolVersion) => {
    const sourceLabels: Record<string, string> = {
      generated: 'Generated',
      imported: 'Imported',
      direct_edit: 'Edited',
      ai_modify: 'AI Modified',
      critique_apply: 'Critique Applied',
      revert: 'Reverted',
    };
    const source = version.change_source ? sourceLabels[version.change_source] || version.change_source : '';
    return `v${version.version}${source ? ` – ${source}` : ''}`;
  };

  const getShortVersionLabel = (version: ProtocolVersion) => {
    return `v${version.version}`;
  };

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

  const handleVerify = async () => {
    if (!selectedVersion || isVerifying) return;

    setIsVerifying(true);
    try {
      await fetchApi('/api/protocol/verify', {
        method: 'POST',
        body: JSON.stringify({ protocolId: selectedVersion.id }),
      });
      await refreshVersions();
    } catch (error) {
      Alert.alert('Error', 'Failed to verify protocol.');
    }
    setIsVerifying(false);
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

  const openModifyWithContext = (context?: string) => {
    setModifyContext(context);
    setShowModifySheet(true);
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#2d5a2d" />
      </View>
    );
  }

  if (chains.length === 0) {
    return (
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={styles.emptyContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#2d5a2d" />
        }
      >
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No protocols yet</Text>
          <Text style={styles.emptyText}>
            Create your personalized health protocol to get started.
          </Text>
          <Pressable
            style={styles.generateButton}
            onPress={() => setShowGenerateModal(true)}
          >
            <Text style={styles.generateButtonText}>Generate Protocol</Text>
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
              <Pencil size={14} color="#999" />
            </Pressable>
          )}
        </View>

        {/* Protocol Dropdown Button */}
        <View style={[styles.dropdownButtonWrapper, { zIndex: 20 }]}>
          <Pressable
            style={styles.dropdownButton}
            onPress={() => {
              setShowChainDropdown(!showChainDropdown);
              setShowVersionDropdown(false);
            }}
          >
            <ChevronDown size={20} color="#666" />
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
                <Plus size={16} color="#2d5a2d" />
                <Text style={[styles.dropdownItemText, styles.newProtocolText]}>
                  New Protocol
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
                          <Trash2 size={14} color="#dc2626" />
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
                          <ActivityIndicator size="small" color="#999" />
                        ) : (
                          <Trash2 size={14} color="#999" />
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

      {/* Version and Actions Bar */}
      {selectedVersion && (
        <View style={styles.actionsBar}>
          {/* Version Selector */}
          <View style={[styles.versionSelectorWrapper, { zIndex: 10 }]}>
            <Pressable
              style={[styles.versionSelector, isLoadingVersions && styles.dropdownDisabled]}
              onPress={() => {
                if (!isLoadingVersions && versions.length > 0) {
                  setShowVersionDropdown(!showVersionDropdown);
                  setShowChainDropdown(false);
                }
              }}
              disabled={isLoadingVersions}
            >
              {isLoadingVersions ? (
                <ActivityIndicator size="small" color="#666" />
              ) : (
                <>
                  <Text style={styles.versionText} numberOfLines={1} ellipsizeMode="tail">
                    {selectedVersion ? getShortVersionLabel(selectedVersion) : 'Select'}
                  </Text>
                  <ChevronDown size={14} color="#666" />
                </>
              )}
            </Pressable>

            {showVersionDropdown && versions.length > 0 && (
              <View style={[styles.dropdownMenu, styles.versionDropdownMenu]}>
                <ScrollView style={styles.versionScrollView} nestedScrollEnabled>
                  {versions.map((version) => (
                    <Pressable
                      key={version.id}
                      style={[
                        styles.dropdownItem,
                        version.id === selectedVersion?.id && styles.dropdownItemSelected,
                      ]}
                      onPress={() => handleVersionSelect(version)}
                    >
                      <View style={styles.versionItemContent}>
                        <Text
                          style={[
                            styles.dropdownItemText,
                            version.id === selectedVersion?.id && styles.dropdownItemTextSelected,
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {getVersionLabel(version)}
                        </Text>
                        <Text style={styles.versionDate}>
                          {new Date(version.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Scores */}
          <View style={styles.scoresInline}>
            {selectedVersion.weighted_goal_score !== null && (
              <View style={styles.scoreChip}>
                <Text style={styles.scoreChipValue}>
                  {selectedVersion.weighted_goal_score.toFixed(1)}
                </Text>
                <Text style={styles.scoreChipLabel}>goal</Text>
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            {/* Verified Button */}
            <ProFeatureButton feature="verify" onPress={handleVerify}>
              <View
                style={[
                  styles.verifyButton,
                  selectedVersion.verified && styles.verifyButtonVerified,
                ]}
                pointerEvents="none"
              >
                {isVerifying ? (
                  <ActivityIndicator size="small" color={selectedVersion.verified ? '#2d5a2d' : '#666'} />
                ) : (
                  <>
                    <ShieldCheck size={16} color={selectedVersion.verified ? '#2d5a2d' : '#666'} />
                    <Text style={[
                      styles.verifyButtonText,
                      selectedVersion.verified && styles.verifyButtonTextVerified,
                    ]}>
                      {selectedVersion.verified ? 'Verified' : 'Verify'}
                    </Text>
                  </>
                )}
              </View>
            </ProFeatureButton>

            {/* Modify Button */}
            <ProFeatureButton feature="modify" onPress={() => openModifyWithContext()}>
              <View style={styles.actionButton} pointerEvents="none">
                <Wand2 size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Modify</Text>
              </View>
            </ProFeatureButton>
          </View>
        </View>
      )}

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
          <ActivityIndicator size="large" color="#2d5a2d" />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a2e1a',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  generateButton: {
    backgroundColor: '#2d5a2d',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  generateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    gap: 8,
  },
  nameContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  protocolName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a2e1a',
    flexShrink: 1,
  },
  nameInput: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a2e1a',
    padding: 0,
    margin: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#2d5a2d',
  },
  dropdownButtonWrapper: {
    position: 'relative',
  },
  dropdownButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f5f5f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    minWidth: 220,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#e5e5e5',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  dropdownItemSelected: {
    backgroundColor: '#e8f5e9',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  dropdownItemTextSelected: {
    color: '#2d5a2d',
    fontWeight: '500',
  },
  newProtocolText: {
    color: '#2d5a2d',
    fontWeight: '500',
  },
  dropdownItemContent: {
    flex: 1,
  },
  deleteButton: {
    padding: 4,
  },
  deleteConfirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteConfirmButton: {
    padding: 4,
  },
  deleteCancelText: {
    fontSize: 12,
    color: '#999',
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    gap: 8,
  },
  versionSelectorWrapper: {
    position: 'relative',
  },
  versionSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f0',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
    minWidth: 80,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1a2e1a',
  },
  versionDropdownMenu: {
    left: 0,
    right: 'auto',
    minWidth: 180,
    maxHeight: 250,
  },
  versionScrollView: {
    maxHeight: 250,
  },
  versionItemContent: {
    flex: 1,
  },
  versionDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  dropdownDisabled: {
    opacity: 0.6,
  },
  scoresInline: {
    flexDirection: 'row',
    gap: 6,
  },
  scoreChip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: '#f5f5f0',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 2,
  },
  scoreChipValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a2e1a',
    fontVariant: ['tabular-nums'],
  },
  scoreChipLabel: {
    fontSize: 9,
    color: '#666',
  },
  actionsRow: {
    flexDirection: 'row',
    marginLeft: 'auto',
    gap: 8,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    gap: 4,
  },
  verifyButtonVerified: {
    borderColor: '#2d5a2d',
    backgroundColor: '#e8f5e9',
  },
  verifyButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  verifyButtonTextVerified: {
    color: '#2d5a2d',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d5a2d',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
});
