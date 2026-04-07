import * as Notifications from 'expo-notifications';
import type { DailyProtocol, DayOfWeek } from '@protocol/shared/schemas';
import type { NotificationPreferences } from '@/lib/types/notifications';

export interface NotificationData {
  type: 'schedule_block' | 'meal' | 'supplement' | 'workout' | 'hydration';
  activityIndex: number;
  activityName: string;
  protocolId: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime?: string; // HH:MM
}

export interface ScheduleResult {
  scheduled: number;
  total: number;
  permissionDenied?: boolean;
}

// iOS caps pending local notifications at 64. Reserve buffer for snooze-created notifications.
const MAX_NOTIFICATIONS = 58;

// Priority weights by category (higher = more important)
const CATEGORY_PRIORITY: Record<NotificationData['type'], number> = {
  meal: 50,
  supplement: 40,
  workout: 35,
  schedule_block: 20,
  hydration: 10,
};

// Priority weights by day proximity (higher = more important)
function getDayPriority(dayOffset: number): number {
  if (dayOffset === 0) return 100;
  if (dayOffset === 1) return 80;
  if (dayOffset === 2) return 60;
  return Math.max(20, 40 - (dayOffset - 3) * 10);
}

type NotificationCandidate = {
  title: string;
  body: string;
  triggerDate: Date;
  data: NotificationData;
  priority: number;
};

function getDayOfWeek(date: Date): DayOfWeek {
  const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
}

function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return combined;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function parseSupplementTiming(timing: string): string | null {
  const timeMatch = timing.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const period = timeMatch[3]?.toUpperCase();

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  const timingLower = timing.toLowerCase();
  if (timingLower.includes('morning') || timingLower.includes('breakfast') || timingLower.includes('wake')) {
    return '07:00';
  }
  if (timingLower.includes('noon') || timingLower.includes('lunch')) {
    return '12:00';
  }
  if (timingLower.includes('afternoon')) {
    return '15:00';
  }
  if (timingLower.includes('dinner') || timingLower.includes('evening')) {
    return '18:00';
  }
  if (timingLower.includes('night') || timingLower.includes('bed') || timingLower.includes('sleep')) {
    return '21:00';
  }

  return null;
}

// Module-level mutex to prevent concurrent scheduling from racing renders
let schedulingInProgress = false;

/**
 * Schedule notifications for a protocol based on user preferences.
 * Collects all candidate notifications, prioritizes them, and schedules
 * up to MAX_NOTIFICATIONS (58) to stay within the iOS 64-notification limit.
 */
export async function scheduleProtocolNotifications(
  protocol: DailyProtocol,
  preferences: NotificationPreferences,
  protocolId: string,
  daysAhead: number = 3
): Promise<ScheduleResult> {
  // Prevent concurrent execution — if already scheduling, skip silently
  if (schedulingInProgress) {
    return { scheduled: 0, total: 0 };
  }
  schedulingInProgress = true;
  try {
    return await scheduleProtocolNotificationsImpl(protocol, preferences, protocolId, daysAhead);
  } finally {
    schedulingInProgress = false;
  }
}

