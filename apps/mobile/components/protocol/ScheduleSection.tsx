import { View, Text, StyleSheet } from 'react-native';
import type { ScheduleVariant } from '@protocol/shared/schemas';

type Props = {
  schedules: ScheduleVariant[];
};

export function ScheduleSection({ schedules }: Props) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Schedule</Text>

      {schedules.map((schedule, index) => (
        <View key={index} style={styles.card}>
          {schedule.label && (
            <Text style={styles.scheduleLabel}>{schedule.label}</Text>
          )}

          <View style={styles.timesRow}>
            <View style={styles.timeItem}>
              <Text style={styles.timeLabel}>Wake</Text>
              <Text style={styles.timeValue}>{schedule.wake_time}</Text>
            </View>
            <View style={styles.timeItem}>
              <Text style={styles.timeLabel}>Sleep</Text>
              <Text style={styles.timeValue}>{schedule.sleep_time}</Text>
            </View>
          </View>

          <View style={styles.daysRow}>
            {schedule.days.map((day) => (
              <View key={day} style={styles.dayBadge}>
                <Text style={styles.dayText}>{day.slice(0, 3).toUpperCase()}</Text>
              </View>
            ))}
          </View>

          <View style={styles.timeline}>
            {schedule.schedule.map((block, blockIndex) => (
              <View key={blockIndex} style={styles.timeBlock}>
                <View style={styles.timeBlockTime}>
                  <Text style={styles.blockTimeText}>
                    {block.start_time} – {block.end_time}
                  </Text>
                </View>
                <View style={styles.timeBlockContent}>
                  <Text style={styles.blockActivity}>{block.activity}</Text>
                  {block.requirement_satisfied && (
                    <Text style={styles.blockRequirement}>
                      → {block.requirement_satisfied}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#2d5a2d',
  },
  scheduleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a2e1a',
    marginBottom: 12,
  },
  timesRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 12,
  },
  timeItem: {},
  timeLabel: {
    fontSize: 11,
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a2e1a',
    fontVariant: ['tabular-nums'],
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  dayBadge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  dayText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2d5a2d',
  },
  timeline: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  timeBlock: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  timeBlockTime: {
    width: 100,
  },
  blockTimeText: {
    fontSize: 12,
    color: '#666',
    fontVariant: ['tabular-nums'],
  },
  timeBlockContent: {
    flex: 1,
  },
  blockActivity: {
    fontSize: 14,
    color: '#1a2e1a',
  },
  blockRequirement: {
    fontSize: 12,
    color: '#2d5a2d',
    marginTop: 2,
  },
});
