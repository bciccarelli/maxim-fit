import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { colors } from '@/lib/theme';

interface OnboardingProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

function Segment({ isFilled }: { isFilled: boolean }) {
  const animatedStyle = useAnimatedStyle(() => ({
    flex: 1,
    height: 4,
    backgroundColor: withTiming(
      isFilled ? colors.primaryContainer : colors.outlineVariant,
      { duration: 300, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }
    ),
  }));

  return <Animated.View style={animatedStyle} />;
}

export function OnboardingProgressBar({ currentStep, totalSteps }: OnboardingProgressBarProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: totalSteps }, (_, i) => (
        <Segment key={i} isFilled={i <= currentStep} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 2,
  },
});
