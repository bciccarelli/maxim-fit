import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize } from '@/lib/theme';

interface DividerProps {
  text?: string;
}

export function Divider({ text = 'or continue with email' }: DividerProps) {
  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <Text style={styles.text}>{text}</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.outlineVariant,
  },
  text: {
    paddingHorizontal: spacing.md,
    fontSize: fontSize.xs,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
