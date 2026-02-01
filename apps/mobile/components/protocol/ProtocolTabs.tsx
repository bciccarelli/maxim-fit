import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useState, useCallback } from 'react';
import type {
  DailyProtocol,
  ScheduleVariant,
  DietPlan,
  SupplementationPlan,
  TrainingProgram,
} from '@protocol/shared/schemas';
import { ScheduleSection } from './ScheduleSection';
import { DietSection } from './DietSection';
import { SupplementsSection } from './SupplementsSection';
import { TrainingSection } from './TrainingSection';
import { SaveChangesButton } from './SaveChangesButton';

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
  editable?: boolean;
  onProtocolChange?: (protocol: DailyProtocol) => Promise<void>;
}

export function ProtocolTabs({
  protocol,
  editable = false,
  onProtocolChange,
}: ProtocolTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('schedule');
  const [draft, setDraft] = useState<DailyProtocol>(protocol);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleScheduleChange = useCallback((schedules: ScheduleVariant[]) => {
    setDraft((prev) => ({ ...prev, schedules }));
    setDirty(true);
  }, []);

  const handleDietChange = useCallback((diet: DietPlan) => {
    setDraft((prev) => ({ ...prev, diet }));
    setDirty(true);
  }, []);

  const handleSupplementsChange = useCallback((supplementation: SupplementationPlan) => {
    setDraft((prev) => ({ ...prev, supplementation }));
    setDirty(true);
  }, []);

  const handleTrainingChange = useCallback((training: TrainingProgram) => {
    setDraft((prev) => ({ ...prev, training }));
    setDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!onProtocolChange || !dirty) return;
    setSaving(true);
    try {
      await onProtocolChange(draft);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }, [onProtocolChange, dirty, draft]);

  const display = dirty ? draft : protocol;

  const renderContent = () => {
    switch (activeTab) {
      case 'schedule':
        return (
          <ScheduleSection
            schedules={display.schedules}
            editable={editable}
            onChange={handleScheduleChange}
          />
        );
      case 'diet':
        return (
          <DietSection
            diet={display.diet}
            editable={editable}
            onChange={handleDietChange}
          />
        );
      case 'supplements':
        return (
          <SupplementsSection
            supplementation={display.supplementation}
            editable={editable}
            onChange={handleSupplementsChange}
          />
        );
      case 'training':
        return (
          <TrainingSection
            training={display.training}
            editable={editable}
            onChange={handleTrainingChange}
          />
        );
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
        contentContainerStyle={[
          styles.contentContainer,
          dirty && styles.contentContainerWithButton,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderContent()}
      </ScrollView>

      {/* Save Button */}
      {dirty && (
        <View style={styles.saveButtonContainer}>
          <SaveChangesButton onPress={handleSave} loading={saving} />
        </View>
      )}
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
  contentContainerWithButton: {
    paddingBottom: 100,
  },
  saveButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#f5f5f0',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
});
