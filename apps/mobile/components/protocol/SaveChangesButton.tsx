import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';

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
      style={[
        styles.button,
        (loading || disabled) && styles.buttonDisabled,
      ]}
      onPress={onPress}
      disabled={loading || disabled}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Text style={styles.buttonText}>Save changes</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#2d5a2d',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
