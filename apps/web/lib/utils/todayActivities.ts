import type { DailyProtocol, DayOfWeek } from '@protocol/shared/schemas/protocol';

export type ActivityType = 'schedule_block' | 'meal' | 'supplement' | 'workout' | 'hydration';

export interface TodayActivity {
  type: ActivityType;
  index: number;
  name: string;
  time?: string;
  details?: string;
}

function getTodayDayOfWeek(): DayOfWeek {
  const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
}

export function getTodayActivities(protocol: DailyProtocol): {
  scheduleBlocks: TodayActivity[];
  meals: TodayActivity[];
  supplements: TodayActivity[];
  workouts: TodayActivity[];
  hydrationTarget: number;
} {
  const today = getTodayDayOfWeek();

  // Find today's schedule variant
  const todaySchedule = protocol.schedules.find((s) => s.days.includes(today)) ?? protocol.schedules[0];

  // Schedule blocks (other_events + routine_events)
  const scheduleBlocks: TodayActivity[] = [];
  if (todaySchedule) {
    todaySchedule.other_events.forEach((event, i) => {
      scheduleBlocks.push({
        type: 'schedule_block',
        index: i,
        name: event.activity,
        time: event.start_time,
        details: `${event.start_time} – ${event.end_time}`,
      });
    });
    todaySchedule.routine_events?.forEach((routine, i) => {
      scheduleBlocks.push({
        type: 'schedule_block',
        index: todaySchedule.other_events.length + i,
        name: routine.name,
        time: routine.start_time,
        details: `${routine.sub_events.length} activities`,
      });
    });
  }

  // Meals
  const meals: TodayActivity[] = protocol.diet.meals.map((meal, i) => ({
    type: 'meal' as const,
    index: i,
    name: meal.name,
    time: meal.time,
    details: `P ${meal.protein_g}g · C ${meal.carbs_g}g · F ${meal.fat_g}g`,
  }));

  // Supplements
  const supplements: TodayActivity[] = protocol.supplementation.supplements.map((supp, i) => ({
    type: 'supplement' as const,
    index: i,
    name: supp.name,
    time: supp.time,
    details: `${supp.dosage_amount} ${supp.dosage_unit}`,
  }));

  // Workouts for today
  const todayName = today.charAt(0).toUpperCase() + today.slice(1);
  const workouts: TodayActivity[] = protocol.training.workouts
    .filter((w) => w.day.toLowerCase() === today || w.day === todayName)
    .map((workout, i) => ({
      type: 'workout' as const,
      index: i,
      name: workout.name,
      time: workout.time,
      details: `${workout.duration_min} min · ${workout.exercises.length} exercises`,
    }));

  return {
    scheduleBlocks,
    meals,
    supplements,
    workouts,
    hydrationTarget: protocol.diet.hydration_oz,
  };
}
