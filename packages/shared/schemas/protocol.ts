import { z } from 'zod';
import { generateElementId, ELEMENT_PREFIXES } from '../utils/ids';

// =============================================================================
// Schedule Schemas
// =============================================================================

// TimeBlock is used for legacy format backward compatibility
export const timeBlockSchema = z.object({
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Must be HH:MM format'),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Must be HH:MM format'),
  activity: z.string(),
  requirement_satisfied: z.string().optional().nullable(),
});

export type TimeBlock = z.infer<typeof timeBlockSchema>;

// OtherEvent - events that don't fit in diet, supplements, or training
export const otherEventSchema = z.object({
  id: z.string().optional(),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Must be HH:MM format'),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Must be HH:MM format'),
  activity: z.string(),
  requirement_satisfied: z.string().optional().nullable(),
});

export type OtherEvent = z.infer<typeof otherEventSchema>;

// =============================================================================
// Routine Schemas (habit stacking / grouped activities)
// =============================================================================

export const routineSubEventTypeSchema = z.enum(['activity', 'supplement', 'meal']);
export type RoutineSubEventType = z.infer<typeof routineSubEventTypeSchema>;

export const routineSubEventSchema = z.object({
  id: z.string().optional(),
  type: routineSubEventTypeSchema,
  order: z.number().int().min(0),
  duration_min: z.number().int().min(1),
  // For type='activity'
  activity: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  // For type='supplement' - reference by index into supplements array
  supplement_index: z.number().int().min(0).optional().nullable(),
  // For type='meal' - reference by index into meals array
  meal_index: z.number().int().min(0).optional().nullable(),
});

export type RoutineSubEvent = z.infer<typeof routineSubEventSchema>;

export const routineEventSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Must be HH:MM format'),
  sub_events: z.array(routineSubEventSchema).min(1),
  notes: z.string().optional().nullable(),
  requirement_satisfied: z.string().optional().nullable(),
});

export type RoutineEvent = z.infer<typeof routineEventSchema>;

export const dayOfWeekSchema = z.enum([
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
]);

export type DayOfWeek = z.infer<typeof dayOfWeekSchema>;

export const ALL_DAYS: DayOfWeek[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

export const WEEKDAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
export const WEEKENDS: DayOfWeek[] = ['saturday', 'sunday'];

// Schedule variant with day assignments - uses other_events for non-meal/supplement/workout activities
export const scheduleVariantSchema = z.object({
  id: z.string().optional(),
  label: z.string().optional(),
  days: z.array(dayOfWeekSchema).min(1),
  wake_time: z.string(),
  sleep_time: z.string(),
  other_events: z.array(otherEventSchema),
  routine_events: z.array(routineEventSchema).optional().default([]),
});

export type ScheduleVariant = z.infer<typeof scheduleVariantSchema>;

// Legacy single-schedule format (for backward compatibility)
export const dailyScheduleSchema = z.object({
  wake_time: z.string(),
  sleep_time: z.string(),
  schedule: z.array(timeBlockSchema),
});

export type DailySchedule = z.infer<typeof dailyScheduleSchema>;

// Legacy schedule variant format (for backward compatibility)
export const legacyScheduleVariantSchema = z.object({
  label: z.string().optional(),
  days: z.array(dayOfWeekSchema).min(1),
  wake_time: z.string(),
  sleep_time: z.string(),
  schedule: z.array(timeBlockSchema),
});

// =============================================================================
// Diet Schemas
// =============================================================================

export const mealSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  time: z.string(),
  foods: z.array(z.string()),
  calories: z.number().int().positive(),
  protein_g: z.number().nonnegative(),
  carbs_g: z.number().nonnegative(),
  fat_g: z.number().nonnegative(),
  notes: z.string().optional().nullable(),

  // Slot-based fields for macro targets + timing (optional for backward compat)
  timing_context: z.string().optional().nullable(),  // e.g., "Pre-workout fuel", "Recovery window"
  target_calories: z.number().int().positive().optional(),
  target_protein_g: z.number().nonnegative().optional(),
  target_carbs_g: z.number().nonnegative().optional(),
  target_fat_g: z.number().nonnegative().optional(),
});

