export type NotificationCategory =
  | 'schedule'
  | 'meals'
  | 'supplements'
  | 'workouts'
  | 'hydration';

export type ScheduleNotificationPreferences = {
  enabled: boolean;
  wakeTime: boolean;
  sleepTime: boolean;
  activityBlocks: boolean;
};

export type HydrationNotificationPreferences = {
  enabled: boolean;
  intervalMinutes: number;
};

export type NotificationPreferences = {
  enabled: boolean;
  categories: {
    schedule: ScheduleNotificationPreferences;
    meals: { enabled: boolean };
    supplements: { enabled: boolean };
    workouts: { enabled: boolean };
    hydration: HydrationNotificationPreferences;
  };
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  categories: {
    schedule: {
      enabled: true,
      wakeTime: true,
      sleepTime: true,
      activityBlocks: false,
    },
    meals: { enabled: true },
    supplements: { enabled: true },
    workouts: { enabled: true },
    hydration: {
      enabled: false,
      intervalMinutes: 60,
    },
  },
};
