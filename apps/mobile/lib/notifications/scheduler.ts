import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
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

// Map day names to Date day indices (0 = Sunday)
const DAY_INDEX: Record<DayOfWeek, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
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
  // Try to extract time from timing string
  // Common patterns: "Morning", "With breakfast", "8:00 AM", "08:00"
  const timeMatch = timing.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const period = timeMatch[3]?.toUpperCase();

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  // Map common timing words to approximate times
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

/**
 * Schedule notifications for a protocol based on user preferences
 */
export async function scheduleProtocolNotifications(
  protocol: DailyProtocol,
  preferences: NotificationPreferences,
  protocolId: string,
  daysAhead: number = 7
): Promise<number> {
  // Cancel all existing scheduled notifications
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!preferences.enabled) {
    return 0;
  }

  let scheduledCount = 0;
  const now = new Date();

  for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
    const date = addDays(now, dayOffset);
    const dateStr = formatDate(date);
    const dayOfWeek = getDayOfWeek(date);

    // Find applicable schedule variant for this day
    const scheduleVariant = protocol.schedules.find(s => s.days.includes(dayOfWeek));
    if (!scheduleVariant) continue;

    // Schedule wake time notification
    if (preferences.categories.schedule.enabled && preferences.categories.schedule.wakeTime) {
      const wakeTime = combineDateAndTime(date, scheduleVariant.wake_time);
      if (wakeTime > now) {
        await scheduleNotification({
          title: 'Good morning!',
          body: `Time to start your day`,
          trigger: wakeTime,
          data: {
            type: 'schedule_block',
            activityIndex: -1, // Special index for wake time
            activityName: 'Wake up',
            protocolId,
            scheduledDate: dateStr,
            scheduledTime: scheduleVariant.wake_time,
          },
        });
        scheduledCount++;
      }
    }

    // Schedule activity block notifications
    if (preferences.categories.schedule.enabled && preferences.categories.schedule.activityBlocks) {
      for (let i = 0; i < scheduleVariant.schedule.length; i++) {
        const block = scheduleVariant.schedule[i];
        const blockTime = combineDateAndTime(date, block.start_time);

        if (blockTime > now) {
          await scheduleNotification({
            title: block.activity,
            body: `${block.start_time} – ${block.end_time}`,
            trigger: blockTime,
            data: {
              type: 'schedule_block',
              activityIndex: i,
              activityName: block.activity,
              protocolId,
              scheduledDate: dateStr,
              scheduledTime: block.start_time,
            },
          });
          scheduledCount++;
        }
      }
    }

    // Schedule sleep time notification
    if (preferences.categories.schedule.enabled && preferences.categories.schedule.sleepTime) {
      const sleepTime = combineDateAndTime(date, scheduleVariant.sleep_time);
      if (sleepTime > now) {
        await scheduleNotification({
          title: 'Time to wind down',
          body: `Prepare for sleep at ${scheduleVariant.sleep_time}`,
          trigger: sleepTime,
          data: {
            type: 'schedule_block',
            activityIndex: -2, // Special index for sleep time
            activityName: 'Sleep',
            protocolId,
            scheduledDate: dateStr,
            scheduledTime: scheduleVariant.sleep_time,
          },
        });
        scheduledCount++;
      }
    }

    // Schedule meal notifications
    if (preferences.categories.meals.enabled) {
      for (let i = 0; i < protocol.diet.meals.length; i++) {
        const meal = protocol.diet.meals[i];
        const mealTime = combineDateAndTime(date, meal.time);

        if (mealTime > now) {
          await scheduleNotification({
            title: meal.name,
            body: `${meal.calories} cal · P ${meal.protein_g}g C ${meal.carbs_g}g F ${meal.fat_g}g`,
            trigger: mealTime,
            data: {
              type: 'meal',
              activityIndex: i,
              activityName: meal.name,
              protocolId,
              scheduledDate: dateStr,
              scheduledTime: meal.time,
            },
          });
          scheduledCount++;
        }
      }
    }

    // Schedule supplement notifications
    if (preferences.categories.supplements.enabled) {
      for (let i = 0; i < protocol.supplementation.supplements.length; i++) {
        const supp = protocol.supplementation.supplements[i];
        const suppTime = parseSupplementTiming(supp.timing);

        if (suppTime) {
          const suppDateTime = combineDateAndTime(date, suppTime);

          if (suppDateTime > now) {
            await scheduleNotification({
              title: supp.name,
              body: `${supp.dosage_amount} ${supp.dosage_unit} - ${supp.timing}`,
              trigger: suppDateTime,
              data: {
                type: 'supplement',
                activityIndex: i,
                activityName: supp.name,
                protocolId,
                scheduledDate: dateStr,
                scheduledTime: suppTime,
              },
            });
            scheduledCount++;
          }
        }
      }
    }

    // Schedule workout notifications
    if (preferences.categories.workouts.enabled) {
      const todayWorkout = protocol.training.workouts.find(w => {
        const workoutDay = w.day.toLowerCase();
        return workoutDay === dayOfWeek ||
          workoutDay === dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);
      });

      if (todayWorkout) {
        // Schedule workout reminder for 9 AM by default
        const workoutTime = combineDateAndTime(date, '09:00');

        if (workoutTime > now) {
          await scheduleNotification({
            title: `Workout: ${todayWorkout.name}`,
            body: `${todayWorkout.duration_min} min · ${todayWorkout.exercises.length} exercises`,
            trigger: workoutTime,
            data: {
              type: 'workout',
              activityIndex: 0,
              activityName: todayWorkout.name,
              protocolId,
              scheduledDate: dateStr,
              scheduledTime: '09:00',
            },
          });
          scheduledCount++;
        }
      }
    }

    // Schedule hydration reminders
    if (preferences.categories.hydration.enabled) {
      const intervalMinutes = preferences.categories.hydration.intervalMinutes;
      const startHour = 8; // Start reminders at 8 AM
      const endHour = 21; // End reminders at 9 PM

      for (let hour = startHour; hour <= endHour; hour++) {
        for (let minute = 0; minute < 60; minute += intervalMinutes) {
          if (hour === startHour && minute === 0) continue; // Skip first one

          const hydrationTime = new Date(date);
          hydrationTime.setHours(hour, minute, 0, 0);

          if (hydrationTime > now) {
            await scheduleNotification({
              title: 'Hydration reminder',
              body: `Don't forget to drink water`,
              trigger: hydrationTime,
              data: {
                type: 'hydration',
                activityIndex: 0,
                activityName: 'Hydration',
                protocolId,
                scheduledDate: dateStr,
                scheduledTime: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
              },
            });
            scheduledCount++;
          }
        }
      }
    }
  }

  return scheduledCount;
}

interface ScheduleNotificationParams {
  title: string;
  body: string;
  trigger: Date;
  data: NotificationData;
}

async function scheduleNotification({ title, body, trigger, data }: ScheduleNotificationParams): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
      categoryIdentifier: 'protocol_activity',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: trigger,
    },
  });
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
