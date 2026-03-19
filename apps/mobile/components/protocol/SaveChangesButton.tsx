import { Pressable, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, fontSize } from '@/lib/theme';

interface SaveChangesButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function SaveChangesButton({
  onPress,
  loading = false,
  disabled = false,
}: SaveChangesButtonProps) {
  return (
    <Pressable
      style={[(loading || disabled) && styles.buttonDisabled]}
      onPress={onPress}
      disabled={loading || disabled}
    >
      {(loading || disabled) ? (
        <View style={[styles.button, styles.buttonDisabledBg]}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Text style={styles.buttonText}>Save changes</Text>
          )}
        </View>
      ) : (
        <LinearGradient
          colors={[colors.primary, colors.primaryContainer]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Save changes</Text>
        </LinearGradient>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonDisabledBg: {
    backgroundColor: colors.primaryContainer,
  },
  buttonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
});
