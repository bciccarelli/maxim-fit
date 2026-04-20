import { View, Text, type ViewStyle, type StyleProp } from 'react-native';
import { mf, fonts } from '@/lib/theme';
import { trackedSm } from '@/lib/mfStyles';

type Props = {
  title: string;
  titleRight?: React.ReactNode;
  eyebrow?: string;
  sub?: string;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function MFHeader({ title, titleRight, eyebrow = 'MAXIM · FIT', sub, right, style }: Props) {
  return (
    <View
      style={[
        {
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: mf.line,
          backgroundColor: mf.bg,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={trackedSm(mf.fg3)}>{eyebrow}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <Text
              numberOfLines={1}
              style={{
                fontFamily: fonts.sansMedium,
                fontSize: 22,
                color: mf.fg,
                letterSpacing: -0.4,
                flexShrink: 1,
              }}
            >
              {title}
            </Text>
            {titleRight}
          </View>
        </View>
        {right ? <View style={{ marginLeft: 12 }}>{right}</View> : null}
      </View>
      {sub ? (
        <Text
          style={{
            fontFamily: fonts.mono,
            fontSize: 11,
            color: mf.fg3,
            marginTop: 6,
            letterSpacing: 0.4,
          }}
        >
          {sub}
        </Text>
      ) : null}
    </View>
  );
}
