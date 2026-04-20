import { View, Text, type ViewStyle, type StyleProp } from 'react-native';
import { mf, fonts } from '@/lib/theme';
import { trackedSm } from '@/lib/mfStyles';

type Tone = 'default' | 'good' | 'warn' | 'bad';
type Size = 'sm' | 'md' | 'lg';

type Props = {
  value: string | number;
  label: string;
  tone?: Tone;
  size?: Size;
  suffix?: string;
  style?: StyleProp<ViewStyle>;
  bare?: boolean; // no border/background — inline chip
};

const toneColor: Record<Tone, string> = {
  default: mf.fg,
  good: mf.verified,
  warn: mf.warn,
  bad: mf.bad,
};

const sizeMap: Record<Size, number> = { sm: 20, md: 28, lg: 36 };

export function ScoreTile({ value, label, tone = 'default', size = 'md', suffix, style, bare }: Props) {
  const num = sizeMap[size];
  return (
    <View
      style={[
        bare
          ? null
          : {
              backgroundColor: mf.surface,
              borderWidth: 1,
              borderColor: mf.line,
              paddingVertical: 8,
              paddingHorizontal: 10,
            },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <Text
          style={{
            fontFamily: fonts.monoMedium,
            fontSize: num,
            color: toneColor[tone],
            letterSpacing: -0.5,
            lineHeight: num,
            fontVariant: ['tabular-nums'],
          }}
        >
          {value}
        </Text>
        {suffix ? (
          <Text
            style={{
              fontFamily: fonts.mono,
              fontSize: Math.round(num * 0.45),
              color: mf.fg3,
              marginLeft: 2,
            }}
          >
            {suffix}
          </Text>
        ) : null}
      </View>
      <Text style={[trackedSm(mf.fg3), { fontSize: 9, marginTop: 6, letterSpacing: 1.4 }]}>{label}</Text>
    </View>
  );
}
