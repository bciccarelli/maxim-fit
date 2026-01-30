// Centralized theme constants for the Protocol mobile app
// Following the forest green design system from CLAUDE.md

export const colors = {
  // Primary - Forest Green palette
  primary: '#2d5a2d',
  primaryDark: '#1a2e1a',
  primaryLight: '#3d7a3d',

  // Backgrounds
  background: '#f5f5f0',
  card: '#ffffff',

  // Text
  text: '#1a2e1a',
  textSecondary: '#666666',
  textMuted: '#999999',

  // Borders
  border: '#e0e0e0',
  borderLight: '#e5e5e5',

  // Status
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',

  // Social buttons
  google: '#ffffff',
  googleText: '#1f1f1f',
  apple: '#000000',
  appleText: '#ffffff',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
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
