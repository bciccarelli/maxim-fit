import { PropsWithChildren } from 'react';
import {
  InputAccessoryView,
  View,
  Text,
  Pressable,
  Keyboard,
  Platform,
  StyleSheet,
} from 'react-native';
import { colors } from '@/lib/theme';

export const KEYBOARD_ACCESSORY_ID = 'app-keyboard-accessory';

export function KeyboardAccessoryProvider({ children }: PropsWithChildren) {
  return (
    <>
      {children}
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={KEYBOARD_ACCESSORY_ID}>
          <View style={styles.accessoryContainer}>
            <View style={styles.spacer} />
            <Pressable
              onPress={() => Keyboard.dismiss()}
              style={styles.doneButton}
              hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
            >
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  accessoryContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  spacer: {
    flex: 1,
  },
  doneButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  doneText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primaryContainer,
  },
});
