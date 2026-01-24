import { z } from 'zod';

// =============================================================================
// User Configuration Schemas
// =============================================================================

export const personalInfoSchema = z.object({
  age: z.number().int().min(18).max(120),
  weight_lbs: z.number().positive(),
  height_in: z.number().positive(),
  sex: z.enum(['male', 'female', 'other']),
  genetic_background: z.string(),
  health_conditions: z.array(z.string()),
  fitness_level: z.enum(['beginner', 'intermediate', 'advanced']),
  dietary_restrictions: z.array(z.string()),
});

export type PersonalInfo = z.infer<typeof personalInfoSchema>;

// Schema for anonymous users (no advanced fitness level)
export const anonymousPersonalInfoSchema = personalInfoSchema.extend({
  fitness_level: z.enum(['beginner', 'intermediate']),
});

export type AnonymousPersonalInfo = z.infer<typeof anonymousPersonalInfoSchema>;

export const goalSchema = z.object({
  name: z.string().min(1),
  weight: z.number().min(0).max(1),
  description: z.string(),
});

export type Goal = z.infer<typeof goalSchema>;

export const userConfigSchema = z.object({
  personal_info: personalInfoSchema,
  goals: z.array(goalSchema).min(1).refine(
    (goals) => {
      const sum = goals.reduce((acc, g) => acc + g.weight, 0);
      return Math.abs(sum - 1.0) < 0.001;
    },
    { message: 'Goal weights must sum to 1.0' }
  ),
  requirements: z.array(z.string()),
  iterations: z.number().int().min(1).max(10).default(3),
});

export type UserConfig = z.infer<typeof userConfigSchema>;

// Schema for anonymous users
export const anonymousUserConfigSchema = z.object({
  personal_info: anonymousPersonalInfoSchema,
  goals: z.array(goalSchema).min(1).refine(
    (goals) => {
      const sum = goals.reduce((acc, g) => acc + g.weight, 0);
      return Math.abs(sum - 1.0) < 0.001;
    },
    { message: 'Goal weights must sum to 1.0' }
  ),
  requirements: z.array(z.string()),
});

export type AnonymousUserConfig = z.infer<typeof anonymousUserConfigSchema>;

export const requirementSchema = z.object({
  name: z.string(),
  description: z.string(),
  target_value: z.number().optional().nullable(),
  unit: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
});

export type Requirement = z.infer<typeof requirementSchema>;

export const parsedRequirementsSchema = z.object({
  requirements: z.array(requirementSchema),
});

export type ParsedRequirements = z.infer<typeof parsedRequirementsSchema>;
