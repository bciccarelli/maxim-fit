// Clinical Dossier design system for Maxim Fit
// Based on Stitch project "Maxim Fit" (ID: 12512777690207007321)
//
// Color mapping from old → new:
// '#fff'/'#ffffff'      → colors.surfaceContainerLowest
// '#f5f5f0'             → colors.surface
// '#f9f9f7'/'#f0f0f0'   → colors.surfaceContainerLow
// '#2d5a2d'             → colors.primaryContainer
// '#1a2e1a'/'#1a1c19'   → colors.onSurface
// '#666'/'#666666'      → colors.onSurfaceVariant
// '#999'/'#999999'      → colors.onSurfaceVariant
// '#e5e5e5'/'#e0e0e0'   → colors.outlineVariant (or remove)
// '#c62828'             → colors.destructive

export const colors = {
  // Surfaces (hierarchy — depth via background shifts, not borders)
  surface: '#fafaf5',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f4f4ef',
  surfaceContainer: '#eeeee9',
  surfaceContainerHigh: '#e8e8e3',
  surfaceContainerHighest: '#e3e3de',

  // Text (green-tinted grays — never pure gray)
  onSurface: '#1a1c19',
  onSurfaceVariant: '#42493f',

  // Outline (borders — use sparingly, prefer background shifts)
  outline: '#72796e',
  outlineVariant: '#c1c9bc',

  // Primary — deep forest green
  primary: '#154218',
  primaryContainer: '#2d5a2d',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#9dd097',
  primaryFixed: '#bcf0b5',
  primaryFixedDim: '#a1d39a',

  // Secondary
  secondary: '#50634d',
  secondaryContainer: '#d3e9cc',

  // Status
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  destructive: '#c62828',

  // Semantic
  selectedBg: '#e8f5e9',
  info: '#0284c7',

  // Social buttons
  google: '#ffffff',
  googleText: '#1f1f1f',
  apple: '#000000',
  appleText: '#ffffff',

  // Legacy aliases (for gradual migration — prefer new names)
  background: '#fafaf5',
  card: '#ffffff',
  text: '#1a1c19',
  textSecondary: '#42493f',
  textMuted: '#42493f',
  border: '#c1c9bc',
  borderLight: '#c1c9bc',
  primaryDark: '#154218',
  primaryLight: '#3d7a3d',
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
