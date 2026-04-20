import { View, Text, ActivityIndicator } from 'react-native';
import { Check } from 'lucide-react-native';
import { mf, fonts } from '@/lib/theme';

export type Stage = { label: string; sub?: string };

type Props = {
  stages: Stage[];
  active: number; // -1 when all done
  done: number[]; // indices completed
};

export function StreamingStages({ stages, active, done }: Props) {
  return (
    <View style={{ gap: 14 }}>
      {stages.map((s, i) => {
        const isDone = done.includes(i);
        const isActive = active === i;
        const color = isDone ? mf.verified : isActive ? mf.accent : mf.fg4;
        return (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View
              style={{
                width: 20,
                height: 20,
                borderWidth: 1,
                borderColor: color,
                backgroundColor: isDone ? mf.accent : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isDone ? (
                <Check size={12} color={mf.bg2} strokeWidth={3} />
              ) : isActive ? (
                <ActivityIndicator size="small" color={mf.accent} />
              ) : null}
            </View>
            <View style={{ flex: 1, paddingTop: 1 }}>
              <Text
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 11,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  color,
                }}
              >
                {s.label}
              </Text>
              {s.sub ? (
                <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: mf.fg3, marginTop: 3 }}>
                  {s.sub}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