export type Meal = z.infer<typeof mealSchema>;

export const dietPlanSchema = z.object({
  daily_calories: z.number().int().positive(),
  protein_target_g: z.number().nonnegative(),
  carbs_target_g: z.number().nonnegative(),
  fat_target_g: z.number().nonnegative(),
  meals: z.array(mealSchema),
  hydration_oz: z.number().nonnegative(),
  dietary_notes: z.array(z.string()),
});

export type DietPlan = z.infer<typeof dietPlanSchema>;

// =============================================================================
// Supplementation Schemas
// =============================================================================

export const supplementSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  dosage_amount: z.string(),
  dosage_unit: z.string(),
  dosage_notes: z.string().optional().nullable(),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Must be HH:MM format'),
  timing: z.string(), // Kept for context (e.g., "with breakfast", "before bed")
  purpose: z.string(),
  notes: z.string().optional().nullable(),
});

export type Supplement = z.infer<typeof supplementSchema>;

export const supplementationPlanSchema = z.object({
  supplements: z.array(supplementSchema),
  general_notes: z.array(z.string()),
});

export type SupplementationPlan = z.infer<typeof supplementationPlanSchema>;

// =============================================================================
// Training Schemas
// =============================================================================

export const exerciseSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  sets: z.number().int().positive().optional().nullable(),
  reps: z.string().optional().nullable(),
  duration_min: z.number().int().positive().optional().nullable(),
  rest_sec: z.number().int().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type Exercise = z.infer<typeof exerciseSchema>;

export const workoutSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  day: z.string(),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Must be HH:MM format'),
  duration_min: z.number().int().positive(),
  exercises: z.array(exerciseSchema),
  // Note: warmup/cooldown string fields removed - these are now regular exercises
});

export type Workout = z.infer<typeof workoutSchema>;

export const trainingProgramSchema = z.object({
  // Legacy: program_name is no longer generated or surfaced in the UI, but
  // accepted on parse so existing stored protocols still validate.
  program_name: z.string().optional().default(''),
  days_per_week: z.number().int().min(1).max(7),
  workouts: z.array(workoutSchema),
  // Legacy fields — accepted on parse for backward compatibility with existing
  // stored protocols, but no longer generated or surfaced in the UI.
  rest_days: z.array(z.string()).optional().default([]),
  progression_notes: z.string().optional().default(''),
  general_notes: z.array(z.string()).optional().default([]),
});

export type TrainingProgram = z.infer<typeof trainingProgramSchema>;

// =============================================================================
// Protocol Schema
// =============================================================================

export const dailyProtocolSchema = z.object({
  schedules: z.array(scheduleVariantSchema).min(1),
  diet: dietPlanSchema,
  supplementation: supplementationPlanSchema,
  training: trainingProgramSchema,
});

export type DailyProtocol = z.infer<typeof dailyProtocolSchema>;

// Legacy protocol schema (for parsing old data)
export const legacyDailyProtocolSchema = z.object({
  schedule: dailyScheduleSchema,
  diet: dietPlanSchema,
  supplementation: supplementationPlanSchema,
  training: trainingProgramSchema,
});

export type LegacyDailyProtocol = z.infer<typeof legacyDailyProtocolSchema>;

// =============================================================================
// Evaluation Schemas
// =============================================================================

export const adherenceScoreSchema = z.object({
  requirement_name: z.string(),
  target: z.number(),
  achieved: z.number(),
  adherence_percent: z.number(),
  suggestions: z.string(),
});

export type AdherenceScore = z.infer<typeof adherenceScoreSchema>;

export const adherenceEvaluationSchema = z.object({
  scores: z.array(adherenceScoreSchema),
  overall_adherence: z.number(),
});

