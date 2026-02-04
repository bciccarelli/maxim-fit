import { supabase } from './supabase';

// API base URL - uses the web app's API routes
// In production, this would be your deployed web app URL
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Error thrown when a Pro subscription is required for a feature.
 * Includes the current tier so UI can show appropriate upgrade prompts.
 */
export class UpgradeRequiredError extends Error {
  readonly code = 'UPGRADE_REQUIRED';
  readonly currentTier: string;

  constructor(message: string, currentTier: string = 'free') {
    super(message);
    this.name = 'UpgradeRequiredError';
    this.currentTier = currentTier;
  }
}

/**
 * Build a full API URL from a path
 */
export function apiUrl(path: string): string {
  // Remove trailing slash from base and leading slash from path to avoid double slashes
  const base = API_BASE_URL.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

/**
 * Get auth headers for API requests
 * Includes the Supabase auth token for authenticated endpoints
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();

  const headers: Record<string, string> = {};

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  return headers;
}

/**
 * Make an authenticated API request
 */
export async function fetchApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = await getAuthHeaders();

  const response = await fetch(apiUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));

    // Handle 402 Payment Required (Pro subscription required)
    if (response.status === 402) {
      throw new UpgradeRequiredError(
        error.error || 'This feature requires a Pro subscription',
        error.currentTier || 'free'
      );
    }

    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}
