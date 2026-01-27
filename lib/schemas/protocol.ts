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
  dosage: z.string(),
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
  schedule: dailyScheduleSchema,
  diet: dietPlanSchema,
  supplementation: supplementationPlanSchema,
  training: trainingProgramSchema,
});

export type DailyProtocol = z.infer<typeof dailyProtocolSchema>;

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
