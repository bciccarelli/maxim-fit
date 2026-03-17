import type {
  DailyProtocol,
  Meal,
  Supplement,
  Exercise,
  Workout,
  OtherEvent,
  RoutineEvent,
} from '../schemas/protocol';
import type { ProtocolOperation, CreateOperation } from '../schemas/operations';
import { generateElementId, ELEMENT_PREFIXES } from './ids';

/**
 * Apply a list of operations to a protocol, returning a new protocol.
 * Pure function — does not mutate the input.
 */
export function applyOperations(
  protocol: DailyProtocol,
  operations: ProtocolOperation[]
): DailyProtocol {
  // Deep clone to avoid mutation
  let result: DailyProtocol = JSON.parse(JSON.stringify(protocol));

  for (const op of operations) {
    switch (op.op) {
      case 'modify':
        result = applyModify(result, op.elementId, op.elementType, op.fields);
        break;
      case 'delete':
        result = applyDelete(result, op.elementId, op.elementType);
        break;
      case 'create':
        result = applyCreate(result, op);
        break;
    }
  }

  // Re-index routine sub-event references after all operations
  reindexRoutineReferences(result);

  return result;
}

/**
 * Find an element by ID in the protocol and merge fields into it.
 */
function applyModify(
  protocol: DailyProtocol,
  elementId: string,
  elementType: string,
  fields: Record<string, unknown>
): DailyProtocol {
  switch (elementType) {
    case 'meal': {
      const meals = protocol.diet.meals.map(m =>
        m.id === elementId ? { ...m, ...fields, id: m.id } as Meal : m
      );
      return { ...protocol, diet: { ...protocol.diet, meals } };
    }
    case 'supplement': {
      const supplements = protocol.supplementation.supplements.map(s =>
        s.id === elementId ? { ...s, ...fields, id: s.id } as Supplement : s
      );
      return { ...protocol, supplementation: { ...protocol.supplementation, supplements } };
    }
    case 'exercise': {
      const workouts = protocol.training.workouts.map(w => ({
        ...w,
        exercises: w.exercises.map(e =>
          e.id === elementId ? { ...e, ...fields, id: e.id } as Exercise : e
        ),
      }));
      return { ...protocol, training: { ...protocol.training, workouts } };
    }
    case 'workout': {
      const workouts = protocol.training.workouts.map(w =>
        w.id === elementId ? { ...w, ...fields, id: w.id } as Workout : w
      );
      return { ...protocol, training: { ...protocol.training, workouts } };
    }
    case 'other_event': {
      const schedules = protocol.schedules.map(s => ({
        ...s,
        other_events: s.other_events.map(e =>
          e.id === elementId ? { ...e, ...fields, id: e.id } as OtherEvent : e
        ),
      }));
      return { ...protocol, schedules };
    }
    case 'routine_event': {
      const schedules = protocol.schedules.map(s => ({
        ...s,
        routine_events: (s.routine_events ?? []).map(r =>
          r.id === elementId ? { ...r, ...fields, id: r.id } as RoutineEvent : r
        ),
      }));
      return { ...protocol, schedules };
    }
    default:
      return protocol;
  }
}

/**
 * Remove an element by ID from the protocol.
 */
function applyDelete(
  protocol: DailyProtocol,
  elementId: string,
  elementType: string
): DailyProtocol {
  switch (elementType) {
    case 'meal': {
      const meals = protocol.diet.meals.filter(m => m.id !== elementId);
      return { ...protocol, diet: { ...protocol.diet, meals } };
    }
    case 'supplement': {
      const supplements = protocol.supplementation.supplements.filter(s => s.id !== elementId);
      return { ...protocol, supplementation: { ...protocol.supplementation, supplements } };
    }
    case 'exercise': {
      const workouts = protocol.training.workouts.map(w => ({
        ...w,
        exercises: w.exercises.filter(e => e.id !== elementId),
      }));
      return { ...protocol, training: { ...protocol.training, workouts } };
    }
    case 'workout': {
      const workouts = protocol.training.workouts.filter(w => w.id !== elementId);
      return { ...protocol, training: { ...protocol.training, workouts } };
    }
    case 'other_event': {
      const schedules = protocol.schedules.map(s => ({
        ...s,
        other_events: s.other_events.filter(e => e.id !== elementId),
      }));
      return { ...protocol, schedules };
    }
    case 'routine_event': {
      const schedules = protocol.schedules.map(s => ({
        ...s,
        routine_events: (s.routine_events ?? []).filter(r => r.id !== elementId),
      }));
      return { ...protocol, schedules };
    }
    default:
      return protocol;
  }
}

/**
 * Create a new element and add it to the protocol.
 * Assigns a server-generated ID.
 */
