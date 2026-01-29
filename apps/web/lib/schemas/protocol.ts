// Re-export all protocol schemas and types from shared package
// This allows existing imports to continue working while
// enabling shared code between web and mobile

export {
  // Schedule schemas
  timeBlockSchema,
  type TimeBlock,
  dayOfWeekSchema,
  type DayOfWeek,
  ALL_DAYS,
  WEEKDAYS,
  WEEKENDS,
  scheduleVariantSchema,
  type ScheduleVariant,
  dailyScheduleSchema,
  type DailySchedule,

  // Diet schemas
  mealSchema,
  type Meal,
  dietPlanSchema,
  type DietPlan,

  // Supplementation schemas
  supplementSchema,
  type Supplement,
  supplementationPlanSchema,
  type SupplementationPlan,

  // Training schemas
  exerciseSchema,
  type Exercise,
  workoutSchema,
  type Workout,
  trainingProgramSchema,
  type TrainingProgram,

  // Protocol schemas
  dailyProtocolSchema,
  type DailyProtocol,
  legacyDailyProtocolSchema,
  type LegacyDailyProtocol,

  // Evaluation schemas
  adherenceScoreSchema,
  type AdherenceScore,
  adherenceEvaluationSchema,
  type AdherenceEvaluation,
  goalScoreSchema,
  type GoalScore,
  goalEvaluationSchema,
  type GoalEvaluation,
  critiqueSchema,
  type Critique,
  critiqueEvaluationSchema,
  type CritiqueEvaluation,

  // Result types
  type VerificationResult,
  type ModifyProposal,
  type ProtocolVersion,
  type ProtocolQuestion,

  // Utility functions
  normalizeProtocol,
  isLegacyProtocol,
} from '@protocol/shared/schemas/protocol';
