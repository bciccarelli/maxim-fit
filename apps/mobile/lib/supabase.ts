import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// SecureStore options for iOS - AFTER_FIRST_UNLOCK allows access when device
// is locked (but has been unlocked at least once since boot), preventing
// "User interaction is not allowed" errors during background token refresh
const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

// SecureStore adapter for Supabase auth persistence (native only)
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      // Use localStorage on web
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
      return null;
    }
    try {
      return await SecureStore.getItemAsync(key, secureStoreOptions);
    } catch (error) {
      // Handle Keychain access errors gracefully (e.g., device locked)
      console.warn('SecureStore getItem failed:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value, secureStoreOptions);
    } catch (error) {
      console.warn('SecureStore setItem failed:', error);
    }
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key, secureStoreOptions);
    } catch (error) {
      console.warn('SecureStore removeItem failed:', error);
    }
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
