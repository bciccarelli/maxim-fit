import { View, Text, StyleSheet, Platform } from 'react-native';
import { useEffect, useState, useRef, memo } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
  FadeIn,
  SlideInRight,
  interpolate,
} from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '@/lib/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ModifyLoadingViewProps {
  statusHistory: string[];
}

const ITEM_HEIGHT = 52;

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

// Animated vertical connector line
function TimelineConnector({ itemCount }: { itemCount: number }) {
  const lineHeight = useSharedValue(0);

  useEffect(() => {
    if (itemCount > 0) {
      const targetHeight = (itemCount - 1) * ITEM_HEIGHT + ITEM_HEIGHT / 2;
      lineHeight.value = withSpring(targetHeight, {
        damping: 20,
        stiffness: 90,
      });
    }
  }, [itemCount]);

  const lineStyle = useAnimatedStyle(() => ({
    height: lineHeight.value,
  }));

  if (itemCount <= 1) return null;

  return <Animated.View style={[styles.connectorLine, lineStyle]} />;
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

// Checkmark with bounce animation
function CheckmarkIndicator() {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 150 });
    scale.value = withSpring(1, {
      damping: 8,
      stiffness: 200,
      overshootClamping: false,
    });
  }, []);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.checkContainer, checkStyle]}>
      <Check size={16} color={colors.primary} strokeWidth={3} />
    </Animated.View>
  );
}

// Typewriter text with blinking cursor
const TypewriterText = memo(function TypewriterText({
  text,
  isActive
}: {
  text: string;
  isActive: boolean;
}) {
  const [displayedText, setDisplayedText] = useState(isActive ? '' : text);
  const cursorOpacity = useSharedValue(1);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!isActive) {
      setDisplayedText(text);
      return;
    }

    indexRef.current = 0;
    setDisplayedText('');

    const interval = setInterval(() => {
      indexRef.current++;
      if (indexRef.current <= text.length) {
        setDisplayedText(text.slice(0, indexRef.current));
      } else {
        clearInterval(interval);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [text, isActive]);

  useEffect(() => {
    if (isActive) {
      cursorOpacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 400, easing: Easing.linear }),
          withTiming(1, { duration: 400, easing: Easing.linear })
        ),
        -1,
        false
      );
    } else {
      cursorOpacity.value = 0;
    }
  }, [isActive]);

  const cursorStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
  }));

  return (
    <View style={styles.textContainer}>
      <Text
        style={[
          styles.statusText,
          isActive && styles.statusTextActive
        ]}
        numberOfLines={1}
      >
        {displayedText}
      </Text>
      {isActive && <Animated.View style={[styles.cursor, cursorStyle]} />}
    </View>
  );
});

// Individual status item with entrance animation
const StatusItem = memo(function StatusItem({
  status,
  isActive,
  isComplete,
  index,
}: {
  status: string;
  isActive: boolean;
  isComplete: boolean;
  index: number;
}) {
  // Clean up status text (remove trailing "...")
  const cleanStatus = status.replace(/\.{3}$/, '');

  return (
    <Animated.View
      style={styles.statusItem}
      entering={SlideInRight.duration(250).delay(index === 0 ? 0 : 50).easing(Easing.out(Easing.cubic))}
    >
      <View style={styles.indicatorContainer}>
        {isActive && <SpinnerIndicator />}
        {isComplete && <CheckmarkIndicator />}
      </View>
      <TypewriterText text={cleanStatus} isActive={isActive} />
    </Animated.View>
  );
});

// Collapsed view showing summary with current step
function CollapsedView({ currentStep }: { currentStep: string }) {
  const cleanStep = currentStep.replace(/\.{3}$/, '');

  return (
    <View style={styles.collapsedContainer}>
      <View style={styles.collapsedRow}>
        <SpinnerIndicator />
        <Text style={styles.collapsedTitle}>Making changes...</Text>
      </View>
      <Text style={styles.collapsedSubtitle}>{cleanStep}</Text>
    </View>
  );
}

export function ModifyLoadingView({ statusHistory }: ModifyLoadingViewProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const hasCollapsedRef = useRef(false);

  // Auto-collapse after 2+ items
  useEffect(() => {
    if (statusHistory.length >= 2 && !hasCollapsedRef.current) {
      hasCollapsedRef.current = true;
      // Small delay to let the second item animate in
      const timer = setTimeout(() => {
        setIsCollapsed(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [statusHistory.length]);

  const currentStep = statusHistory[statusHistory.length - 1] || 'Researching...';

  return (
    <View style={styles.container}>
      <ProcessingHeader />

      <View style={styles.divider} />

      {isCollapsed ? (
        <CollapsedView currentStep={currentStep} />
      ) : (
        <View style={styles.timeline}>
          <TimelineConnector itemCount={statusHistory.length} />
          {statusHistory.map((status, index) => (
            <StatusItem
              key={`${status}-${index}`}
              status={status}
              isActive={index === statusHistory.length - 1}
              isComplete={index < statusHistory.length - 1}
              index={index}
            />
          ))}
        </View>
      )}
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

  // Timeline
  timeline: {
    paddingHorizontal: 20,
    position: 'relative',
  },
  connectorLine: {
    position: 'absolute',
    left: 30,
    top: ITEM_HEIGHT / 2,
    width: 2,
    backgroundColor: colors.primary,
    opacity: 0.25,
    borderRadius: 1,
  },

  // Status Item
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ITEM_HEIGHT,
    gap: 14,
  },
  indicatorContainer: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  spinnerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Typewriter Text
  textContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: colors.textSecondary,
  },
  statusTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  cursor: {
    width: 2,
    height: 16,
    backgroundColor: colors.primary,
    marginLeft: 2,
    borderRadius: 1,
  },

  // Collapsed View
  collapsedContainer: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  collapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  collapsedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  collapsedSubtitle: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: colors.textMuted,
    marginTop: 8,
  },
});
