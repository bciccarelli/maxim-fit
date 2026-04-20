import { View, Text, type ViewStyle, type StyleProp } from 'react-native';
import { mf, fonts } from '@/lib/theme';

type Variant = 'default' | 'verified' | 'warn' | 'bad' | 'accent';

type Props = {
  label: string;
  variant?: Variant;
  leading?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
};

export function Chip({ label, variant = 'default', leading, style, small }: Props) {
  const color =
    variant === 'verified' ? mf.verified :
    variant === 'warn' ? mf.warn :
    variant === 'bad' ? mf.bad :
    variant === 'accent' ? mf.accent :
    mf.fg2;
  const borderColor =
    variant === 'default' ? mf.line2 : color;

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          borderWidth: 1,
          borderColor,
          paddingHorizontal: small ? 5 : 8,
          paddingVertical: small ? 1 : 3,
        },
        style,
      ]}
    >
      {leading}
      <Text
        style={{
          fontFamily: fonts.mono,
          fontSize: small ? 9 : 10,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