function applyCreate(
  protocol: DailyProtocol,
  op: CreateOperation
): DailyProtocol {
  const data = { ...op.data };

  switch (op.elementType) {
    case 'meal': {
      data.id = generateElementId(ELEMENT_PREFIXES.meal);
      const meals = [...protocol.diet.meals, data as unknown as Meal];
      return { ...protocol, diet: { ...protocol.diet, meals } };
    }
    case 'supplement': {
      data.id = generateElementId(ELEMENT_PREFIXES.supplement);
      const supplements = [...protocol.supplementation.supplements, data as unknown as Supplement];
      return { ...protocol, supplementation: { ...protocol.supplementation, supplements } };
    }
    case 'exercise': {
      data.id = generateElementId(ELEMENT_PREFIXES.exercise);
      if (!op.parentId) return protocol;
      const workouts = protocol.training.workouts.map(w => {
        if (w.id !== op.parentId) return w;
        return { ...w, exercises: [...w.exercises, data as unknown as Exercise] };
      });
      return { ...protocol, training: { ...protocol.training, workouts } };
    }
    case 'workout': {
      data.id = generateElementId(ELEMENT_PREFIXES.workout);
      const workouts = [...protocol.training.workouts, data as unknown as Workout];
      return { ...protocol, training: { ...protocol.training, workouts } };
    }
    case 'other_event': {
      data.id = generateElementId(ELEMENT_PREFIXES.other_event);
      // Add to first schedule by default, or use parentId to target specific schedule
      const schedules = protocol.schedules.map((s, i) => {
        if (op.parentId ? s.id === op.parentId : i === 0) {
          return { ...s, other_events: [...s.other_events, data as unknown as OtherEvent] };
        }
        return s;
      });
      return { ...protocol, schedules };
    }
    case 'routine_event': {
      data.id = generateElementId(ELEMENT_PREFIXES.routine_event);
      const schedules = protocol.schedules.map((s, i) => {
        if (op.parentId ? s.id === op.parentId : i === 0) {
          return { ...s, routine_events: [...(s.routine_events ?? []), data as unknown as RoutineEvent] };
        }
        return s;
      });
      return { ...protocol, schedules };
    }
    default:
      return protocol;
  }
}

/**
 * After operations, rebuild meal_index/supplement_index in routine sub-events
 * to match the current array positions. Remove orphaned references.
 */
function reindexRoutineReferences(protocol: DailyProtocol): void {
  // Build ID→index maps for meals and supplements
  const mealIdToIndex = new Map<string, number>();
  protocol.diet.meals.forEach((m, i) => {
    if (m.id) mealIdToIndex.set(m.id, i);
  });

  const supplementIdToIndex = new Map<string, number>();
  protocol.supplementation.supplements.forEach((s, i) => {
    if (s.id) supplementIdToIndex.set(s.id, i);
  });

  // Walk routine sub-events and fix indices
  for (const schedule of protocol.schedules) {
    for (const routine of schedule.routine_events ?? []) {
      routine.sub_events = routine.sub_events.filter(sub => {
        if (sub.type === 'meal' && sub.meal_index != null) {
          // Validate the index still points to a valid meal
          if (sub.meal_index >= protocol.diet.meals.length) {
            return false; // Remove orphaned reference
          }
        }
        if (sub.type === 'supplement' && sub.supplement_index != null) {
          if (sub.supplement_index >= protocol.supplementation.supplements.length) {
            return false;
          }
        }
        return true;
      });
    }
  }
}

/**
 * Validate that all element IDs referenced by operations exist in the protocol.
 * Returns only the valid operations (strips invalid ones).
 */
export function validateOperations(
  protocol: DailyProtocol,
  operations: ProtocolOperation[]
): ProtocolOperation[] {
  const allIds = collectAllElementIds(protocol);

  return operations.filter(op => {
    if (op.op === 'create') return true; // No ID to validate
    return allIds.has(op.elementId);
  });
}

/**
 * Collect all element IDs from the protocol into a Set.
 */
function collectAllElementIds(protocol: DailyProtocol): Set<string> {
  const ids = new Set<string>();

  for (const schedule of protocol.schedules) {
    if (schedule.id) ids.add(schedule.id);
    for (const event of schedule.other_events) {
      if (event.id) ids.add(event.id);
    }
    for (const routine of schedule.routine_events ?? []) {
      if (routine.id) ids.add(routine.id);
      for (const sub of routine.sub_events) {
        if (sub.id) ids.add(sub.id);
      }
    }
  }

  for (const meal of protocol.diet.meals) {
    if (meal.id) ids.add(meal.id);
  }

  for (const supplement of protocol.supplementation.supplements) {
    if (supplement.id) ids.add(supplement.id);
  }

  for (const workout of protocol.training.workouts) {
    if (workout.id) ids.add(workout.id);
    for (const exercise of workout.exercises) {
      if (exercise.id) ids.add(exercise.id);
    }
  }

  return ids;
}

/**
 * Look up an element's human-readable name by its ID.
 */
export function getElementNameById(protocol: DailyProtocol, elementId: string): string | null {
  for (const meal of protocol.diet.meals) {
    if (meal.id === elementId) return meal.name;
  }
  for (const supplement of protocol.supplementation.supplements) {
    if (supplement.id === elementId) return supplement.name;
  }
  for (const workout of protocol.training.workouts) {
    if (workout.id === elementId) return workout.name;
    for (const exercise of workout.exercises) {
      if (exercise.id === elementId) return exercise.name;
    }
  }
  for (const schedule of protocol.schedules) {
    for (const event of schedule.other_events) {
      if (event.id === elementId) return event.activity;
    }
    for (const routine of schedule.routine_events ?? []) {
      if (routine.id === elementId) return routine.name;
    }
  }
  return null;
}
