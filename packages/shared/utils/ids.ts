/** Element type prefixes for readable, typed IDs */
export const ELEMENT_PREFIXES = {
  schedule: 'sv',
  other_event: 'oe',
  routine_event: 're',
  routine_sub_event: 'rs',
  meal: 'ml',
  supplement: 'sp',
  workout: 'wk',
  exercise: 'ex',
} as const;

export type ElementPrefix = typeof ELEMENT_PREFIXES[keyof typeof ELEMENT_PREFIXES];

/**
 * Generate a short, prefixed element ID.
 * Format: {prefix}_{8 hex chars} e.g., ml_a1b2c3d4
 * Uses globalThis.crypto (available in Node.js, browsers, and React Native Hermes)
 * with a Math.random fallback.
 */
export function generateElementId(prefix: string): string {
  let suffix: string;
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    suffix = globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 8);
  } else {
    suffix = Math.random().toString(16).slice(2, 10).padEnd(8, '0');
  }
  return `${prefix}_${suffix}`;
}
