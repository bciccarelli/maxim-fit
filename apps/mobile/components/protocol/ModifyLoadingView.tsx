import { View, Text, StyleSheet, Platform } from 'react-native';
import { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '@/lib/theme';

interface ModifyLoadingViewProps {
  statusHistory: string[];
}

// Pulsing rings header showing AI activity
function ProcessingHeader() {
  const ring1Scale = useSharedValue(0.6);
  const ring2Scale = useSharedValue(0.4);
  const ring3Scale = useSharedValue(0.2);
  const ring1Opacity = useSharedValue(0.8);
  const ring2Opacity = useSharedValue(0.6);
  const ring3Opacity = useSharedValue(0.4);

  useEffect(() => {
    // Staggered pulsing animations
    ring1Scale.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
        withTiming(0.6, { duration: 1500, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
      ),
      -1,
      false
    );
    ring1Opacity.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: 1500 }),
        withTiming(0.8, { duration: 1500 })
      ),
      -1,
      false
    );

    // Delayed start for ring 2
    setTimeout(() => {
      ring2Scale.value = withRepeat(
        withSequence(
          withTiming(0.85, { duration: 1500, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
          withTiming(0.4, { duration: 1500, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
        ),
        -1,
        false
      );
      ring2Opacity.value = withRepeat(
        withSequence(
          withTiming(0.15, { duration: 1500 }),
          withTiming(0.6, { duration: 1500 })
        ),
        -1,
        false
      );
    }, 300);

    // Delayed start for ring 3
    setTimeout(() => {
      ring3Scale.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 1500, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
          withTiming(0.2, { duration: 1500, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
        ),
        -1,
        false
      );
      ring3Opacity.value = withRepeat(
        withSequence(
          withTiming(0.1, { duration: 1500 }),
          withTiming(0.4, { duration: 1500 })
        ),
        -1,
        false
      );
    }, 600);
  }, []);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }],
    opacity: ring1Opacity.value,
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: ring2Opacity.value,
  }));

  const ring3Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring3Scale.value }],
    opacity: ring3Opacity.value,
  }));

  return (
    <View style={styles.headerContainer}>
      <View style={styles.ringsContainer}>
        <Animated.View style={[styles.ring, styles.ring1, ring1Style]} />
        <Animated.View style={[styles.ring, styles.ring2, ring2Style]} />
        <Animated.View style={[styles.ring, styles.ring3, ring3Style]} />
        <View style={styles.centerDot} />
      </View>
      <Text style={styles.headerTitle}>Modifying Protocol</Text>
      <Text style={styles.headerSubtitle}>PROCESSING</Text>
    </View>
  );
}

// Custom SVG spinner with rotating arc
function SpinnerIndicator() {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1000, easing: Easing.linear }),
      -1,
      false
    );
    scale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[styles.spinnerContainer, spinnerStyle]}>
      <Svg width={22} height={22} viewBox="0 0 22 22">
        <Circle
          cx={11}
          cy={11}
          r={8}
          stroke={colors.primary}
          strokeWidth={2.5}
          fill="none"
          strokeDasharray="16 34"
          strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
  );
}

// Current step view
function CurrentStepView({ currentStep }: { currentStep: string }) {
  const cleanStep = currentStep.replace(/\.{3}$/, '');

  return (
    <View style={styles.currentStepContainer}>
      <View style={styles.currentStepRow}>
        <SpinnerIndicator />
        <Text style={styles.currentStepTitle}>Making changes...</Text>
      </View>
      <Text style={styles.currentStepSubtitle}>{cleanStep}</Text>
    </View>
  );
}

export function ModifyLoadingView({ statusHistory }: ModifyLoadingViewProps) {
  const currentStep = statusHistory[statusHistory.length - 1] || 'Researching...';

  return (
    <View style={styles.container}>
      <ProcessingHeader />
      <View style={styles.divider} />
      <CurrentStepView currentStep={currentStep} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 24,
  },

  // Processing Header
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  ringsContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 999,
  },
  ring1: {
    width: 80,
    height: 80,
  },
  ring2: {
    width: 60,
    height: 60,
  },
  ring3: {
    width: 40,
    height: 40,
  },
  centerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
    marginBottom: 24,
  },

  // Spinner
  spinnerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Current Step View
  currentStepContainer: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  currentStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currentStepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  currentStepSubtitle: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: colors.textMuted,
    marginTop: 8,
  },
});
