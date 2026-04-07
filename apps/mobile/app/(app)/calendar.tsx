import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useState, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, Plus } from 'lucide-react-native';
import { colors, spacing, fontSize } from '@/lib/theme';
import { useSchedule, type ProtocolSchedule } from '@/contexts/ScheduleContext';
import { useProtocol } from '@/contexts/ProtocolContext';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { ScheduleList } from '@/components/calendar/ScheduleList';
import { ScheduleFormSheet } from '@/components/calendar/ScheduleFormSheet';

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { chains } = useProtocol();
  const {
    schedules,
    activeSchedule,
    isLoading,
    createSchedule,
    updateSchedule,
    deleteSchedule,
  } = useSchedule();

  // Calendar state
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ProtocolSchedule | null>(null);

  const handlePrevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };

  const handleNextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const handleAddSchedule = () => {
    setEditingSchedule(null);
    setShowForm(true);
  };

  const handleEditSchedule = (schedule: ProtocolSchedule) => {
    setEditingSchedule(schedule);
    setShowForm(true);
  };

  const handleDeleteSchedule = useCallback(async (id: string) => {
    try {
      await deleteSchedule(id);
    } catch (error) {
      console.error('Failed to delete schedule:', error);
    }
  }, [deleteSchedule]);

  const handleSaveSchedule = useCallback(async (params: {
    id?: string;
    versionChainId: string;
    startDate: string;
    endDate: string | null;
    label: string | null;
  }) => {
    if (params.id) {
      await updateSchedule({
        id: params.id,
        versionChainId: params.versionChainId,
        startDate: params.startDate,
        endDate: params.endDate,
        label: params.label,
      });
    } else {
      await createSchedule({
        versionChainId: params.versionChainId,
        startDate: params.startDate,
        endDate: params.endDate,
        label: params.label,
      });
    }
  }, [createSchedule, updateSchedule]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <X size={20} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Calendar</Text>
        <Pressable onPress={handleAddSchedule} style={styles.headerButton}>
          <Plus size={20} color={colors.primaryContainer} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primaryContainer} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Calendar Grid */}
          <CalendarGrid
            year={year}
            month={month}
            schedules={schedules}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
          />

          {/* Selected Date Info */}
          {selectedDate && (() => {
            const schedule = schedules.find(s => {
              if (selectedDate < s.start_date) return false;
              if (s.end_date === null) return true;
              return selectedDate <= s.end_date;
            });
            if (!schedule) return (
              <View style={styles.dateInfo}>
                <Text style={styles.dateInfoDate}>{formatDateDisplay(selectedDate)}</Text>
                <Text style={styles.dateInfoEmpty}>No protocol scheduled</Text>
                <Pressable
                  style={styles.dateInfoButton}
                  onPress={() => {
                    setEditingSchedule(null);
                    setShowForm(true);
                  }}
                >
                  <Text style={styles.dateInfoButtonText}>Schedule a protocol</Text>
                </Pressable>
              </View>
            );
            return (
              <View style={styles.dateInfo}>
                <Text style={styles.dateInfoDate}>{formatDateDisplay(selectedDate)}</Text>
                <View style={styles.dateInfoSchedule}>
                  <View style={styles.dateInfoLeftBorder} />
                  <View style={styles.dateInfoContent}>
                    <Text style={styles.dateInfoName}>
                      {schedule.label || schedule.protocol_name || 'Untitled'}
                    </Text>
                    <Text style={styles.dateInfoDates}>
                      {formatDateShort(schedule.start_date)}
                      {' \u2013 '}
                      {schedule.end_date ? formatDateShort(schedule.end_date) : 'Indefinite'}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })()}

          {/* Schedule List */}
          <View style={styles.listSection}>
            <ScheduleList
              schedules={schedules}
              activeScheduleId={activeSchedule?.id ?? null}
              onEdit={handleEditSchedule}
              onDelete={handleDeleteSchedule}
            />
          </View>

          {/* Add Schedule Button */}
          {chains.length > 0 && (
            <Pressable style={styles.addButton} onPress={handleAddSchedule}>
              <Plus size={16} color={colors.primaryContainer} />
              <Text style={styles.addButtonText}>Add to Calendar</Text>
            </Pressable>
          )}
        </ScrollView>
      )}

      {/* Form Sheet */}
      <ScheduleFormSheet
        visible={showForm}
        onClose={() => { setShowForm(false); setEditingSchedule(null); }}
        onSave={handleSaveSchedule}
        chains={chains}
        editingSchedule={editingSchedule}
        initialDate={selectedDate}
      />
    </View>
  );
}

function formatDateDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
}

function formatDateShort(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(m) - 1]} ${parseInt(d)}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
  },
  headerButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.onSurface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing.lg,
  },
  dateInfo: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  dateInfoDate: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.onSurface,
    fontVariant: ['tabular-nums'],
  },
  dateInfoEmpty: {
    fontSize: fontSize.xs,
    color: colors.onSurfaceVariant,
  },
  dateInfoButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  dateInfoButtonText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    color: colors.primaryContainer,
  },
  dateInfoSchedule: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLowest,
    overflow: 'hidden',
  },
  dateInfoLeftBorder: {
    width: 3,
    backgroundColor: colors.primaryContainer,
  },
  dateInfoContent: {
    padding: spacing.md,
    gap: 2,
  },
  dateInfoName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.onSurface,
  },
  dateInfoDates: {
    fontSize: fontSize.xs,
    color: colors.onSurfaceVariant,
    fontVariant: ['tabular-nums'],
  },
  listSection: {
    paddingTop: spacing.sm,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryContainer,
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.primaryContainer,
  },
});
