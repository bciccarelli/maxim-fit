import AsyncStorage from '@react-native-async-storage/async-storage';

// Arm the tip when the user completes the onboarding wizard. The protocols
// screen reads + clears it on mount so the tip appears exactly once, only for
// genuinely new users — returning users on fresh installs bypass it.
const KEY = 'show_protocol_editing_tip_pending';

export async function armProtocolEditingTip(): Promise<void> {
  await AsyncStorage.setItem(KEY, 'true');
}

export async function consumeProtocolEditingTip(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(KEY);
    if (stored === 'true') {
      await AsyncStorage.removeItem(KEY);
      return true;
    }
  } catch {
    /* fall through */
  }
  return false;
}
