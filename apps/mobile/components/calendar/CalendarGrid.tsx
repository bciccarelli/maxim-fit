import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { colors, spacing, fontSize } from '@/lib/theme';
import type { ProtocolSchedule } from '@/contexts/ScheduleContext';

interface CalendarGridProps {
  year: number;
  month: number; // 0-indexed
  schedules: ProtocolSchedule[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function dateInRange(date: string, start: string, end: string | null): boolean {
  if (date < start) return false;
  if (end === null) return true;
  return date <= end;
}

// Assign deterministic colors to schedules for visual differentiation
const SCHEDULE_COLORS = [
  colors.primaryContainer,
  colors.info,
  colors.warning,
  colors.secondary,
  colors.success,
];

export function CalendarGrid({
  year,
  month,
  schedules,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: CalendarGridProps) {
  const today = new Date().toISOString().split('T')[0];

  // Build calendar grid
  const weeks = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result: (number | null)[][] = [];
    let week: (number | null)[] = [];

    // Fill leading blanks
    for (let i = 0; i < firstDay; i++) {
      week.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      week.push(day);
      if (week.length === 7) {
        result.push(week);
        week = [];
      }
    }

    // Fill trailing blanks
    if (week.length > 0) {
      while (week.length < 7) {
        week.push(null);
      }
      result.push(week);
    }

    return result;
  }, [year, month]);

  // Map schedule index for coloring
  const scheduleColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    schedules.forEach((s, i) => {
      map[s.id] = SCHEDULE_COLORS[i % SCHEDULE_COLORS.length];
    });
    return map;
  }, [schedules]);

  const getScheduleForDay = (day: number): ProtocolSchedule | null => {
    const dateStr = formatDate(year, month, day);
    return schedules.find(s => dateInRange(dateStr, s.start_date, s.end_date)) ?? null;
  };

  // Check if a day is at the start, middle, or end of a schedule range
  const getPositionInRange = (day: number, schedule: ProtocolSchedule) => {
    const dateStr = formatDate(year, month, day);
    const isStart = dateStr === schedule.start_date;
    const isEnd = schedule.end_date !== null && dateStr === schedule.end_date;
    return { isStart, isEnd, isMid: !isStart && !isEnd };
  };

  return (
    <View style={styles.container}>
      {/* Month navigation header */}
      <View style={styles.header}>
        <Pressable onPress={onPrevMonth} style={styles.navButton}>
          <ChevronLeft size={20} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.monthTitle}>
          {MONTH_NAMES[month]} <Text style={styles.yearText}>{year}</Text>
        </Text>
        <Pressable onPress={onNextMonth} style={styles.navButton}>
          <ChevronRight size={20} color={colors.onSurface} />
        </Pressable>
      </View>

      {/* Day of week labels */}
      <View style={styles.weekRow}>
        {DAY_LABELS.map((label, i) => (
          <View key={i} style={styles.dayLabelCell}>
            <Text style={styles.dayLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((day, di) => {
            if (day === null) {
              return <View key={di} style={styles.dayCell} />;
            }

            const dateStr = formatDate(year, month, day);
            const isToday = dateStr === today;
            const isSelected = dateStr === selectedDate;
            const schedule = getScheduleForDay(day);
            const scheduleColor = schedule ? scheduleColorMap[schedule.id] : null;

            return (
              <Pressable
                key={di}
                style={styles.dayCell}
                onPress={() => onSelectDate(dateStr)}
              >
                {/* Schedule range background bar */}
                {schedule && scheduleColor && (
                  <View
                    style={[
                      styles.rangeBar,
                      { backgroundColor: scheduleColor + '20' },
                      getPositionInRange(day, schedule).isStart && styles.rangeBarStart,
                      getPositionInRange(day, schedule).isEnd && styles.rangeBarEnd,
                    ]}
                  />
                )}

                <View
                  style={[
                    styles.dayContent,
                    isToday && styles.dayToday,
                    isSelected && styles.daySelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isToday && styles.dayTextToday,
                      isSelected && styles.dayTextSelected,
                    ]}
                  >
                    {day}
                  </Text>
                </View>

                {/* Schedule dot indicator */}
                {schedule && scheduleColor && (
                  <View style={[styles.dot, { backgroundColor: scheduleColor }]} />
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const CELL_SIZE = 44;

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceContainerLowest,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  navButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.onSurface,
  },
  yearText: {
    fontVariant: ['tabular-nums'],
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayLabelCell: {
    flex: 1,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabel: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  dayCell: {
    flex: 1,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayContent: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  dayToday: {
    borderLeftWidth: 2,
    borderLeftColor: colors.primaryContainer,
  },
  daySelected: {
    backgroundColor: colors.primaryContainer,
  },
  dayText: {
    fontSize: fontSize.sm,
    color: colors.onSurface,
    fontVariant: ['tabular-nums'],
  },
  dayTextToday: {
    fontWeight: '600',
    color: colors.primaryContainer,
  },
  dayTextSelected: {
    color: colors.onPrimary,
    fontWeight: '600',
  },
  rangeBar: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    left: 0,
    right: 0,
  },
  rangeBarStart: {
    left: 22,
  },
  rangeBarEnd: {
    right: 22,
  },
  dot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    zIndex: 1,
  },
});
