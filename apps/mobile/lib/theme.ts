// Maxim Fit — Dark Forest Clinical design system
//
// Primary palette ported from mf-styles.css. Tokens are additive:
// new consumers should use `mf.*` tokens; legacy `colors.*` names remain
// to avoid breaking un-migrated screens while we retheme piece by piece.

export const mf = {
  // Surfaces
  bg: '#0F1F17',
  bg2: '#0A1711',
  surface: '#13271C',
  surface2: '#18301F',

  // Lines / borders
  line: '#1F3D2B',
  line2: '#2A5A3E',

  // Foreground
  fg: '#E8EEE6',
  fg2: '#B8C5B2',
  fg3: '#6B7D68',
  fg4: '#4A5A48',

  // Accent + semantic
  accent: '#4AA373',
  accent2: '#6BC491',
  warn: '#D4A84A',
  bad: '#C06A52',
  verified: '#6BC491',

  // Event-type accents for the schedule timeline
  eventSleep: '#6B7D68',
  eventMeal: '#5C8AA8',
  eventWorkout: '#C08A4A',
  eventSupp: '#8A7DB0',
  eventWork: '#4A5A48',
  eventOther: '#2A5A3E',
} as const;

export const fonts = {
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemibold: 'Inter_600SemiBold',
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
  monoSemibold: 'JetBrainsMono_600SemiBold',
} as const;

// Legacy color aliases — map old names onto the new dark palette so
// un-migrated components still render with reasonable dark colors.
// Prefer `mf.*` in new code.
export const colors = {
  // Surfaces
  surface: mf.bg,
  surfaceContainerLowest: mf.bg2,
  surfaceContainerLow: mf.surface,
  surfaceContainer: mf.surface,
  surfaceContainerHigh: mf.surface2,
  surfaceContainerHighest: mf.surface2,

  // Text
  onSurface: mf.fg,
  onSurfaceVariant: mf.fg2,

  // Outline
  outline: mf.line2,
  outlineVariant: mf.line,

  // Primary — accent green
  primary: mf.accent,
  primaryContainer: mf.accent,
  onPrimary: mf.bg2,
  onPrimaryContainer: mf.bg2,
  primaryFixed: mf.accent2,
  primaryFixedDim: mf.accent,

  // Secondary
  secondary: mf.fg2,
  secondaryContainer: mf.surface2,

  // Status
  success: mf.verified,
  warning: mf.warn,
  error: mf.bad,
  errorContainer: mf.surface,
  destructive: mf.bad,

  // Semantic
  selectedBg: mf.surface2,
  info: '#5C8AA8',

  // Social buttons
  google: '#ffffff',
  googleText: '#1f1f1f',
  apple: '#000000',
  appleText: '#ffffff',

  // Legacy aliases
  background: mf.bg,
  card: mf.surface,
  text: mf.fg,
  textSecondary: mf.fg2,
  textMuted: mf.fg3,
  border: mf.line,
  borderLight: mf.line,
  primaryDark: mf.accent,
  primaryLight: mf.accent2,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const borderRadius = {
  sm: 0,
  md: 0,
  lg: 0,
  xl: 0,
  full: 9999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
} as const;
