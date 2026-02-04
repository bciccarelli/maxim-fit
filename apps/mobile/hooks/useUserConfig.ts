import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchApi } from '@/lib/api';
import type { PersonalInfo, Goal } from '@protocol/shared/schemas';

export interface UserConfig {
  personal_info: PersonalInfo;
  goals: Goal[];
  requirements: string[];
}

interface UseUserConfigReturn {
  /** The user's default config, or null if none exists */
  config: UserConfig | null;
  /** Whether config is being loaded */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Refresh config from server */
  refresh: () => Promise<void>;
  /** Save updated config to server */
  saveConfig: (config: UserConfig) => Promise<void>;
  /** Whether save is in progress */
  isSaving: boolean;
}

/**
 * Hook for fetching and saving user configuration.
 * Returns the user's default config (personal info, goals, requirements).
 */
export function useUserConfig(): UseUserConfigReturn {
  const { user } = useAuth();
  const [config, setConfig] = useState<UserConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setConfig(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchApi<{ config: UserConfig | null }>('/api/config');
      setConfig(data.config);
    } catch (err) {
      console.error('Error fetching user config:', err);
      setError(err instanceof Error ? err.message : 'Failed to load config');
      setConfig(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const saveConfig = useCallback(async (newConfig: UserConfig) => {
    setIsSaving(true);
    setError(null);

    try {
      await fetchApi<{ id: string }>('/api/config', {
        method: 'POST',
        body: JSON.stringify({ config: newConfig }),
      });
      setConfig(newConfig);
    } catch (err) {
      console.error('Error saving user config:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save config';
      setError(errorMessage);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    config,
    isLoading,
    error,
    refresh,
    saveConfig,
    isSaving,
  };
}
