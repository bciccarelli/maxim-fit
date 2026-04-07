import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { Calendar, Trash2 } from 'lucide-react-native';
import { colors, spacing, fontSize, borderRadius } from '@/lib/theme';
import type { ProtocolSchedule } from '@/contexts/ScheduleContext';

interface ScheduleListProps {
  schedules: ProtocolSchedule[];
  activeScheduleId: string | null;
  onEdit: (schedule: ProtocolSchedule) => void;
  onDelete: (id: string) => void;
}

function formatDateDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(m) - 1]} ${parseInt(d)}`;
}

export function ScheduleList({ schedules, activeScheduleId, onEdit, onDelete }: ScheduleListProps) {
  if (schedules.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Calendar size={24} color={colors.onSurfaceVariant} />
        <Text style={styles.emptyTitle}>No scheduled protocols</Text>
        <Text style={styles.emptyText}>
          Schedule protocols to automatically switch between them on specific dates.
        </Text>
      </View>
    );
  }

  const handleDelete = (schedule: ProtocolSchedule) => {
    Alert.alert(
      'Remove Schedule',
      `Remove "${schedule.label || schedule.protocol_name || 'Untitled'}" from the calendar?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => onDelete(schedule.id) },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Scheduled Protocols</Text>
      {schedules.map((schedule) => {
        const isActive = schedule.id === activeScheduleId;
        return (
          <Pressable
            key={schedule.id}
            style={[styles.scheduleRow, isActive && styles.scheduleRowActive]}
            onPress={() => onEdit(schedule)}
          >
            <View style={[styles.leftBorder, isActive && styles.leftBorderActive]} />
            <View style={styles.scheduleContent}>
              <View style={styles.scheduleHeader}>
                <Text style={styles.scheduleName} numberOfLines={1}>
                  {schedule.label || schedule.protocol_name || 'Untitled Protocol'}
                </Text>
                {isActive && (
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>Active</Text>
                  </View>
                )}
              </View>
              <Text style={styles.scheduleDates}>
                {formatDateDisplay(schedule.start_date)}
                {' \u2013 '}
                {schedule.end_date ? formatDateDisplay(schedule.end_date) : 'Indefinite'}
              </Text>
              {schedule.weighted_goal_score != null && (
                <Text style={styles.scheduleScore}>
                  {schedule.weighted_goal_score.toFixed(1)} goal
                </Text>
              )}
            </View>
            <Pressable
              style={styles.deleteButton}
              onPress={() => handleDelete(schedule)}
              hitSlop={8}
            >
              <Trash2 size={16} color={colors.onSurfaceVariant} />
            </Pressable>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    marginHorizontal: spacing.md,
    overflow: 'hidden',
  },
  scheduleRowActive: {
    backgroundColor: colors.selectedBg,
  },
  leftBorder: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: colors.outlineVariant,
  },
  leftBorderActive: {
    backgroundColor: colors.primaryContainer,
  },
  scheduleContent: {
    flex: 1,
    padding: spacing.md,
    gap: 2,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  scheduleName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.onSurface,
    flex: 1,
  },
  activeBadge: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.onPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scheduleDates: {
    fontSize: fontSize.xs,
    color: colors.onSurfaceVariant,
    fontVariant: ['tabular-nums'],
  },
  scheduleScore: {
    fontSize: fontSize.xs,
    color: colors.onSurfaceVariant,
    fontVariant: ['tabular-nums'],
  },
  deleteButton: {
    padding: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.onSurface,
  },
  emptyText: {
    fontSize: fontSize.xs,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 260,
  },
});