export type AdherenceEvaluation = z.infer<typeof adherenceEvaluationSchema>;

export const goalScoreSchema = z.object({
  goal_name: z.string(),
  score: z.number().min(0).max(100),
  reasoning: z.string(),
  suggestions: z.string(),
});

export type GoalScore = z.infer<typeof goalScoreSchema>;

export const goalEvaluationSchema = z.object({
  scores: z.array(goalScoreSchema),
  weighted_score: z.number(),
  overall_assessment: z.string(),
});

export type GoalEvaluation = z.infer<typeof goalEvaluationSchema>;

// Note: critiqueQuestionSchema mirrors clarifyingQuestionSchema but is defined
// separately here to avoid circular dependency issues (critiques defined before
// clarifying questions in this file).
export const critiqueQuestionOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
});

export const critiqueQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  context: z.string().optional().nullable(),  // Why this question matters
  options: z.array(critiqueQuestionOptionSchema).optional().nullable(),
  inputType: z.enum(['text', 'select']).default('text'),
});

export type CritiqueQuestion = z.infer<typeof critiqueQuestionSchema>;

export const critiqueSchema = z.object({
  category: z.string(),
  criticism: z.string(),
  severity: z.enum(['minor', 'moderate', 'major']),
  suggestion: z.string(),
  questions: z.array(critiqueQuestionSchema).optional().nullable(),
});

export type Critique = z.infer<typeof critiqueSchema>;

export const critiqueEvaluationSchema = z.object({
  critiques: z.array(critiqueSchema),
  strongest_aspects: z.array(z.string()),
  weakest_aspects: z.array(z.string()),
  devil_advocate_summary: z.string(),
});

export type CritiqueEvaluation = z.infer<typeof critiqueEvaluationSchema>;

// =============================================================================
// Citation Schemas
// =============================================================================

export const citationOperationSchema = z.enum(['verify', 'modify', 'ask', 'generate_meals']);
export type CitationOperation = z.infer<typeof citationOperationSchema>;

export const citationSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  title: z.string(),
  domain: z.string(),
  relevantText: z.string().optional().nullable(),  // Text segment this citation supports
  operation: citationOperationSchema,
  operationTimestamp: z.string(),  // ISO datetime when citation was captured
});

export type Citation = z.infer<typeof citationSchema>;

export const citationsArraySchema = z.array(citationSchema);

// =============================================================================
// Clarifying Questions (for Modify flow)
// =============================================================================

export const clarifyingQuestionOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
});

export type ClarifyingQuestionOption = z.infer<typeof clarifyingQuestionOptionSchema>;

export const clarifyingQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  context: z.string().optional().nullable(),  // Why this question matters
  options: z.array(clarifyingQuestionOptionSchema).optional().nullable(),
  inputType: z.enum(['text', 'select']).default('text'),
});

export type ClarifyingQuestion = z.infer<typeof clarifyingQuestionSchema>;

export const questionAnswerSchema = z.object({
  questionId: z.string(),
  answer: z.string(),
});

export type QuestionAnswer = z.infer<typeof questionAnswerSchema>;

export const questionsPhaseResultSchema = z.object({
  hasQuestions: z.boolean(),
  questions: z.array(clarifyingQuestionSchema),
  researchSummary: z.string(),
});

export type QuestionsPhaseResult = z.infer<typeof questionsPhaseResultSchema>;

// =============================================================================
// Verification Result
// =============================================================================

export type VerificationResult = {
  requirement_scores: Array<{
    requirement_name: string;
    target: number;
    achieved: number;
    adherence_percent: number;
    suggestions: string;
  }>;
  goal_scores: Array<{
    goal_name: string;
    score: number;
    reasoning: string;
    suggestions: string;
  }>;
  critiques: Array<{
    category: string;
    criticism: string;
    severity: 'minor' | 'moderate' | 'major';
    suggestion: string;
    questions?: Array<{
      id: string;
      question: string;
      context?: string | null;
      options?: Array<{ value: string; label: string }> | null;
      inputType: 'text' | 'select';
    }> | null;
  }>;
  requirements_met: boolean;
  weighted_goal_score: number;
};

