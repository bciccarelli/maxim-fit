import { z } from 'zod';

// =============================================================================
// Schedule Schemas
// =============================================================================

export const timeBlockSchema = z.object({
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Must be HH:MM format'),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Must be HH:MM format'),
  activity: z.string(),
  requirement_satisfied: z.string().optional().nullable(),
});

export type TimeBlock = z.infer<typeof timeBlockSchema>;

export const dayOfWeekSchema = z.enum([
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
]);

export type DayOfWeek = z.infer<typeof dayOfWeekSchema>;

export const ALL_DAYS: DayOfWeek[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

export const WEEKDAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
export const WEEKENDS: DayOfWeek[] = ['saturday', 'sunday'];

// Schedule variant with day assignments (new multi-day format)
export const scheduleVariantSchema = z.object({
  label: z.string().optional(),
  days: z.array(dayOfWeekSchema).min(1),
  wake_time: z.string(),
  sleep_time: z.string(),
  schedule: z.array(timeBlockSchema),
});

export type ScheduleVariant = z.infer<typeof scheduleVariantSchema>;

// Legacy single-schedule format (for backward compatibility)
export const dailyScheduleSchema = z.object({
  wake_time: z.string(),
  sleep_time: z.string(),
  schedule: z.array(timeBlockSchema),
});

export type DailySchedule = z.infer<typeof dailyScheduleSchema>;

// =============================================================================
// Diet Schemas
// =============================================================================

export const mealSchema = z.object({
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
  name: z.string(),
  dosage_amount: z.string(),
  dosage_unit: z.string(),
  dosage_notes: z.string().optional().nullable(),
  timing: z.string(),
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
  name: z.string(),
  sets: z.number().int().positive().optional().nullable(),
  reps: z.string().optional().nullable(),
  duration_min: z.number().int().positive().optional().nullable(),
  rest_sec: z.number().int().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type Exercise = z.infer<typeof exerciseSchema>;

export const workoutSchema = z.object({
  name: z.string(),
  day: z.string(),
  duration_min: z.number().int().positive(),
  exercises: z.array(exerciseSchema),
  warmup: z.string(),
  cooldown: z.string(),
});

export type Workout = z.infer<typeof workoutSchema>;

export const trainingProgramSchema = z.object({
  program_name: z.string(),
  days_per_week: z.number().int().min(1).max(7),
  workouts: z.array(workoutSchema),
  rest_days: z.array(z.string()),
  progression_notes: z.string(),
  general_notes: z.array(z.string()),
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

export const critiqueSchema = z.object({
  category: z.string(),
  criticism: z.string(),
  severity: z.enum(['minor', 'moderate', 'major']),
  suggestion: z.string(),
});

export type Critique = z.infer<typeof critiqueSchema>;

export const critiqueEvaluationSchema = z.object({
  critiques: z.array(critiqueSchema),
  overall_viability_score: z.number().min(0).max(100),
  strongest_aspects: z.array(z.string()),
  weakest_aspects: z.array(z.string()),
  devil_advocate_summary: z.string(),
});

export type CritiqueEvaluation = z.infer<typeof critiqueEvaluationSchema>;

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
  }>;
  requirements_met: boolean;
  weighted_goal_score: number;
  viability_score: number;
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
  viability_score: number | null;
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
 * Normalizes protocol data to the current schema format.
 * Converts legacy single-schedule format to the new multi-schedule format.
 * Converts legacy supplement dosage strings to structured fields.
 */
export function normalizeProtocol(data: unknown): DailyProtocol {
  const obj = data as Record<string, unknown>;
  let converted = { ...obj };

  // Handle legacy schedule format
  if (!Array.isArray(obj.schedules) && obj.schedule && typeof obj.schedule === 'object') {
    const legacySchedule = obj.schedule as DailySchedule;
    converted = {
      ...converted,
      schedules: [{
        label: 'Daily Schedule',
        days: ALL_DAYS,
        wake_time: legacySchedule.wake_time,
        sleep_time: legacySchedule.sleep_time,
        schedule: legacySchedule.schedule,
      }],
    };
    delete (converted as Record<string, unknown>).schedule;
  }

  // Handle legacy supplement dosage format
  if (converted.supplementation && typeof converted.supplementation === 'object') {
    const supp = converted.supplementation as Record<string, unknown>;
    if (Array.isArray(supp.supplements)) {
      const migratedSupplements = supp.supplements.map((s: unknown) =>
        migrateSupplementDosage(s as Record<string, unknown>)
      );
      converted.supplementation = {
        ...supp,
        supplements: migratedSupplements,
      };
    }
  }

  // Validate with schedules array
  if (!Array.isArray(converted.schedules)) {
    throw new Error('Invalid protocol format: missing schedule or schedules');
  }

  return dailyProtocolSchema.parse(converted);
}

/**
 * Checks if protocol data is in legacy format (singular schedule).
 */
export function isLegacyProtocol(data: unknown): boolean {
  const obj = data as Record<string, unknown>;
  return !Array.isArray(obj.schedules) && obj.schedule !== undefined;
}
