import type {
  DailyProtocol,
  ScheduleVariant,
  OtherEvent,
  Meal,
  Supplement,
  Workout,
  DayOfWeek,
} from '../schemas/protocol';

export type ScheduleEventSource = 'meal' | 'supplement' | 'workout' | 'other';

export interface ScheduleEvent {
  start_time: string;
  end_time: string;
  activity: string;
  source: ScheduleEventSource;
  sourceIndex: number;
  requirement_satisfied?: string | null;
}

// Default durations for computed events (in minutes)
const MEAL_DURATION_MIN = 30;
const SUPPLEMENT_DURATION_MIN = 5;

/**
 * Add minutes to a time string in HH:MM format.
 */
function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

/**
 * Convert time string to minutes for sorting.
 */
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Compute schedule events for a specific day from protocol data.
 * Aggregates meals, supplements, workouts, and other events.
 */
export function computeScheduleEvents(
  protocol: DailyProtocol,
  day: DayOfWeek
): ScheduleEvent[] {
  const events: ScheduleEvent[] = [];

  // Find the schedule variant for this day
  const variant = protocol.schedules.find((v) => v.days.includes(day));
  if (!variant) return events;

  // Add meals
  protocol.diet.meals.forEach((meal, index) => {
    events.push({
      start_time: meal.time,
      end_time: addMinutes(meal.time, MEAL_DURATION_MIN),
      activity: meal.name,
      source: 'meal',
      sourceIndex: index,
    });
  });

  // Add supplements
  protocol.supplementation.supplements.forEach((supplement, index) => {
    events.push({
      start_time: supplement.time,
      end_time: addMinutes(supplement.time, SUPPLEMENT_DURATION_MIN),
      activity: supplement.name,
      source: 'supplement',
      sourceIndex: index,
    });
  });

  // Add workouts (only those scheduled for this day)
  protocol.training.workouts.forEach((workout, index) => {
    const workoutDay = workout.day.toLowerCase();
    if (workoutDay === day || workoutDay.startsWith(day.slice(0, 3))) {
      events.push({
        start_time: workout.time,
        end_time: addMinutes(workout.time, workout.duration_min),
        activity: workout.name,
        source: 'workout',
        sourceIndex: index,
      });
    }
  });

  // Add other events from this variant
  variant.other_events.forEach((event, index) => {
    events.push({
      start_time: event.start_time,
      end_time: event.end_time,
      activity: event.activity,
      source: 'other',
      sourceIndex: index,
      requirement_satisfied: event.requirement_satisfied,
    });
  });

  // Sort by start time
  return events.sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));
}

/**
 * Get the schedule variant for a specific day.
 */
export function getVariantForDay(
  schedules: ScheduleVariant[],
  day: DayOfWeek
): ScheduleVariant | undefined {
  return schedules.find((v) => v.days.includes(day));
}

/**
 * Get the variant index for a specific day.
 */
export function getVariantIndexForDay(
  schedules: ScheduleVariant[],
  day: DayOfWeek
): number {
  return schedules.findIndex((v) => v.days.includes(day));
}

/**
 * Update a meal's time in the protocol.
 */
export function updateMealTime(
  protocol: DailyProtocol,
  mealIndex: number,
  newTime: string
): DailyProtocol {
  const newMeals = [...protocol.diet.meals];
  if (newMeals[mealIndex]) {
    newMeals[mealIndex] = { ...newMeals[mealIndex], time: newTime };
  }
  return {
    ...protocol,
    diet: { ...protocol.diet, meals: newMeals },
  };
}

/**
 * Update a supplement's time in the protocol.
 */
export function updateSupplementTime(
  protocol: DailyProtocol,
  supplementIndex: number,
  newTime: string
): DailyProtocol {
  const newSupplements = [...protocol.supplementation.supplements];
  if (newSupplements[supplementIndex]) {
    newSupplements[supplementIndex] = { ...newSupplements[supplementIndex], time: newTime };
  }
  return {
    ...protocol,
    supplementation: { ...protocol.supplementation, supplements: newSupplements },
  };
}

/**
 * Update a workout's time in the protocol.
 */
export function updateWorkoutTime(
  protocol: DailyProtocol,
  workoutIndex: number,
  newTime: string
): DailyProtocol {
  const newWorkouts = [...protocol.training.workouts];
  if (newWorkouts[workoutIndex]) {
    newWorkouts[workoutIndex] = { ...newWorkouts[workoutIndex], time: newTime };
  }
  return {
    ...protocol,
    training: { ...protocol.training, workouts: newWorkouts },
  };
}

