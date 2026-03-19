import { View, Text, Switch, StyleSheet } from 'react-native';
import { colors } from '@/lib/theme';

type Props = {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  indent?: boolean;
};

export function NotificationToggleRow({
  label,
  value,
  onChange,
  disabled = false,
  indent = false,
}: Props) {
  return (
    <View style={[styles.row, indent && styles.indented]}>
      <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: colors.outlineVariant, true: colors.primaryContainer }}
        thumbColor={colors.surfaceContainerLowest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  indented: {
    paddingLeft: 24,
  },
  label: {
    fontSize: 14,
    color: colors.onSurface,
  },
  labelDisabled: {
    color: colors.onSurfaceVariant,
  },
});
