import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'has_completed_onboarding';

export async function getHasCompletedOnboarding(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  } catch {
    return false;
  }
}

export async function setHasCompletedOnboarding(completed: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, completed ? 'true' : 'false');
}
