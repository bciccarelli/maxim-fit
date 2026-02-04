import { z } from 'zod';

// =============================================================================
// User Configuration Schemas
// =============================================================================

export const personalInfoSchema = z.object({
  age: z.number().int().min(18).max(120),
  weight_lbs: z.number().positive(),
  height_in: z.number().positive(),
  sex: z.enum(['male', 'female', 'other']),
  lifestyle_considerations: z.array(z.string()),
  fitness_level: z.enum(['beginner', 'intermediate', 'advanced']),
  dietary_restrictions: z.array(z.string()),
});

export type PersonalInfo = z.infer<typeof personalInfoSchema>;

// Schema for anonymous users
export const anonymousPersonalInfoSchema = personalInfoSchema;

export type AnonymousPersonalInfo = z.infer<typeof anonymousPersonalInfoSchema>;

export const goalSchema = z.object({
  name: z.string().min(1),
  weight: z.number().min(0).max(1),
  description: z.string().optional(),
});

export type Goal = z.infer<typeof goalSchema>;

export const userConfigSchema = z.object({
  personal_info: personalInfoSchema,
  goals: z.array(goalSchema).min(1),
  requirements: z.array(z.string()),
  iterations: z.number().int().min(1).max(10).default(3),
});

export type UserConfig = z.infer<typeof userConfigSchema>;

// Schema for anonymous users
export const anonymousUserConfigSchema = z.object({
  personal_info: anonymousPersonalInfoSchema,
  goals: z.array(goalSchema).min(1),
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
