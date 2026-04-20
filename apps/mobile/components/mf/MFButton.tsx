import { Pressable, Text, View, ActivityIndicator, type PressableProps, type ViewStyle, type StyleProp } from 'react-native';
import { mf, fonts } from '@/lib/theme';

export type MFButtonVariant = 'primary' | 'ghost' | 'outline';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  variant?: MFButtonVariant;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function MFButton({
  label,
  variant = 'primary',
  leading,
  trailing,
  loading,
  disabled,
  size = 'md',
  fullWidth,
  style,
  ...rest
}: Props) {
  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';
  const vpad = size === 'sm' ? 6 : 10;
  const hpad = size === 'sm' ? 10 : 14;
  const bg = isPrimary ? mf.accent : 'transparent';
  const borderColor = isPrimary ? mf.accent : isGhost ? mf.line : mf.line2;
  const color = isPrimary ? mf.bg2 : isGhost ? mf.fg2 : mf.fg;

  return (
    <Pressable
      {...rest}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          backgroundColor: bg,
          borderWidth: 1,
          borderColor,
          paddingVertical: vpad,
          paddingHorizontal: hpad,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <>
          {leading ? <View>{leading}</View> : null}
          <Text
            style={{
              fontFamily: fonts.mono,
              fontSize: size === 'sm' ? 10 : 12,
              letterSpacing: 1.0,
              textTransform: 'uppercase',
              color,
              fontWeight: isPrimary ? '600' : '500',
            }}
          >
            {label}
          </Text>
          {trailing ? <View>{trailing}</View> : null}
        </>
      )}
    </Pressable>
  );
}
