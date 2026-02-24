import React, { useCallback, useState, type ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import type { ScheduleEvent, ScheduleEventSource } from '@protocol/shared';

// Timeline constants (must match ScheduleSection)
const HOUR_HEIGHT = 48;
const RESIZE_HANDLE_HEIGHT = 16;
const SNAP_INCREMENT = 5; // minutes
const MIN_DURATION = 5; // minimum event duration in minutes

type DragMode = 'none' | 'move' | 'resize-top' | 'resize-bottom';

interface DraggableEventBlockProps {
  event: ScheduleEvent;
  index: number;
  rangeStartMin: number;
  rangeEndMin: number;
  editable: boolean;
  style: any;
  onTimeChange: (newStartTime: string, newEndTime?: string) => void;
  onPress: () => void;
  children: ReactNode;
}

/** Convert "HH:MM" to total minutes from midnight */
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Convert minutes to "HH:MM" format */
function fromMinutes(totalMinutes: number): string {
  // Handle wrap-around for negative or >24h values
  let mins = totalMinutes % (24 * 60);
  if (mins < 0) mins += 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Snap minutes to grid (5 minute increments) */
function snapToGrid(minutes: number): number {
  'worklet';
  return Math.round(minutes / 5) * 5;
}

/** Check if event type supports resize (only 'other' events can be resized) */
function canResize(source: ScheduleEventSource): boolean {
  'worklet';
  return source === 'other';
}

export function DraggableEventBlock({
  event,
  index,
  rangeStartMin,
  rangeEndMin,
  editable,
  style,
  onTimeChange,
  onPress,
  children,
}: DraggableEventBlockProps) {
  // Original event times
  const startMin = toMinutes(event.start_time);
  const endMin = toMinutes(event.end_time);
  const durationMin = endMin - startMin;

  // Shared values for animation
  const isDragging = useSharedValue(false);
  const dragMode = useSharedValue<DragMode>('none');
  const offsetY = useSharedValue(0);
  const startY = useSharedValue(0);
  const blockHeight = useSharedValue(0);

  // React state for preview text (updated via runOnJS for display)
  const [previewText, setPreviewText] = useState(`${event.start_time} – ${event.end_time}`);

  // Callbacks to update React state (must be called via runOnJS)
  const handleTimeChangeJS = useCallback(
    (newStartMin: number, newEndMin: number) => {
      const newStartTime = fromMinutes(newStartMin);
      const newEndTime = fromMinutes(newEndMin);

      // For events that support resize, pass both times
      // For fixed-duration events, only pass start time
      if (canResize(event.source)) {
        onTimeChange(newStartTime, newEndTime);
      } else {
        onTimeChange(newStartTime);
      }
    },
    [event.source, onTimeChange]
  );

  const handlePressJS = useCallback(() => {
    onPress();
  }, [onPress]);

  const updatePreviewText = useCallback((newStartMin: number, newEndMin: number) => {
    setPreviewText(`${fromMinutes(newStartMin)} – ${fromMinutes(newEndMin)}`);
  }, []);

  // Determine drag mode based on touch position
  const determineDragMode = (touchY: number, height: number): DragMode => {
    'worklet';
    if (!canResize(event.source)) {
      return 'move';
    }
    if (touchY < RESIZE_HANDLE_HEIGHT) {
      return 'resize-top';
    }
    if (touchY > height - RESIZE_HANDLE_HEIGHT) {
      return 'resize-bottom';
    }
    return 'move';
  };

  // Calculate new times based on drag offset
  const calculateNewTimes = (
    mode: DragMode,
    currentOffsetY: number
  ): { newStartMin: number; newEndMin: number } => {
    'worklet';
    const deltaMinutes = (currentOffsetY / HOUR_HEIGHT) * 60;

    let newStartMin = startMin;
    let newEndMin = endMin;

    switch (mode) {
      case 'move': {
        // Move both start and end by same amount
        const snappedDelta = snapToGrid(deltaMinutes);
        newStartMin = startMin + snappedDelta;
        newEndMin = endMin + snappedDelta;
        // Clamp to range
        if (newStartMin < rangeStartMin) {
          newStartMin = rangeStartMin;
          newEndMin = rangeStartMin + durationMin;
        }
        if (newEndMin > rangeEndMin) {
          newEndMin = rangeEndMin;
          newStartMin = rangeEndMin - durationMin;
        }
        break;
      }
      case 'resize-top': {
        // Change start time, keep end fixed
        newStartMin = snapToGrid(startMin + deltaMinutes);
        // Ensure minimum duration
        if (newStartMin > endMin - MIN_DURATION) {
          newStartMin = endMin - MIN_DURATION;
        }
        // Clamp to range
        if (newStartMin < rangeStartMin) {
          newStartMin = rangeStartMin;
        }
        break;
      }
      case 'resize-bottom': {
        // Change end time, keep start fixed
        newEndMin = snapToGrid(endMin + deltaMinutes);
        // Ensure minimum duration
        if (newEndMin < startMin + MIN_DURATION) {
          newEndMin = startMin + MIN_DURATION;
        }
        // Clamp to range
        if (newEndMin > rangeEndMin) {
          newEndMin = rangeEndMin;
        }
        break;
      }
    }

    return { newStartMin, newEndMin };
  };

  // Long press gesture to initiate drag
  const longPressGesture = Gesture.LongPress()
    .minDuration(300)
    .maxDistance(10)
    .enabled(editable)
    .onStart((e) => {
      const mode = determineDragMode(e.y, blockHeight.value);
      dragMode.value = mode;
      isDragging.value = true;
      startY.value = e.absoluteY;
      offsetY.value = 0;
      runOnJS(updatePreviewText)(startMin, endMin);
    });

  // Pan gesture for dragging
  const panGesture = Gesture.Pan()
    .enabled(editable)
    .manualActivation(true)
    .onTouchesMove((e, stateManager) => {
      if (isDragging.value) {
        stateManager.activate();
      }
    })
    .onUpdate((e) => {
      if (!isDragging.value) return;

      offsetY.value = e.translationY;

      // Update preview times
      const { newStartMin, newEndMin } = calculateNewTimes(
        dragMode.value,
        e.translationY
      );
      runOnJS(updatePreviewText)(newStartMin, newEndMin);
    })
    .onEnd(() => {
      if (!isDragging.value) return;

      // Calculate final times
      const { newStartMin, newEndMin } = calculateNewTimes(
        dragMode.value,
        offsetY.value
      );

      // Only update if times actually changed
      if (newStartMin !== startMin || newEndMin !== endMin) {
        runOnJS(handleTimeChangeJS)(newStartMin, newEndMin);
      }

      // Reset state
      isDragging.value = false;
      dragMode.value = 'none';
      offsetY.value = withTiming(0, { duration: 150 });
    });

  // Tap gesture for opening edit modal
  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .onEnd(() => {
      if (!isDragging.value) {
        runOnJS(handlePressJS)();
      }
    });

  // Compose gestures: tap races with (longPress + pan)
  const composedGesture = Gesture.Race(
    tapGesture,
    Gesture.Simultaneous(longPressGesture, panGesture)
  );

  // Animated style for the block
  // Move: translate the block. Resize: just highlight (time preview shows the change)
  const animatedBlockStyle = useAnimatedStyle(() => {
    if (!isDragging.value) {
      return {};
    }

    const currentMode = dragMode.value;

    if (currentMode === 'move') {
      // Move: translate the entire block
      return {
        transform: [{ translateY: offsetY.value }],
        zIndex: 100,
      };
    }

    // For resize modes, don't transform - just elevate and let time preview show the change
    return { zIndex: 100 };
  });

  // Animated style for selection highlight (only adds border, doesn't override background)
  const animatedHighlightStyle = useAnimatedStyle(() => ({
    borderWidth: isDragging.value ? 2 : 0,
    borderColor: isDragging.value ? '#2d5a2d' : 'transparent',
  }));

  // Animated style for time preview
  const animatedPreviewStyle = useAnimatedStyle(() => ({
    opacity: isDragging.value ? 1 : 0,
  }));

  // Animated style for resize handles
  const topHandleStyle = useAnimatedStyle(() => ({
    opacity: isDragging.value && canResize(event.source) ? 0.8 : 0,
  }));

  const bottomHandleStyle = useAnimatedStyle(() => ({
    opacity: isDragging.value && canResize(event.source) ? 0.8 : 0,
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[style, animatedBlockStyle, animatedHighlightStyle]}
        onLayout={(e) => {
          blockHeight.value = e.nativeEvent.layout.height;
        }}
      >
        <>{children}</>

        {/* Top resize handle */}
        {canResize(event.source) && (
          <Animated.View style={[styles.resizeHandle, styles.resizeHandleTop, topHandleStyle]}>
            <View style={styles.resizeHandleBar} />
          </Animated.View>
        )}

        {/* Bottom resize handle */}
        {canResize(event.source) && (
          <Animated.View style={[styles.resizeHandle, styles.resizeHandleBottom, bottomHandleStyle]}>
            <View style={styles.resizeHandleBar} />
          </Animated.View>
        )}

        {/* Time preview */}
        <Animated.View style={[styles.timePreview, animatedPreviewStyle]}>
          <Text style={styles.timePreviewText}>{previewText}</Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  resizeHandle: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: RESIZE_HANDLE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resizeHandleTop: {
    top: 0,
  },
  resizeHandleBottom: {
    bottom: 0,
  },
  resizeHandleBar: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2d5a2d',
  },
  timePreview: {
    position: 'absolute',
    right: -4,
    top: '50%',
    transform: [{ translateX: '100%' }, { translateY: -10 }],
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  timePreviewText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'JetBrainsMono',
    fontVariant: ['tabular-nums'],
  },
});
