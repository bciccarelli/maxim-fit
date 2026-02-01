import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { supabase } from '@/lib/supabase';

// Track if Google Sign-In was successfully configured
let isGoogleSignInConfigured = false;

// Configure Google Sign-In (call once at app startup)
export function configureGoogleSignIn() {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

  if (!webClientId || !iosClientId) {
    console.warn('Google Sign-In not configured: missing client IDs');
    return;
  }

  try {
    GoogleSignin.configure({
      webClientId,
      iosClientId,
    });
    isGoogleSignInConfigured = true;
  } catch (error) {
    console.error('Failed to configure Google Sign-In:', error);
  }
}

export function isGoogleSignInAvailable(): boolean {
  return isGoogleSignInConfigured;
}

export async function signInWithGoogle(): Promise<{ error: Error | null }> {
  // Configure lazily if not already configured
  if (!isGoogleSignInConfigured) {
    configureGoogleSignIn();
  }

  if (!isGoogleSignInConfigured) {
    return { error: new Error('Google Sign-In is not available') };
  }

  try {
    // Check if Google Play Services are available (Android)
    await GoogleSignin.hasPlayServices();

    // Perform sign-in
    const response = await GoogleSignin.signIn();

    if (!response.data?.idToken) {
      throw new Error('No ID token received from Google');
    }

    // Exchange Google token for Supabase session
    // Note: For native mobile, Supabase should have "Skip nonce check" enabled
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: response.data.idToken,
    });

    return { error: error as Error | null };
  } catch (error: unknown) {
    // Handle specific Google Sign-In errors
    if (error && typeof error === 'object' && 'code' in error) {
      const code = (error as { code: string }).code;
      if (code === statusCodes.SIGN_IN_CANCELLED) {
        return { error: null }; // User cancelled, not an error
      }
      if (code === statusCodes.IN_PROGRESS) {
        return { error: new Error('Sign in already in progress') };
      }
      if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return { error: new Error('Google Play Services not available') };
      }
    }
    return { error: error as Error };
  }
}

export async function signOutFromGoogle() {
  if (!isGoogleSignInConfigured) {
    return; // Nothing to sign out from
  }

  try {
    await GoogleSignin.signOut();
  } catch (error) {
    console.error('Error signing out from Google:', error);
  }
}
