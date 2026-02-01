import { View, Text, StyleSheet, Pressable, ActivityIndicator, RefreshControl, ScrollView, Alert } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, MessageCircle, Wand2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeProtocol } from '@protocol/shared/schemas';
import type { DailyProtocol } from '@protocol/shared/schemas';
import { ProtocolTabs } from '@/components/protocol/ProtocolTabs';
import { AskSheet } from '@/components/protocol/AskSheet';
import { ModifySheet } from '@/components/protocol/ModifySheet';

type ProtocolChain = {
  id: string;
  name: string | null;
  version_chain_id: string;
};

type ProtocolVersion = {
  id: string;
  version: number;
  name: string | null;
  protocol_data: unknown;
  verified: boolean;
  weighted_goal_score: number | null;
  viability_score: number | null;
  version_chain_id: string;
  created_at: string;
  change_source: string | null;
};

export default function ProtocolsScreen() {
  const { user } = useAuth();

  // Protocol chains (unique protocols)
  const [chains, setChains] = useState<ProtocolChain[]>([]);
  const [selectedChain, setSelectedChain] = useState<ProtocolChain | null>(null);
  const [showChainDropdown, setShowChainDropdown] = useState(false);

  // Versions of selected chain
  const [versions, setVersions] = useState<ProtocolVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<ProtocolVersion | null>(null);
  const [showVersionDropdown, setShowVersionDropdown] = useState(false);

  // Parsed protocol data
  const [parsedData, setParsedData] = useState<DailyProtocol | null>(null);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [showAskSheet, setShowAskSheet] = useState(false);
  const [showModifySheet, setShowModifySheet] = useState(false);

  // Fetch protocol chains (current versions only, grouped by chain)
  const fetchChains = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('protocols')
      .select('id, name, version_chain_id')
      .eq('user_id', user.id)
      .eq('is_current', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching protocols:', error);
      return;
    }

    if (data && data.length > 0) {
      setChains(data);
      // Select first chain if none selected
      if (!selectedChain) {
        setSelectedChain(data[0]);
      }
    }
  }, [user, selectedChain]);

  // Fetch versions when chain changes
  const fetchVersions = useCallback(async () => {
    if (!selectedChain) return;

    setIsLoadingVersions(true);

    const { data, error } = await supabase
      .from('protocols')
      .select('id, version, name, protocol_data, verified, weighted_goal_score, viability_score, version_chain_id, created_at, change_source')
      .eq('version_chain_id', selectedChain.version_chain_id)
      .order('version', { ascending: false });

    if (error) {
      console.error('Error fetching versions:', error);
      setIsLoadingVersions(false);
      return;
    }

    if (data && data.length > 0) {
      setVersions(data);
      // Select the latest version (first in list since sorted desc)
      setSelectedVersion(data[0]);
    }

    setIsLoadingVersions(false);
  }, [selectedChain]);

  // Parse protocol data when version changes
  useEffect(() => {
    if (selectedVersion?.protocol_data) {
      try {
        const normalized = normalizeProtocol(selectedVersion.protocol_data);
        setParsedData(normalized);
      } catch (e) {
        console.error('Error parsing protocol:', e);
        setParsedData(null);
      }
    } else {
      setParsedData(null);
    }
  }, [selectedVersion]);

  // Initial fetch
  useEffect(() => {
    fetchChains().finally(() => setIsLoading(false));
  }, [fetchChains]);

  // Fetch versions when chain changes
  useEffect(() => {
    if (selectedChain) {
      fetchVersions();
    }
  }, [selectedChain, fetchVersions]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchChains();
    if (selectedChain) {
      await fetchVersions();
    }
    setIsRefreshing(false);
  }, [fetchChains, fetchVersions, selectedChain]);

  const handleChainSelect = (chain: ProtocolChain) => {
    setSelectedChain(chain);
    setShowChainDropdown(false);
    setVersions([]);
    setSelectedVersion(null);
  };

  const handleVersionSelect = (version: ProtocolVersion) => {
    setSelectedVersion(version);
    setShowVersionDropdown(false);
  };

  const handleModifyAccepted = useCallback(async (newProtocolId: string) => {
    // Refresh to get the new version
    await fetchVersions();
  }, [fetchVersions]);

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
      await fetchVersions();
    } catch (error) {
      Alert.alert('Error', 'Failed to save changes. Please try again.');
      throw error;
    }
  }, [selectedVersion, fetchVersions]);

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
    return `v${version.version}${source ? ` - ${source}` : ''}`;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2d5a2d" />
      </View>
    );
  }

  if (chains.length === 0) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.emptyContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#2d5a2d" />
        }
      >
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No protocols yet</Text>
          <Text style={styles.emptyText}>
            Generate your first protocol on the web app to see it here.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Dropdowns Container */}
      <View style={styles.dropdownsContainer}>
        {/* Protocol Selector */}
        <View style={[styles.dropdownWrapper, { zIndex: 20 }]}>
          <Text style={styles.dropdownLabel}>Protocol</Text>
          <Pressable
            style={styles.dropdown}
            onPress={() => {
              setShowChainDropdown(!showChainDropdown);
              setShowVersionDropdown(false);
            }}
          >
            <Text style={styles.dropdownText} numberOfLines={1}>
              {selectedChain?.name || 'Untitled Protocol'}
            </Text>
            <ChevronDown size={18} color="#666" />
          </Pressable>

          {showChainDropdown && (
            <View style={styles.dropdownMenu}>
              {chains.map((chain) => (
                <Pressable
                  key={chain.id}
                  style={[
                    styles.dropdownItem,
                    chain.id === selectedChain?.id && styles.dropdownItemSelected,
                  ]}
                  onPress={() => handleChainSelect(chain)}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      chain.id === selectedChain?.id && styles.dropdownItemTextSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {chain.name || 'Untitled Protocol'}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Version Selector */}
        <View style={[styles.dropdownWrapper, styles.versionDropdown, { zIndex: 10 }]}>
          <Text style={styles.dropdownLabel}>Version</Text>
          <Pressable
            style={[styles.dropdown, isLoadingVersions && styles.dropdownDisabled]}
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
                <Text style={styles.dropdownText} numberOfLines={1}>
                  {selectedVersion ? getVersionLabel(selectedVersion) : 'Select version'}
                </Text>
                <ChevronDown size={18} color="#666" />
              </>
            )}
          </Pressable>

          {showVersionDropdown && versions.length > 0 && (
            <View style={styles.dropdownMenu}>
              {versions.map((version) => (
                <Pressable
                  key={version.id}
                  style={[
                    styles.dropdownItem,
                    version.id === selectedVersion?.id && styles.dropdownItemSelected,
                  ]}
                  onPress={() => handleVersionSelect(version)}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      version.id === selectedVersion?.id && styles.dropdownItemTextSelected,
                    ]}
                  >
                    {getVersionLabel(version)}
                  </Text>
                  <Text style={styles.versionDate}>
                    {new Date(version.created_at).toLocaleDateString()}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Scores and Actions Bar */}
      {selectedVersion && (
        <View style={styles.scoresBar}>
          <View style={styles.scoresRow}>
            {selectedVersion.weighted_goal_score !== null && (
              <View style={styles.scoreItem}>
                <Text style={styles.scoreValue}>
                  {selectedVersion.weighted_goal_score.toFixed(1)}
                </Text>
                <Text style={styles.scoreLabel}>Goal</Text>
              </View>
            )}
            {selectedVersion.viability_score !== null && (
              <View style={styles.scoreItem}>
                <Text style={styles.scoreValue}>
                  {selectedVersion.viability_score.toFixed(1)}
                </Text>
                <Text style={styles.scoreLabel}>Viability</Text>
              </View>
            )}
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreValue, selectedVersion.verified ? styles.verified : styles.unverified]}>
                {selectedVersion.verified ? '✓' : '○'}
              </Text>
              <Text style={styles.scoreLabel}>
                {selectedVersion.verified ? 'Verified' : 'Unverified'}
              </Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <Pressable
              style={styles.actionButton}
              onPress={() => setShowAskSheet(true)}
            >
              <MessageCircle size={18} color="#2d5a2d" />
              <Text style={styles.actionButtonText}>Ask</Text>
            </Pressable>
            <Pressable
              style={styles.actionButton}
              onPress={() => setShowModifySheet(true)}
            >
              <Wand2 size={18} color="#2d5a2d" />
              <Text style={styles.actionButtonText}>Modify</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Protocol Content */}
      {parsedData ? (
        <ProtocolTabs
          protocol={parsedData}
          editable={true}
          onProtocolChange={handleProtocolChange}
        />
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2d5a2d" />
        </View>
      )}

      {/* Modals */}
      {selectedVersion && (
        <>
          <AskSheet
            visible={showAskSheet}
            onClose={() => setShowAskSheet(false)}
            protocolId={selectedVersion.id}
            versionChainId={selectedVersion.version_chain_id}
          />

          <ModifySheet
            visible={showModifySheet}
            onClose={() => setShowModifySheet(false)}
            protocolId={selectedVersion.id}
            currentScores={{
              weighted_goal_score: selectedVersion.weighted_goal_score,
              viability_score: selectedVersion.viability_score,
            }}
            onAccepted={handleModifyAccepted}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f0',
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
  },
  dropdownsContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    gap: 12,
  },
  dropdownWrapper: {
    flex: 1,
    position: 'relative',
  },
  versionDropdown: {
    flex: 0.6,
  },
  dropdownLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 36,
  },
  dropdownDisabled: {
    opacity: 0.6,
  },
  dropdownText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1a2e1a',
    flex: 1,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxHeight: 200,
  },
  dropdownItem: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemSelected: {
    backgroundColor: '#e8f5e9',
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#333',
  },
  dropdownItemTextSelected: {
    color: '#2d5a2d',
    fontWeight: '500',
  },
  versionDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  scoresBar: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  scoresRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a2e1a',
    fontVariant: ['tabular-nums'],
  },
  scoreLabel: {
    fontSize: 9,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  verified: {
    color: '#2d5a2d',
  },
  unverified: {
    color: '#999',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2d5a2d',
  },
});
