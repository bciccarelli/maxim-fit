import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import { Wand2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { normalizeProtocol } from '@protocol/shared/schemas';
import type { DailyProtocol } from '@protocol/shared/schemas';
import { fetchApi } from '@/lib/api';
import { ProtocolTabs } from '@/components/protocol/ProtocolTabs';
import { AskSheet } from '@/components/protocol/AskSheet';
import { ModifySheet } from '@/components/protocol/ModifySheet';
import { ExportPdfButton } from '@/components/protocol/ExportPdfButton';

type ProtocolRow = {
  id: string;
  name: string | null;
  protocol_data: unknown;
  verified: boolean;
  weighted_goal_score: number | null;
  viability_score: number | null;
  version_chain_id: string;
};

export default function ProtocolDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [protocol, setProtocol] = useState<ProtocolRow | null>(null);
  const [parsedData, setParsedData] = useState<DailyProtocol | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAskSheet, setShowAskSheet] = useState(false);
  const [showModifySheet, setShowModifySheet] = useState(false);
  const [modifyInitialMessage, setModifyInitialMessage] = useState('');

  const fetchProtocol = useCallback(async (protocolId: string) => {
    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('protocols')
      .select('id, name, protocol_data, verified, weighted_goal_score, viability_score, version_chain_id')
      .eq('id', protocolId)
      .single();

    if (fetchError) {
      setError(fetchError.message);
    } else if (data) {
      setProtocol(data);
      try {
        const normalized = normalizeProtocol(data.protocol_data);
        setParsedData(normalized);
      } catch (e) {
        setError('Failed to parse protocol data');
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (id) {
      fetchProtocol(id);
    }
  }, [id, fetchProtocol]);

  const handleExportToModify = useCallback((context: string) => {
    setModifyInitialMessage(`Based on our discussion:\n\n${context}\n\nPlease make these changes.`);
    setShowModifySheet(true);
  }, []);

  const handleModifyAccepted = useCallback((newProtocolId: string) => {
    // Navigate to the new protocol version
    router.replace(`/(app)/protocol/${newProtocolId}`);
  }, [router]);

  const handleProtocolChange = useCallback(async (updatedProtocol: DailyProtocol) => {
    if (!protocol) return;
    try {
      const result = await fetchApi<{ id: string }>('/api/protocol/edit', {
        method: 'POST',
        body: JSON.stringify({
          protocolId: protocol.id,
          protocolData: updatedProtocol,
          changeNote: 'Direct edit (mobile)',
        }),
      });
      // Navigate to the new version
      router.replace(`/(app)/protocol/${result.id}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to save changes. Please try again.');
      throw error; // Re-throw so ProtocolTabs knows the save failed
    }
  }, [protocol, router]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2d5a2d" />
      </View>
    );
  }

  if (error || !protocol || !parsedData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Protocol not found'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: protocol.name || 'Protocol',
          headerRight: () => (
            <View style={styles.headerButtons}>
              {parsedData && (
                <ExportPdfButton
                  protocol={parsedData}
                  name={protocol.name}
                  scores={{
                    weighted_goal_score: protocol.weighted_goal_score,
                    viability_score: protocol.viability_score,
                  }}
                  verified={protocol.verified}
                />
              )}
              <Pressable
                style={styles.headerButton}
                onPress={() => {
                  setModifyInitialMessage('');
                  setShowModifySheet(true);
                }}
              >
                <Wand2 size={22} color="#fff" />
              </Pressable>
            </View>
          ),
        }}
      />

      {/* Scores Header */}
      <View style={styles.scoresCard}>
        <View style={styles.scoreRow}>
          {protocol.weighted_goal_score !== null && (
            <View style={styles.scoreItem}>
              <Text style={styles.scoreValue}>
                {protocol.weighted_goal_score.toFixed(1)}
              </Text>
              <Text style={styles.scoreLabel}>Goal Score</Text>
            </View>
          )}
          {protocol.viability_score !== null && (
            <View style={styles.scoreItem}>
              <Text style={styles.scoreValue}>
                {protocol.viability_score.toFixed(1)}
              </Text>
              <Text style={styles.scoreLabel}>Viability</Text>
            </View>
          )}
          <View style={styles.scoreItem}>
            <Text style={[styles.scoreValue, protocol.verified ? styles.verified : styles.unverified]}>
              {protocol.verified ? '✓' : '○'}
            </Text>
            <Text style={styles.scoreLabel}>
              {protocol.verified ? 'Verified' : 'Unverified'}
            </Text>
          </View>
        </View>
      </View>

      {/* Protocol Tabs */}
      <ProtocolTabs
        protocol={parsedData}
        editable={true}
        onProtocolChange={handleProtocolChange}
      />

      {/* Ask Sheet */}
      <AskSheet
        visible={showAskSheet}
        onClose={() => setShowAskSheet(false)}
        protocolId={protocol.id}
        versionChainId={protocol.version_chain_id}
        onExportToModify={handleExportToModify}
      />

      {/* Modify Sheet */}
      <ModifySheet
        visible={showModifySheet}
        onClose={() => {
          setShowModifySheet(false);
          setModifyInitialMessage('');
        }}
        protocolId={protocol.id}
        currentScores={{
          weighted_goal_score: protocol.weighted_goal_score,
          viability_score: protocol.viability_score,
        }}
        onAccepted={handleModifyAccepted}
      />
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f0',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#c62828',
    textAlign: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerButton: {
    padding: 8,
  },
  scoresCard: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1a2e1a',
    fontVariant: ['tabular-nums'],
  },
  scoreLabel: {
    fontSize: 10,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  verified: {
    color: '#2d5a2d',
  },
  unverified: {
    color: '#999',
  },
});
