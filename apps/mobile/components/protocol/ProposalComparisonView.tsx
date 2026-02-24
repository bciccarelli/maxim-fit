import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useState } from 'react';
import type { DailyProtocol } from '@protocol/shared/schemas';
import { ProtocolTabs } from './ProtocolTabs';
import { colors } from '@/lib/theme';

type ComparisonTab = 'current' | 'proposed';

interface ProposalComparisonViewProps {
  currentProtocol: DailyProtocol;
  proposedProtocol: DailyProtocol;
}

export function ProposalComparisonView({
  currentProtocol,
  proposedProtocol,
}: ProposalComparisonViewProps) {
  const [activeTab, setActiveTab] = useState<ComparisonTab>('proposed');

  return (
    <View style={styles.container}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, activeTab === 'current' && styles.tabActive]}
          onPress={() => setActiveTab('current')}
        >
          <Text style={[styles.tabText, activeTab === 'current' && styles.tabTextActive]}>
            Current
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'proposed' && styles.tabActiveProposed]}
          onPress={() => setActiveTab('proposed')}
        >
          <Text style={[styles.tabText, activeTab === 'proposed' && styles.tabTextActiveProposed]}>
            Proposed
          </Text>
        </Pressable>
      </View>

      {/* Protocol Content */}
      <View style={styles.protocolContent}>
        <ProtocolTabs
          protocol={activeTab === 'current' ? currentProtocol : proposedProtocol}
          editable={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.textSecondary,
  },
  tabActiveProposed: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  tabTextActiveProposed: {
    color: colors.primary,
    fontWeight: '600',
  },
  protocolContent: {
    flex: 1,
  },
});
