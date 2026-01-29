// Re-export all user config schemas and types from shared package
// This allows existing imports to continue working while
// enabling shared code between web and mobile

export {
  personalInfoSchema,
  type PersonalInfo,
  anonymousPersonalInfoSchema,
  type AnonymousPersonalInfo,
  goalSchema,
  type Goal,
  userConfigSchema,
  type UserConfig,
  anonymousUserConfigSchema,
  type AnonymousUserConfig,
  requirementSchema,
  type Requirement,
  parsedRequirementsSchema,
  type ParsedRequirements,
} from '@protocol/shared/schemas/user-config';