async function scheduleProtocolNotificationsImpl(
  protocol: DailyProtocol,
  preferences: NotificationPreferences,
  protocolId: string,
  daysAhead: number
): Promise<ScheduleResult> {
  // Verify OS-level permission first
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    return { scheduled: 0, total: 0, permissionDenied: true };
  }

  // Cancel all existing scheduled notifications
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!preferences.enabled) {
    return { scheduled: 0, total: 0 };
  }

  const candidates: NotificationCandidate[] = [];
  const now = new Date();

  for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
    const date = addDays(now, dayOffset);
    const dateStr = formatDate(date);
    const dayOfWeek = getDayOfWeek(date);
    const dayPriority = getDayPriority(dayOffset);

    // Find applicable schedule variant for this day (only needed for schedule-block notifications)
    const scheduleVariant = protocol.schedules.find(s => s.days.includes(dayOfWeek));

    // Collect wake time notification (requires schedule variant)
    if (scheduleVariant && preferences.categories.schedule.enabled && preferences.categories.schedule.wakeTime) {
      const wakeTime = combineDateAndTime(date, scheduleVariant.wake_time);
      if (wakeTime > now) {
        candidates.push({
          title: 'Good morning!',
          body: 'Time to start your day',
          triggerDate: wakeTime,
          data: {
            type: 'schedule_block',
            activityIndex: -1,
            activityName: 'Wake up',
            protocolId,
            scheduledDate: dateStr,
            scheduledTime: scheduleVariant.wake_time,
          },
          priority: dayPriority + CATEGORY_PRIORITY.schedule_block,
        });
      }
    }

    // Collect activity block notifications (requires schedule variant)
    if (scheduleVariant && preferences.categories.schedule.enabled && preferences.categories.schedule.activityBlocks) {
      for (let i = 0; i < (scheduleVariant.other_events || []).length; i++) {
        const event = scheduleVariant.other_events[i];
        const eventTime = combineDateAndTime(date, event.start_time);

        if (eventTime > now) {
          candidates.push({
            title: event.activity,
            body: `${event.start_time} – ${event.end_time}`,
            triggerDate: eventTime,
            data: {
              type: 'schedule_block',
              activityIndex: i,
              activityName: event.activity,
              protocolId,
              scheduledDate: dateStr,
              scheduledTime: event.start_time,
            },
            priority: dayPriority + CATEGORY_PRIORITY.schedule_block,
          });
        }
      }
    }

    // Collect sleep time notification (requires schedule variant)
    if (scheduleVariant && preferences.categories.schedule.enabled && preferences.categories.schedule.sleepTime) {
      const sleepTime = combineDateAndTime(date, scheduleVariant.sleep_time);
      if (sleepTime > now) {
        candidates.push({
          title: 'Time to wind down',
          body: `Prepare for sleep at ${scheduleVariant.sleep_time}`,
          triggerDate: sleepTime,
          data: {
            type: 'schedule_block',
            activityIndex: -2,
            activityName: 'Sleep',
            protocolId,
            scheduledDate: dateStr,
            scheduledTime: scheduleVariant.sleep_time,
          },
          priority: dayPriority + CATEGORY_PRIORITY.schedule_block,
        });
      }
    }

    // Collect meal notifications
    if (preferences.categories.meals.enabled) {
      for (let i = 0; i < protocol.diet.meals.length; i++) {
        const meal = protocol.diet.meals[i];
        const mealTime = combineDateAndTime(date, meal.time);

        if (mealTime > now) {
          candidates.push({
            title: meal.name,
            body: `${meal.calories} cal · P ${meal.protein_g}g C ${meal.carbs_g}g F ${meal.fat_g}g`,
            triggerDate: mealTime,
            data: {
              type: 'meal',
              activityIndex: i,
              activityName: meal.name,
              protocolId,
              scheduledDate: dateStr,
              scheduledTime: meal.time,
            },
            priority: dayPriority + CATEGORY_PRIORITY.meal,
          });
        }
      }
    }

    // Collect supplement notifications — use schema `time` field, fall back to fuzzy parsing
    if (preferences.categories.supplements.enabled) {
      for (let i = 0; i < protocol.supplementation.supplements.length; i++) {
        const supp = protocol.supplementation.supplements[i];
        const suppTime = supp.time || parseSupplementTiming(supp.timing);

        if (suppTime) {
          const suppDateTime = combineDateAndTime(date, suppTime);

          if (suppDateTime > now) {
            candidates.push({
              title: supp.name,
              body: `${supp.dosage_amount} ${supp.dosage_unit} - ${supp.timing}`,
              triggerDate: suppDateTime,
              data: {
                type: 'supplement',
                activityIndex: i,
                activityName: supp.name,
                protocolId,
                scheduledDate: dateStr,
                scheduledTime: suppTime,
              },
              priority: dayPriority + CATEGORY_PRIORITY.supplement,
            });
          }
        }
      }
    }

    // Collect workout notifications — use schema `time` field instead of hardcoded 09:00
    if (preferences.categories.workouts.enabled) {
      const todayWorkout = protocol.training.workouts.find(w => {
        const workoutDay = w.day.toLowerCase();
        return workoutDay === dayOfWeek ||
          workoutDay === dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);
      });

      if (todayWorkout) {
        const workoutTimeStr = todayWorkout.time || '09:00';
        const workoutTime = combineDateAndTime(date, workoutTimeStr);

        if (workoutTime > now) {
          candidates.push({
            title: `Workout: ${todayWorkout.name}`,
            body: `${todayWorkout.duration_min} min · ${todayWorkout.exercises.length} exercises`,
            triggerDate: workoutTime,
            data: {
              type: 'workout',
              activityIndex: 0,
              activityName: todayWorkout.name,
              protocolId,
              scheduledDate: dateStr,
              scheduledTime: workoutTimeStr,
            },
            priority: dayPriority + CATEGORY_PRIORITY.workout,
          });
        }
      }
    }

    // Collect hydration reminders
    if (preferences.categories.hydration.enabled) {
      const intervalMinutes = preferences.categories.hydration.intervalMinutes;
      const startHour = 8;
      const endHour = 21;

      for (let hour = startHour; hour <= endHour; hour++) {
        for (let minute = 0; minute < 60; minute += intervalMinutes) {
          if (hour === startHour && minute === 0) continue;

          const hydrationTime = new Date(date);
          hydrationTime.setHours(hour, minute, 0, 0);

          if (hydrationTime > now) {
            candidates.push({
              title: 'Hydration reminder',
              body: "Don't forget to drink water",
              triggerDate: hydrationTime,
              data: {
                type: 'hydration',
                activityIndex: 0,
                activityName: 'Hydration',
                protocolId,
                scheduledDate: dateStr,
                scheduledTime: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
              },
              priority: dayPriority + CATEGORY_PRIORITY.hydration,
            });
          }
        }
      }
    }
  }

  // Sort by priority descending, then by trigger date ascending as tiebreaker
  candidates.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.triggerDate.getTime() - b.triggerDate.getTime();
  });

  // Budget enforcement: schedule only the top MAX_NOTIFICATIONS candidates
  const toSchedule = candidates.slice(0, MAX_NOTIFICATIONS);

  for (const candidate of toSchedule) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: candidate.title,
        body: candidate.body,
        data: candidate.data as unknown as Record<string, unknown>,
        sound: true,
        categoryIdentifier: 'protocol_activity',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: candidate.triggerDate,
      },
    });
  }

  return { scheduled: toSchedule.length, total: candidates.length };
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get count of currently scheduled notifications
 */
export async function getScheduledNotificationCount(): Promise<number> {
  const notifications = await Notifications.getAllScheduledNotificationsAsync();
  return notifications.length;
}