/**
 * Update an other event in a schedule variant.
 */
export function updateOtherEvent(
  protocol: DailyProtocol,
  variantIndex: number,
  eventIndex: number,
  updates: Partial<OtherEvent>
): DailyProtocol {
  const newSchedules = [...protocol.schedules];
  const variant = newSchedules[variantIndex];
  if (variant) {
    const newOtherEvents = [...variant.other_events];
    if (newOtherEvents[eventIndex]) {
      newOtherEvents[eventIndex] = { ...newOtherEvents[eventIndex], ...updates };
    }
    newSchedules[variantIndex] = { ...variant, other_events: newOtherEvents };
  }
  return {
    ...protocol,
    schedules: newSchedules,
  };
}

/**
 * Delete a meal from the protocol.
 */
export function deleteMeal(protocol: DailyProtocol, mealIndex: number): DailyProtocol {
  const newMeals = protocol.diet.meals.filter((_, i) => i !== mealIndex);
  return {
    ...protocol,
    diet: { ...protocol.diet, meals: newMeals },
  };
}

/**
 * Delete a supplement from the protocol.
 */
export function deleteSupplement(protocol: DailyProtocol, supplementIndex: number): DailyProtocol {
  const newSupplements = protocol.supplementation.supplements.filter((_, i) => i !== supplementIndex);
  return {
    ...protocol,
    supplementation: { ...protocol.supplementation, supplements: newSupplements },
  };
}

/**
 * Delete a workout from the protocol.
 */
export function deleteWorkout(protocol: DailyProtocol, workoutIndex: number): DailyProtocol {
  const newWorkouts = protocol.training.workouts.filter((_, i) => i !== workoutIndex);
  return {
    ...protocol,
    training: {
      ...protocol.training,
      workouts: newWorkouts,
      days_per_week: newWorkouts.length,
    },
  };
}

/**
 * Delete an other event from a schedule variant.
 */
export function deleteOtherEvent(
  protocol: DailyProtocol,
  variantIndex: number,
  eventIndex: number
): DailyProtocol {
  const newSchedules = [...protocol.schedules];
  const variant = newSchedules[variantIndex];
  if (variant) {
    const newOtherEvents = variant.other_events.filter((_, i) => i !== eventIndex);
    newSchedules[variantIndex] = { ...variant, other_events: newOtherEvents };
  }
  return {
    ...protocol,
    schedules: newSchedules,
  };
}

/**
 * Add an other event to a schedule variant.
 */
export function addOtherEvent(
  protocol: DailyProtocol,
  variantIndex: number,
  event: OtherEvent
): DailyProtocol {
  const newSchedules = [...protocol.schedules];
  const variant = newSchedules[variantIndex];
  if (variant) {
    newSchedules[variantIndex] = {
      ...variant,
      other_events: [...variant.other_events, event],
    };
  }
  return {
    ...protocol,
    schedules: newSchedules,
  };
}

/**
 * Delete an event from the protocol by its source type and index.
 */
export function deleteScheduleEvent(
  protocol: DailyProtocol,
  event: ScheduleEvent,
  variantIndex: number
): DailyProtocol {
  switch (event.source) {
    case 'meal':
      return deleteMeal(protocol, event.sourceIndex);
    case 'supplement':
      return deleteSupplement(protocol, event.sourceIndex);
    case 'workout':
      return deleteWorkout(protocol, event.sourceIndex);
    case 'other':
      return deleteOtherEvent(protocol, variantIndex, event.sourceIndex);
  }
}

/**
 * Update an event's time in the protocol by its source type and index.
 */
export function updateScheduleEventTime(
  protocol: DailyProtocol,
  event: ScheduleEvent,
  variantIndex: number,
  newStartTime: string,
  newEndTime?: string
): DailyProtocol {
  switch (event.source) {
    case 'meal':
      return updateMealTime(protocol, event.sourceIndex, newStartTime);
    case 'supplement':
      return updateSupplementTime(protocol, event.sourceIndex, newStartTime);
    case 'workout':
      return updateWorkoutTime(protocol, event.sourceIndex, newStartTime);
    case 'other':
      return updateOtherEvent(protocol, variantIndex, event.sourceIndex, {
        start_time: newStartTime,
        ...(newEndTime && { end_time: newEndTime }),
      });
  }
}
