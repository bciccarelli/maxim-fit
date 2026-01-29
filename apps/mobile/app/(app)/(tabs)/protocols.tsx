import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { DailyProtocol } from '@protocol/shared/schemas';

type ProtocolRow = {
  id: string;
  name: string | null;
  protocol_data: DailyProtocol;
  verified: boolean;
  weighted_goal_score: number | null;
  viability_score: number | null;
  created_at: string;
};

export default function ProtocolsScreen() {
  const [protocols, setProtocols] = useState<ProtocolRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const fetchProtocols = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('protocols')
      .select('id, name, protocol_data, verified, weighted_goal_score, viability_score, created_at')
      .eq('user_id', user.id)
      .eq('is_current', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching protocols:', error);
    } else {
      setProtocols(data || []);
    }
  }, [user]);

  useEffect(() => {
    fetchProtocols().finally(() => setIsLoading(false));
  }, [fetchProtocols]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchProtocols();
    setIsRefreshing(false);
  }, [fetchProtocols]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2d5a2d" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#2d5a2d" />
      }
    >
      {protocols.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No protocols yet</Text>
          <Text style={styles.emptyText}>
            Generate your first protocol on the web app to see it here.
          </Text>
        </View>
      ) : (
        protocols.map((protocol) => (
          <Pressable
            key={protocol.id}
            style={styles.card}
            onPress={() => router.push(`/(app)/protocol/${protocol.id}`)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {protocol.name || 'Untitled Protocol'}
              </Text>
              {protocol.verified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>

            <View style={styles.scores}>
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
            </View>

            <Text style={styles.cardDate}>
              Created {new Date(protocol.created_at).toLocaleDateString()}
            </Text>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f0',
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f0',
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#2d5a2d',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a2e1a',
    flex: 1,
  },
  verifiedBadge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2d5a2d',
    textTransform: 'uppercase',
  },
  scores: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 12,
  },
  scoreItem: {
    alignItems: 'flex-start',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1a2e1a',
    fontVariant: ['tabular-nums'],
  },
  scoreLabel: {
    fontSize: 11,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardDate: {
    fontSize: 12,
    color: '#999',
  },
});
