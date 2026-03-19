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

// ---------------------------------------------------------------------------
// Coercion helpers — fix common Gemini output issues before Zod validation
// ---------------------------------------------------------------------------

const NUMERIC_FIELDS: Record<string, string[]> = {
  meal: ['calories', 'protein_g', 'carbs_g', 'fat_g', 'target_calories', 'target_protein_g', 'target_carbs_g', 'target_fat_g'],
  supplement: [],
  exercise: ['sets', 'duration_min', 'rest_sec'],
  workout: ['duration_min'],
  other_event: [],
  routine_event: [],
};

const TIME_FIELDS: Record<string, string[]> = {
  meal: ['time'],
  supplement: ['time'],
  exercise: [],
  workout: ['time'],
  other_event: ['start_time', 'end_time'],
  routine_event: ['start_time'],
};

/**
 * Normalize a time string to HH:MM 24-hour format.
 * Handles: "7:00" → "07:00", "7:00 AM" → "07:00", "2:30 PM" → "14:30"
 */
export function normalizeTimeFormat(time: unknown): string | undefined {
  if (typeof time !== 'string') return undefined;
  const trimmed = time.trim();
  if (!trimmed) return undefined;

  // Already valid HH:MM
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(trimmed)) return trimmed;

  // Try to parse AM/PM format: "2:30 PM", "12:00AM", etc.
  const amPmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm|a\.m\.|p\.m\.)$/);
  if (amPmMatch) {
    let hours = parseInt(amPmMatch[1], 10);
    const minutes = amPmMatch[2];
    const period = amPmMatch[3].toLowerCase().replace(/\./g, '');
    if (period === 'pm' && hours !== 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }

  // Try to fix missing leading zero: "7:00" → "07:00"
  const shortMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (shortMatch) {
    const hours = parseInt(shortMatch[1], 10);
    if (hours >= 0 && hours <= 23) {
      return `${String(hours).padStart(2, '0')}:${shortMatch[2]}`;
    }
  }

  return trimmed; // Return as-is if we can't parse
}

/**
 * Coerce element data to match Zod schema expectations.
 * Fixes common Gemini issues: string numbers, bad time formats, missing required fields.
 */
export function coerceElement(
  elementType: string,
  data: Record<string, unknown>,
  isCreate = false
): Record<string, unknown> {
  const result = { ...data };

  // Coerce numeric fields from strings to numbers
  const numericKeys = NUMERIC_FIELDS[elementType] || [];
  for (const key of numericKeys) {
    if (key in result && typeof result[key] === 'string') {
      const parsed = Number(result[key]);
      if (!isNaN(parsed)) result[key] = parsed;
    }
  }

  // Normalize time fields to HH:MM
  const timeKeys = TIME_FIELDS[elementType] || [];
  for (const key of timeKeys) {
    if (key in result) {
      const normalized = normalizeTimeFormat(result[key]);
      if (normalized) result[key] = normalized;
    }
  }

  // Fill missing required defaults for create operations
  if (isCreate) {
    switch (elementType) {
      case 'meal':
        if (!('foods' in result)) result.foods = [];
        if (!('calories' in result)) result.calories = 0;
        if (!('protein_g' in result)) result.protein_g = 0;
        if (!('carbs_g' in result)) result.carbs_g = 0;
        if (!('fat_g' in result)) result.fat_g = 0;
        break;
      case 'supplement':
        if (!('dosage_amount' in result)) result.dosage_amount = '';
        if (!('dosage_unit' in result)) result.dosage_unit = 'mg';
        if (!('timing' in result)) result.timing = 'as directed';
        if (!('purpose' in result)) result.purpose = 'general health';
        if (!('time' in result)) result.time = '08:00';
        break;
      case 'workout':
        if (!('exercises' in result)) result.exercises = [];
        break;
    }
  }

  return result;
}

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
 * Coerces the merged result to fix common Gemini type issues.
 */
function applyModify(
  protocol: DailyProtocol,
  elementId: string,
  elementType: string,
  fields: Record<string, unknown>
): DailyProtocol {
  const coercedFields = coerceElement(elementType, fields);
  switch (elementType) {
    case 'meal': {
      const meals = protocol.diet.meals.map(m =>
        m.id === elementId ? coerceElement(elementType, { ...m, ...coercedFields, id: m.id }) as unknown as Meal : m
      );
      return { ...protocol, diet: { ...protocol.diet, meals } };
    }
    case 'supplement': {
      const supplements = protocol.supplementation.supplements.map(s =>
        s.id === elementId ? coerceElement(elementType, { ...s, ...coercedFields, id: s.id }) as unknown as Supplement : s
      );
      return { ...protocol, supplementation: { ...protocol.supplementation, supplements } };
    }
    case 'exercise': {
      const workouts = protocol.training.workouts.map(w => ({
        ...w,
        exercises: w.exercises.map(e =>
          e.id === elementId ? coerceElement(elementType, { ...e, ...coercedFields, id: e.id }) as unknown as Exercise : e
        ),
      }));
      return { ...protocol, training: { ...protocol.training, workouts } };
    }
    case 'workout': {
      const workouts = protocol.training.workouts.map(w =>
        w.id === elementId ? coerceElement(elementType, { ...w, ...coercedFields, id: w.id }) as unknown as Workout : w
      );
      return { ...protocol, training: { ...protocol.training, workouts } };
    }
    case 'other_event': {
      const schedules = protocol.schedules.map(s => ({
        ...s,
        other_events: s.other_events.map(e =>
          e.id === elementId ? coerceElement(elementType, { ...e, ...coercedFields, id: e.id }) as unknown as OtherEvent : e
        ),
      }));
      return { ...protocol, schedules };
    }
    case 'routine_event': {
      const schedules = protocol.schedules.map(s => ({
        ...s,
        routine_events: (s.routine_events ?? []).map(r =>
          r.id === elementId ? coerceElement(elementType, { ...r, ...coercedFields, id: r.id }) as unknown as RoutineEvent : r
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
 * Assigns a server-generated ID. Coerces data to fix common Gemini type issues.
 */
function applyCreate(
  protocol: DailyProtocol,
  op: CreateOperation
): DailyProtocol {
  const data = coerceElement(op.elementType, { ...op.data }, true);

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