// =============================================================================
// Modify Proposal
// =============================================================================

export type ModifyProposal = {
  protocol: DailyProtocol;
  reasoning: string;
  verification: VerificationResult;
};

// =============================================================================
// Version Types
// =============================================================================

export type ProtocolVersion = {
  id: string;
  name: string | null;
  version: number;
  version_chain_id: string;
  is_current: boolean;
  change_note: string | null;
  change_source: string | null;
  verified: boolean;
  verified_at: string | null;
  weighted_goal_score: number | null;
  created_at: string;
};

export type ProtocolQuestion = {
  id: string;
  question: string;
  answer: string;
  created_at: string;
};

// =============================================================================
// Protocol Normalization (backward compatibility)
// =============================================================================

/**
 * Parse legacy dosage string into structured fields.
 * Examples:
 * - "500 mg" -> { amount: "500", unit: "mg", notes: null }
 * - "2000 IU (D3)" -> { amount: "2000", unit: "IU", notes: "D3" }
 * - "500mg standardized to 3%" -> { amount: "500", unit: "mg", notes: "standardized to 3%" }
 */
function parseLegacyDosage(dosage: string): { amount: string; unit: string; notes: string | null } {
  // Common units to look for
  const units = ['mg', 'g', 'mcg', 'µg', 'IU', 'ml', 'drops', 'capsules', 'capsule', 'tablets', 'tablet'];

  // Try to extract amount and unit
  const match = dosage.match(/^([\d.,]+)\s*([a-zA-Zµ]+)/);
  if (match) {
    const amount = match[1].replace(',', '');
    const rawUnit = match[2].toLowerCase();
    const unit = units.find(u => rawUnit.startsWith(u.toLowerCase())) || rawUnit;

    // Everything after the amount+unit is notes
    const afterUnit = dosage.slice(match[0].length).trim();
    // Clean up notes - remove leading parentheses, dashes, etc.
    const notes = afterUnit.replace(/^[\(\-–—:,\s]+/, '').replace(/[\)]+$/, '').trim() || null;

    return { amount, unit, notes };
  }

  // Fallback: can't parse, put everything in amount
  return { amount: dosage, unit: '', notes: null };
}

/**
 * Migrate legacy supplement with single dosage field to structured fields.
 */
function migrateSupplementDosage(supplement: Record<string, unknown>): Record<string, unknown> {
  // Already migrated
  if ('dosage_amount' in supplement && 'dosage_unit' in supplement) {
    return supplement;
  }

  // Has legacy dosage field
  if ('dosage' in supplement && typeof supplement.dosage === 'string') {
    const parsed = parseLegacyDosage(supplement.dosage);
    const { dosage, ...rest } = supplement;
    return {
      ...rest,
      dosage_amount: parsed.amount,
      dosage_unit: parsed.unit,
      dosage_notes: parsed.notes,
    };
  }

  // No dosage field at all - add defaults
  return {
    ...supplement,
    dosage_amount: '',
    dosage_unit: 'mg',
    dosage_notes: null,
  };
}

/**
 * Infer a time from a timing description string.
 * Examples: "Morning with breakfast" -> "07:00", "Before bed" -> "21:30"
 */
