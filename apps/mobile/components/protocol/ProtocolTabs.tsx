import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useState, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Undo2 } from 'lucide-react-native';
import { colors, mf, fonts } from '@/lib/theme';
import type {
  DailyProtocol,
  DietPlan,
  SupplementationPlan,
  TrainingProgram,
  Critique,
  Citation,
} from '@protocol/shared/schemas';
import { ScheduleSection } from './ScheduleSection';
import { DietSection } from './DietSection';
import { SupplementsSection } from './SupplementsSection';
import { TrainingSection } from './TrainingSection';
import { SaveChangesButton } from './SaveChangesButton';
import { CritiquesSection } from './CritiquesSection';
import { CitationsSection } from './CitationsSection';

type TabId = 'schedule' | 'diet' | 'supplements' | 'training';

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: 'schedule', label: 'SCHEDULE' },
  { id: 'diet', label: 'DIET' },
  { id: 'supplements', label: 'SUPP.' },
  { id: 'training', label: 'TRAINING' },
];

interface ProtocolTabsProps {
  protocol: DailyProtocol;
  editable?: boolean;
  onProtocolChange?: (protocol: DailyProtocol) => Promise<void>;
  protocolId?: string;
  critiques?: Critique[] | null;
  citations?: Citation[] | null;
  verified?: boolean;
  onCritiquesUpdated?: (critiques: Critique[]) => void;
  onProtocolUpdated?: () => void;
}

export function ProtocolTabs({
  protocol,
  editable = false,
  onProtocolChange,
  protocolId,
  critiques,
  citations,
  verified = true,
  onCritiquesUpdated,
  onProtocolUpdated,
}: ProtocolTabsProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabId>('schedule');
  const [draft, setDraft] = useState<DailyProtocol>(protocol);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleScheduleChange = useCallback((updatedProtocol: DailyProtocol) => {
    setDraft(updatedProtocol);
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

  const handleUndo = useCallback(() => {
    setDraft(protocol);
    setDirty(false);
  }, [protocol]);

  const display = dirty ? draft : protocol;

  const renderContent = () => {
    switch (activeTab) {
      case 'schedule':
        return (
          <ScheduleSection
            protocol={display}
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
        keyboardShouldPersistTaps="always"
      >
        {/* Show critiques above content on all tabs */}
        {critiques && critiques.length > 0 && protocolId && (
          <View style={styles.critiquesContainerTop}>
            <CritiquesSection
              critiques={critiques}
              protocolId={protocolId}
              verified={verified}
              onCritiquesUpdated={onCritiquesUpdated}
              onProtocolUpdated={onProtocolUpdated}
            />
          </View>
        )}
        {renderContent()}
        {citations && citations.length > 0 && (
          <View style={styles.citationsContainer}>
            <CitationsSection citations={citations} />
          </View>
        )}
      </ScrollView>

      {/* Save/Undo Buttons */}
      {dirty && (
        <View style={[styles.saveButtonContainer, { bottom: insets.bottom + 63 }]}>
          <Pressable style={styles.undoButton} onPress={handleUndo} disabled={saving}>
            <Undo2 size={20} color={colors.onSurfaceVariant} />
          </Pressable>
          <View style={styles.saveButtonWrapper}>
            <SaveChangesButton onPress={handleSave} loading={saving} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: mf.bg,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: mf.bg,
    borderBottomWidth: 1,
    borderBottomColor: mf.line,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: mf.accent,
  },
  tabText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.2,
    color: mf.fg3,
  },
  tabTextActive: {
    color: mf.fg,
  },
  content: {
    flex: 1,
    backgroundColor: mf.bg,
  },
  contentContainer: {
    paddingTop: 16,
    paddingBottom: 100,
  },
  contentContainerWithButton: {
    paddingBottom: 180,
  },
  saveButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  undoButton: {
    width: 44,
    height: 44,
    backgroundColor: mf.surface,
    borderWidth: 1,
    borderColor: mf.line2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonWrapper: {
    flex: 1,
  },
  critiquesContainerTop: {
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  citationsContainer: {
    marginTop: 16,
    paddingHorizontal: 20,
  },
});
