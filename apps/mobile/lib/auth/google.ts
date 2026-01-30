import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { supabase } from '@/lib/supabase';

// Configure Google Sign-In (call once at app startup)
export function configureGoogleSignIn() {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    offlineAccess: true,
  });
}

export async function signInWithGoogle(): Promise<{ error: Error | null }> {
  try {
    // Check if Google Play Services are available (Android)
    await GoogleSignin.hasPlayServices();

    // Perform sign-in
    const response = await GoogleSignin.signIn();

    if (!response.data?.idToken) {
      throw new Error('No ID token received from Google');
    }

    // Exchange Google token for Supabase session
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
  try {
    await GoogleSignin.signOut();
  } catch (error) {
    console.error('Error signing out from Google:', error);
  }
}