function inferTimeFromTiming(timing: string, wakeTime = '07:00', sleepTime = '22:00'): string {
  const lower = timing.toLowerCase();

  // Parse wake/sleep times to minutes for calculations
  const [wakeH, wakeM] = wakeTime.split(':').map(Number);
  const [sleepH, sleepM] = sleepTime.split(':').map(Number);
  const wakeMins = wakeH * 60 + wakeM;
  const sleepMins = sleepH * 60 + sleepM;

  const toTimeStr = (mins: number) => {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // Morning keywords
  if (lower.includes('morning') || lower.includes('breakfast') || lower.includes('upon waking') || lower.includes('wake')) {
    return toTimeStr(wakeMins + 30); // 30 min after wake
  }

  // Noon/lunch keywords
  if (lower.includes('lunch') || lower.includes('midday') || lower.includes('noon')) {
    return '12:00';
  }

  // Afternoon keywords
  if (lower.includes('afternoon')) {
    return '15:00';
  }

  // Evening/dinner keywords
  if (lower.includes('evening') || lower.includes('dinner')) {
    return '18:00';
  }

  // Night/bed keywords
  if (lower.includes('night') || lower.includes('bed') || lower.includes('sleep')) {
    return toTimeStr(sleepMins - 30); // 30 min before sleep
  }

  // Pre-workout
  if (lower.includes('pre-workout') || lower.includes('before workout') || lower.includes('before training')) {
    return '06:00'; // Default pre-workout time
  }

  // Post-workout
  if (lower.includes('post-workout') || lower.includes('after workout') || lower.includes('after training')) {
    return '07:30'; // Default post-workout time
  }

  // Default to mid-morning if we can't determine
  return toTimeStr(wakeMins + 120); // 2 hours after wake
}

/**
 * Add time field to supplement if missing.
 */
function migrateSupplementTime(supplement: Record<string, unknown>, wakeTime?: string, sleepTime?: string): Record<string, unknown> {
  if ('time' in supplement && typeof supplement.time === 'string' && /^\d{2}:\d{2}$/.test(supplement.time)) {
    return supplement;
  }

  const timing = typeof supplement.timing === 'string' ? supplement.timing : 'morning';
  const inferredTime = inferTimeFromTiming(timing, wakeTime, sleepTime);

  return {
    ...supplement,
    time: inferredTime,
  };
}

/**
 * Strip legacy warmup/cooldown string fields from workout.
 * These are now regular exercises - the text is simply discarded.
 */
function migrateWorkoutWarmupCooldown(workout: Record<string, unknown>): Record<string, unknown> {
  const { warmup, cooldown, ...rest } = workout;
  return rest;
}

/**
 * Add time field to workout if missing.
 * Tries to find matching time from legacy schedule events.
 */
function migrateWorkoutTime(
  workout: Record<string, unknown>,
  legacyScheduleBlocks?: TimeBlock[],
  workoutIndex?: number
): Record<string, unknown> {
  if ('time' in workout && typeof workout.time === 'string' && /^\d{2}:\d{2}$/.test(workout.time)) {
    return workout;
  }

  const workoutName = typeof workout.name === 'string' ? workout.name.toLowerCase() : '';

  // Try to find a matching event in the legacy schedule
  if (legacyScheduleBlocks && legacyScheduleBlocks.length > 0) {
    // Look for exact name match first
    const exactMatch = legacyScheduleBlocks.find(block =>
      block.activity.toLowerCase() === workoutName
    );
    if (exactMatch) {
      return { ...workout, time: exactMatch.start_time };
    }

    // Look for partial name match
    const partialMatch = legacyScheduleBlocks.find(block => {
      const activityLower = block.activity.toLowerCase();
      return activityLower.includes(workoutName) || workoutName.includes(activityLower);
    });
    if (partialMatch) {
      return { ...workout, time: partialMatch.start_time };
    }

    // Look for workout-related keywords
    const workoutKeywords = ['workout', 'training', 'exercise', 'gym', 'cardio', 'strength', 'hiit', 'weights'];
    const keywordMatch = legacyScheduleBlocks.find(block => {
      const activityLower = block.activity.toLowerCase();
      return workoutKeywords.some(kw => activityLower.includes(kw));
    });
    if (keywordMatch) {
      return { ...workout, time: keywordMatch.start_time };
    }
  }

  // Infer reasonable default based on workout name
  if (workoutName.includes('morning') || workoutName.includes(' am')) {
    return { ...workout, time: '06:00' };
  }
  if (workoutName.includes('evening') || workoutName.includes(' pm') || workoutName.includes('after work')) {
    return { ...workout, time: '18:00' };
  }
  if (workoutName.includes('lunch') || workoutName.includes('noon') || workoutName.includes('midday')) {
    return { ...workout, time: '12:00' };
  }

  // Default: vary based on workout index to avoid all workouts at same time
  const defaultTimes = ['06:00', '17:00', '07:00', '18:00', '06:30', '17:30', '07:30'];
  const idx = workoutIndex ?? 0;
  const defaultTime = defaultTimes[idx % defaultTimes.length];

  return {
    ...workout,
    time: defaultTime,
  };
}

/**
 * Migrate legacy schedule array to other_events.
 * Filters out events that likely correspond to meals, supplements, or workouts.
 */
function migrateScheduleToOtherEvents(
  scheduleBlocks: TimeBlock[],
  meals: Array<{ time: string; name: string }>,
  supplements: Array<{ time: string; name: string }>,
  workouts: Array<{ time?: string; name: string }>
): OtherEvent[] {
  // Create a set of times and activity patterns that correspond to known events
  const mealTimes = new Set(meals.map(m => m.time));
  const supplementTimes = new Set(supplements.map(s => s.time));
  const workoutNames = new Set(workouts.map(w => w.name.toLowerCase()));

  // Keywords that indicate meal/supplement/workout events
  const mealKeywords = ['breakfast', 'lunch', 'dinner', 'snack', 'meal', 'eat'];
  const supplementKeywords = ['supplement', 'vitamin', 'take', 'medication'];
  const workoutKeywords = ['workout', 'training', 'exercise', 'gym', 'cardio', 'strength', 'hiit'];

  return scheduleBlocks.filter(block => {
    const activityLower = block.activity.toLowerCase();

    // Skip if time matches a meal time
    if (mealTimes.has(block.start_time)) return false;

    // Skip if time matches a supplement time
    if (supplementTimes.has(block.start_time)) return false;

    // Skip if activity mentions meals
    if (mealKeywords.some(k => activityLower.includes(k))) return false;

    // Skip if activity mentions supplements
    if (supplementKeywords.some(k => activityLower.includes(k))) return false;

    // Skip if activity mentions workouts or matches a workout name
    if (workoutKeywords.some(k => activityLower.includes(k))) return false;
    if (workoutNames.has(activityLower)) return false;

    return true;
  }).map(block => ({
    start_time: block.start_time,
    end_time: block.end_time,
    activity: block.activity,
    requirement_satisfied: block.requirement_satisfied,
  }));
}

/**
 * Normalizes protocol data to the current schema format.
 * - Converts legacy single-schedule format to the new multi-schedule format.
 * - Converts legacy supplement dosage strings to structured fields.
 * - Adds time fields to supplements and workouts.
 * - Migrates schedule arrays to other_events.
 */
export function normalizeProtocol(data: unknown): DailyProtocol {
  const obj = data as Record<string, unknown>;
  let converted = { ...obj };

  // Handle legacy single-schedule format (before multi-day support)
  if (!Array.isArray(obj.schedules) && obj.schedule && typeof obj.schedule === 'object') {
    const legacySchedule = obj.schedule as DailySchedule;
    converted = {
      ...converted,
      schedules: [{
        label: 'Daily Schedule',
        days: ALL_DAYS,
        wake_time: legacySchedule.wake_time,
        sleep_time: legacySchedule.sleep_time,
        schedule: legacySchedule.schedule, // Will be migrated to other_events below
      }],
    };
    delete (converted as Record<string, unknown>).schedule;
  }

  // Get wake/sleep times from first schedule for time inference
  const schedulesArr = converted.schedules as Array<Record<string, unknown>>;
  const firstSchedule = schedulesArr?.[0] || {};
  const wakeTime = typeof firstSchedule.wake_time === 'string' ? firstSchedule.wake_time : '07:00';
  const sleepTime = typeof firstSchedule.sleep_time === 'string' ? firstSchedule.sleep_time : '22:00';

  // Collect all legacy schedule blocks for workout time inference
  const legacyScheduleBlocks: TimeBlock[] = [];
  if (Array.isArray(schedulesArr)) {
    for (const variant of schedulesArr) {
      if (Array.isArray(variant.schedule)) {
        legacyScheduleBlocks.push(...(variant.schedule as TimeBlock[]));
      }
    }
  }

  // Handle legacy supplement dosage format and add time field
  if (converted.supplementation && typeof converted.supplementation === 'object') {
    const supp = converted.supplementation as Record<string, unknown>;
    if (Array.isArray(supp.supplements)) {
      const migratedSupplements = supp.supplements.map((s: unknown) => {
        let supplement = migrateSupplementDosage(s as Record<string, unknown>);
        supplement = migrateSupplementTime(supplement, wakeTime, sleepTime);
        return supplement;
      });
      converted.supplementation = {
        ...supp,
        supplements: migratedSupplements,
      };
    }
  }

  // Add time field to workouts and strip legacy warmup/cooldown strings
  if (converted.training && typeof converted.training === 'object') {
    const training = converted.training as Record<string, unknown>;
    if (Array.isArray(training.workouts)) {
      const migratedWorkouts = training.workouts.map((w: unknown, index: number) => {
        let workout = w as Record<string, unknown>;
        workout = migrateWorkoutTime(workout, legacyScheduleBlocks, index);
        workout = migrateWorkoutWarmupCooldown(workout);
        return workout;
      });
      converted.training = {
        ...training,
        workouts: migratedWorkouts,
      };
    }
  }

  // Migrate schedule arrays to other_events
  if (Array.isArray(converted.schedules)) {
    const diet = converted.diet as { meals?: Array<{ time: string; name: string }> } | undefined;
    const supplementation = converted.supplementation as { supplements?: Array<{ time: string; name: string }> } | undefined;
    const training = converted.training as { workouts?: Array<{ time?: string; name: string }> } | undefined;

    const meals = diet?.meals || [];
    const supplements = supplementation?.supplements || [];
    const workouts = training?.workouts || [];

    converted.schedules = schedulesArr.map((variant: Record<string, unknown>) => {
      // If already has other_events and no schedule, skip migration
      if (Array.isArray(variant.other_events) && !Array.isArray(variant.schedule)) {
        // Ensure routine_events exists
        return {
          ...variant,
          routine_events: variant.routine_events ?? [],
        };
      }

      // If has legacy schedule array, migrate to other_events
      if (Array.isArray(variant.schedule)) {
        const otherEvents = migrateScheduleToOtherEvents(
          variant.schedule as TimeBlock[],
          meals,
          supplements,
          workouts
        );
        const { schedule: _, ...rest } = variant;
        return {
          ...rest,
          other_events: otherEvents,
          routine_events: [],
        };
      }

      // No schedule or other_events, add empty other_events and routine_events
      return {
        ...variant,
        other_events: [],
        routine_events: [],
      };
    });
  }

  // Validate with schedules array
  if (!Array.isArray(converted.schedules)) {
    throw new Error('Invalid protocol format: missing schedule or schedules');
  }

  // Assign IDs to all elements that don't have them
  assignElementIds(converted);

  return dailyProtocolSchema.parse(converted);
}

/**
 * Walk all element arrays in the protocol and assign IDs where missing.
 * Existing IDs are preserved. Only elements without an `id` field get one.
 */
function assignElementIds(protocol: Record<string, unknown>): void {
  const ensureId = (element: Record<string, unknown>, prefix: string) => {
    if (!element.id) {
      element.id = generateElementId(prefix);
    }
  };

  // Schedules + nested events
  if (Array.isArray(protocol.schedules)) {
    for (const schedule of protocol.schedules as Array<Record<string, unknown>>) {
      ensureId(schedule, ELEMENT_PREFIXES.schedule);

      if (Array.isArray(schedule.other_events)) {
        for (const event of schedule.other_events as Array<Record<string, unknown>>) {
          ensureId(event, ELEMENT_PREFIXES.other_event);
        }
      }

      if (Array.isArray(schedule.routine_events)) {
        for (const routine of schedule.routine_events as Array<Record<string, unknown>>) {
          ensureId(routine, ELEMENT_PREFIXES.routine_event);

          if (Array.isArray(routine.sub_events)) {
            for (const sub of routine.sub_events as Array<Record<string, unknown>>) {
              ensureId(sub, ELEMENT_PREFIXES.routine_sub_event);
            }
          }
        }
      }
    }
  }

  // Meals
  const diet = protocol.diet as Record<string, unknown> | undefined;
  if (diet && Array.isArray(diet.meals)) {
    for (const meal of diet.meals as Array<Record<string, unknown>>) {
      ensureId(meal, ELEMENT_PREFIXES.meal);
    }
  }

  // Supplements
  const supplementation = protocol.supplementation as Record<string, unknown> | undefined;
  if (supplementation && Array.isArray(supplementation.supplements)) {
    for (const supplement of supplementation.supplements as Array<Record<string, unknown>>) {
      ensureId(supplement, ELEMENT_PREFIXES.supplement);
    }
  }

  // Workouts + exercises
  const training = protocol.training as Record<string, unknown> | undefined;
  if (training && Array.isArray(training.workouts)) {
    for (const workout of training.workouts as Array<Record<string, unknown>>) {
      ensureId(workout, ELEMENT_PREFIXES.workout);

      if (Array.isArray(workout.exercises)) {
        for (const exercise of workout.exercises as Array<Record<string, unknown>>) {
          ensureId(exercise, ELEMENT_PREFIXES.exercise);
        }
      }
    }
  }
}

/**
 * Checks if protocol data is in legacy format.
 * Legacy formats include:
 * - Singular schedule field (before multi-day support)
 * - Schedule arrays in variants (before event-driven architecture)
 * - Supplements without time field
 * - Workouts without time field
 */
export function isLegacyProtocol(data: unknown): boolean {
  const obj = data as Record<string, unknown>;

  // Check for old singular schedule format
  if (!Array.isArray(obj.schedules) && obj.schedule !== undefined) {
    return true;
  }

  // Check for legacy schedule array in variants
  if (Array.isArray(obj.schedules)) {
    const hasLegacyScheduleArray = (obj.schedules as Array<Record<string, unknown>>).some(
      (v) => Array.isArray(v.schedule) && !Array.isArray(v.other_events)
    );
    if (hasLegacyScheduleArray) return true;
  }

  // Check for supplements without time field
  if (obj.supplementation && typeof obj.supplementation === 'object') {
    const supp = obj.supplementation as { supplements?: Array<Record<string, unknown>> };
    if (Array.isArray(supp.supplements)) {
      const hasMissingTime = supp.supplements.some(s => !('time' in s));
      if (hasMissingTime) return true;
    }
  }

  // Check for workouts without time field
  if (obj.training && typeof obj.training === 'object') {
    const training = obj.training as { workouts?: Array<Record<string, unknown>> };
    if (Array.isArray(training.workouts)) {
      const hasMissingTime = training.workouts.some(w => !('time' in w));
      if (hasMissingTime) return true;

      // Check for legacy warmup/cooldown string fields
      const hasLegacyWarmupCooldown = training.workouts.some(
        w => 'warmup' in w || 'cooldown' in w
      );
      if (hasLegacyWarmupCooldown) return true;
    }
  }

  return false;
}
