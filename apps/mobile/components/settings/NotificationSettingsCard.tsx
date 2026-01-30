import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import {
  Bell,
  Clock,
  Utensils,
  Pill,
  Dumbbell,
  Droplets,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { NotificationToggleRow } from './NotificationToggleRow';

const HYDRATION_INTERVALS = [30, 60, 90, 120];

export function NotificationSettingsCard() {
  const { preferences, isLoading, updatePreferences, updateCategory } =
    useNotificationPreferences();
  const [scheduleExpanded, setScheduleExpanded] = useState(false);
  const [hydrationExpanded, setHydrationExpanded] = useState(false);

  if (isLoading || !preferences) {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Bell size={20} color="#2d5a2d" />
          <Text style={styles.cardTitle}>Notifications</Text>
        </View>
        <ActivityIndicator size="small" color="#2d5a2d" />
      </View>
    );
  }

  const masterDisabled = !preferences.enabled;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Bell size={20} color="#2d5a2d" />
        <Text style={styles.cardTitle}>Notifications</Text>
      </View>

      {/* Master Toggle */}
      <NotificationToggleRow
        label="Enable Notifications"
        value={preferences.enabled}
        onChange={(enabled) => updatePreferences({ enabled })}
      />

      <View style={styles.divider} />

      {/* Schedule */}
      <View style={[styles.category, masterDisabled && styles.categoryDisabled]}>
        <Pressable
          style={styles.categoryHeader}
          onPress={() => setScheduleExpanded(!scheduleExpanded)}
          disabled={masterDisabled}
        >
          <View style={styles.categoryLeft}>
            <Clock size={16} color={masterDisabled ? '#999' : '#666'} />
            <Text style={[styles.categoryLabel, masterDisabled && styles.categoryLabelDisabled]}>
              Schedule
            </Text>
            {scheduleExpanded ? (
              <ChevronUp size={16} color={masterDisabled ? '#999' : '#666'} />
            ) : (
              <ChevronDown size={16} color={masterDisabled ? '#999' : '#666'} />
            )}
          </View>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              updateCategory('schedule', { enabled: !preferences.categories.schedule.enabled });
            }}
            disabled={masterDisabled}
          >
            <View
              style={[
                styles.toggleTrack,
                preferences.categories.schedule.enabled && !masterDisabled && styles.toggleTrackActive,
                masterDisabled && styles.toggleTrackDisabled,
              ]}
            >
              <View
                style={[
                  styles.toggleThumb,
                  preferences.categories.schedule.enabled && styles.toggleThumbActive,
                ]}
              />
            </View>
          </Pressable>
        </Pressable>

        {scheduleExpanded && !masterDisabled && (
          <View style={styles.subOptions}>
            <NotificationToggleRow
              label="Wake time reminder"
              value={preferences.categories.schedule.wakeTime}
              onChange={(v) => updateCategory('schedule', { wakeTime: v })}
              disabled={!preferences.categories.schedule.enabled}
              indent
            />
            <NotificationToggleRow
              label="Sleep time reminder"
              value={preferences.categories.schedule.sleepTime}
              onChange={(v) => updateCategory('schedule', { sleepTime: v })}
              disabled={!preferences.categories.schedule.enabled}
              indent
            />
            <NotificationToggleRow
              label="Activity reminders"
              value={preferences.categories.schedule.activityBlocks}
              onChange={(v) => updateCategory('schedule', { activityBlocks: v })}
              disabled={!preferences.categories.schedule.enabled}
              indent
            />
          </View>
        )}
      </View>

      {/* Meals */}
      <View style={[styles.category, masterDisabled && styles.categoryDisabled]}>
        <View style={styles.categoryHeader}>
          <View style={styles.categoryLeft}>
            <Utensils size={16} color={masterDisabled ? '#999' : '#666'} />
            <Text style={[styles.categoryLabel, masterDisabled && styles.categoryLabelDisabled]}>
              Meals
            </Text>
          </View>
          <Pressable
            onPress={() => updateCategory('meals', { enabled: !preferences.categories.meals.enabled })}
            disabled={masterDisabled}
          >
            <View
              style={[
                styles.toggleTrack,
                preferences.categories.meals.enabled && !masterDisabled && styles.toggleTrackActive,
                masterDisabled && styles.toggleTrackDisabled,
              ]}
            >
              <View
                style={[
                  styles.toggleThumb,
                  preferences.categories.meals.enabled && styles.toggleThumbActive,
                ]}
              />
            </View>
          </Pressable>
        </View>
      </View>

      {/* Supplements */}
      <View style={[styles.category, masterDisabled && styles.categoryDisabled]}>
        <View style={styles.categoryHeader}>
          <View style={styles.categoryLeft}>
            <Pill size={16} color={masterDisabled ? '#999' : '#666'} />
            <Text style={[styles.categoryLabel, masterDisabled && styles.categoryLabelDisabled]}>
              Supplements
            </Text>
          </View>
          <Pressable
            onPress={() =>
              updateCategory('supplements', { enabled: !preferences.categories.supplements.enabled })
            }
            disabled={masterDisabled}
          >
            <View
              style={[
                styles.toggleTrack,
                preferences.categories.supplements.enabled && !masterDisabled && styles.toggleTrackActive,
                masterDisabled && styles.toggleTrackDisabled,
              ]}
            >
              <View
                style={[
                  styles.toggleThumb,
                  preferences.categories.supplements.enabled && styles.toggleThumbActive,
                ]}
              />
            </View>
          </Pressable>
        </View>
      </View>

      {/* Workouts */}
      <View style={[styles.category, masterDisabled && styles.categoryDisabled]}>
        <View style={styles.categoryHeader}>
          <View style={styles.categoryLeft}>
            <Dumbbell size={16} color={masterDisabled ? '#999' : '#666'} />
            <Text style={[styles.categoryLabel, masterDisabled && styles.categoryLabelDisabled]}>
              Workouts
            </Text>
          </View>
          <Pressable
            onPress={() =>
              updateCategory('workouts', { enabled: !preferences.categories.workouts.enabled })
            }
            disabled={masterDisabled}
          >
            <View
              style={[
                styles.toggleTrack,
                preferences.categories.workouts.enabled && !masterDisabled && styles.toggleTrackActive,
                masterDisabled && styles.toggleTrackDisabled,
              ]}
            >
              <View
                style={[
                  styles.toggleThumb,
                  preferences.categories.workouts.enabled && styles.toggleThumbActive,
                ]}
              />
            </View>
          </Pressable>
        </View>
      </View>

      {/* Hydration */}
      <View style={[styles.category, masterDisabled && styles.categoryDisabled]}>
        <Pressable
          style={styles.categoryHeader}
          onPress={() => setHydrationExpanded(!hydrationExpanded)}
          disabled={masterDisabled}
        >
          <View style={styles.categoryLeft}>
            <Droplets size={16} color={masterDisabled ? '#999' : '#666'} />
            <Text style={[styles.categoryLabel, masterDisabled && styles.categoryLabelDisabled]}>
              Hydration
            </Text>
            {hydrationExpanded ? (
              <ChevronUp size={16} color={masterDisabled ? '#999' : '#666'} />
            ) : (
              <ChevronDown size={16} color={masterDisabled ? '#999' : '#666'} />
            )}
          </View>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              updateCategory('hydration', { enabled: !preferences.categories.hydration.enabled });
            }}
            disabled={masterDisabled}
          >
            <View
              style={[
                styles.toggleTrack,
                preferences.categories.hydration.enabled && !masterDisabled && styles.toggleTrackActive,
                masterDisabled && styles.toggleTrackDisabled,
              ]}
            >
              <View
                style={[
                  styles.toggleThumb,
                  preferences.categories.hydration.enabled && styles.toggleThumbActive,
                ]}
              />
            </View>
          </Pressable>
        </Pressable>

        {hydrationExpanded && !masterDisabled && (
          <View style={styles.subOptions}>
            <View style={styles.intervalRow}>
              <Text
                style={[
                  styles.intervalLabel,
                  !preferences.categories.hydration.enabled && styles.intervalLabelDisabled,
                ]}
              >
                Remind every
              </Text>
              <View style={styles.intervalPicker}>
                {HYDRATION_INTERVALS.map((mins) => (
                  <Pressable
                    key={mins}
                    style={[
                      styles.intervalOption,
                      preferences.categories.hydration.intervalMinutes === mins &&
                        styles.intervalOptionActive,
                    ]}
                    onPress={() => updateCategory('hydration', { intervalMinutes: mins })}
                    disabled={!preferences.categories.hydration.enabled}
                  >
                    <Text
                      style={[
                        styles.intervalOptionText,
                        preferences.categories.hydration.intervalMinutes === mins &&
                          styles.intervalOptionTextActive,
                        !preferences.categories.hydration.enabled && styles.intervalOptionTextDisabled,
                      ]}
                    >
                      {mins}m
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a2e1a',
    marginLeft: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 8,
  },
  category: {
    paddingVertical: 4,
  },
  categoryDisabled: {
    opacity: 0.6,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryLabelDisabled: {
    color: '#999',
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e5e5e5',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleTrackActive: {
    backgroundColor: '#2d5a2d',
  },
  toggleTrackDisabled: {
    backgroundColor: '#e5e5e5',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  subOptions: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 4,
  },
  intervalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 24,
  },
  intervalLabel: {
    fontSize: 14,
    color: '#1a2e1a',
  },
  intervalLabelDisabled: {
    color: '#999',
  },
  intervalPicker: {
    flexDirection: 'row',
    gap: 8,
  },
  intervalOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f5f5f0',
  },
  intervalOptionActive: {
    backgroundColor: '#e8f5e9',
  },
  intervalOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
    fontVariant: ['tabular-nums'],
  },
  intervalOptionTextActive: {
    color: '#2d5a2d',
  },
  intervalOptionTextDisabled: {
    color: '#999',
  },
});
