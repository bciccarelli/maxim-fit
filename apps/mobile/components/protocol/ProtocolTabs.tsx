import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useState } from 'react';
import type { DailyProtocol } from '@protocol/shared/schemas';
import { ScheduleSection } from './ScheduleSection';
import { DietSection } from './DietSection';
import { SupplementsSection } from './SupplementsSection';
import { TrainingSection } from './TrainingSection';

type TabId = 'schedule' | 'diet' | 'supplements' | 'training';

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: 'schedule', label: 'Schedule' },
  { id: 'diet', label: 'Diet' },
  { id: 'supplements', label: 'Supps' },
  { id: 'training', label: 'Training' },
];

interface ProtocolTabsProps {
  protocol: DailyProtocol;
}

export function ProtocolTabs({ protocol }: ProtocolTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('schedule');

  const renderContent = () => {
    switch (activeTab) {
      case 'schedule':
        return <ScheduleSection schedules={protocol.schedules} />;
      case 'diet':
        return <DietSection diet={protocol.diet} />;
      case 'supplements':
        return <SupplementsSection supplementation={protocol.supplementation} />;
      case 'training':
        return <TrainingSection training={protocol.training} />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text
              style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Tab Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#2d5a2d',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  tabTextActive: {
    color: '#2d5a2d',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    backgroundColor: '#f5f5f0',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
});
