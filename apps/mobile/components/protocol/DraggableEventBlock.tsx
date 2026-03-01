import React, { useCallback, useState, useEffect, type ReactNode } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  cancelAnimation,
} from 'react-native-reanimated';
import type { ScheduleEvent, ScheduleEventSource } from '@protocol/shared';

// Timeline constants (must match ScheduleSection)
const HOUR_HEIGHT = 48;
const RESIZE_HANDLE_HEIGHT = 16;
const MIN_DURATION = 5; // minimum event duration in minutes

type DragMode = 'none' | 'move' | 'resize-top' | 'resize-bottom';

interface DraggableEventBlockProps {
  event: ScheduleEvent;
  index: number;
  rangeStartMin: number;
  rangeEndMin: number;
  editable: boolean;
  style: StyleProp<ViewStyle>;
  onTimeChange: (newStartTime: string, newEndTime?: string) => void;
  onPress: () => void;
  children: (displayStartTime: string, displayEndTime: string) => ReactNode;
}

/** Convert "HH:MM" to total minutes from midnight */
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Convert minutes to "HH:MM" format */
function fromMinutes(totalMinutes: number): string {
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

/** Determine drag mode based on touch position - pure worklet function */
function determineDragMode(touchY: number, height: number, isResizable: boolean): DragMode {
  'worklet';
  if (!isResizable) {
    return 'move';
  }
  if (touchY < RESIZE_HANDLE_HEIGHT) {
    return 'resize-top';
  }
  if (touchY > height - RESIZE_HANDLE_HEIGHT) {
    return 'resize-bottom';
  }
  return 'move';
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

  // Track if long-press activated drag mode (React state for conditional rendering)
  const [isDragActive, setIsDragActive] = useState(false);
  const [currentDragMode, setCurrentDragMode] = useState<DragMode>('none');

  // Pre-compute whether this event can be resized (primitive for worklet capture)
  const isResizable = canResize(event.source);

  // Shared values for animation (accessible from UI thread)
  const isDragging = useSharedValue(false);
  const dragMode = useSharedValue<DragMode>('none');
  const offsetY = useSharedValue(0);
  const blockHeight = useSharedValue(0);
  const originalHeight = useSharedValue(0); // Captured at drag start to avoid feedback loop

  // React state for display times (separate values for reliable updates)
  const [displayStartTime, setDisplayStartTime] = useState(event.start_time);
  const [displayEndTime, setDisplayEndTime] = useState(event.end_time);

  // Reset state when event times change (e.g., after undo)
  useEffect(() => {
    // Cancel any ongoing animations before resetting
    cancelAnimation(offsetY);

    // Reset all drag-related state to match the new event props
    offsetY.value = 0;
    isDragging.value = false;
    dragMode.value = 'none';
    setIsDragActive(false);
    setCurrentDragMode('none');
    setDisplayStartTime(event.start_time);
    setDisplayEndTime(event.end_time);
  }, [event.start_time, event.end_time]);

  // Calculate new times based on drag offset (non-worklet version for JS thread)
  const calculateNewTimes = (
    mode: DragMode,
    currentOffsetY: number
  ): { newStartMin: number; newEndMin: number } => {
    const deltaMinutes = (currentOffsetY / HOUR_HEIGHT) * 60;

    let newStartMin = startMin;
    let newEndMin = endMin;

    switch (mode) {
      case 'move': {
        const snappedDelta = snapToGrid(deltaMinutes);
        newStartMin = startMin + snappedDelta;
        newEndMin = endMin + snappedDelta;
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
        newStartMin = snapToGrid(startMin + deltaMinutes);
        if (newStartMin > endMin - MIN_DURATION) {
          newStartMin = endMin - MIN_DURATION;
        }
        if (newStartMin < rangeStartMin) {
          newStartMin = rangeStartMin;
        }
        break;
      }
      case 'resize-bottom': {
        newEndMin = snapToGrid(endMin + deltaMinutes);
        if (newEndMin < startMin + MIN_DURATION) {
          newEndMin = startMin + MIN_DURATION;
        }
        if (newEndMin > rangeEndMin) {
          newEndMin = rangeEndMin;
        }
        break;
      }
    }

    return { newStartMin, newEndMin };
  };

  // JS callbacks for gesture handlers
  const activateDrag = useCallback((mode: DragMode) => {
    setCurrentDragMode(mode);
    setIsDragActive(true);
    setDisplayStartTime(event.start_time);
    setDisplayEndTime(event.end_time);
  }, [event.start_time, event.end_time]);

  const updatePreview = useCallback((translationY: number, mode: DragMode) => {
    const { newStartMin, newEndMin } = calculateNewTimes(mode, translationY);
    setDisplayStartTime(fromMinutes(newStartMin));
    setDisplayEndTime(fromMinutes(newEndMin));
  }, []);

  const commitDrag = useCallback((finalOffsetY: number, mode: DragMode) => {
    const { newStartMin, newEndMin } = calculateNewTimes(mode, finalOffsetY);

    // Only update if times actually changed
    if (newStartMin !== startMin || newEndMin !== endMin) {
      const newStartTime = fromMinutes(newStartMin);
      const newEndTime = fromMinutes(newEndMin);
      if (canResize(event.source)) {
        onTimeChange(newStartTime, newEndTime);
      } else {
        onTimeChange(newStartTime);
      }
    }

    // Reset state
    setIsDragActive(false);
    setCurrentDragMode('none');
  }, [startMin, endMin, event.source, onTimeChange]);

  // Pan gesture with long-press activation
  const panGesture = Gesture.Pan()
    .activateAfterLongPress(300)
    .enabled(editable)
    .onBegin((e) => {
      // Capture original height at drag start to avoid feedback loop from onLayout
      originalHeight.value = blockHeight.value;

      // Determine drag mode based on touch position
      const mode = determineDragMode(e.y, blockHeight.value, isResizable);

      isDragging.value = true;
      dragMode.value = mode;
      offsetY.value = 0;

      runOnJS(activateDrag)(mode);
    })
    .onUpdate((e) => {
      offsetY.value = e.translationY;
      runOnJS(updatePreview)(e.translationY, dragMode.value);
    })
    .onEnd((e) => {
      const finalOffset = offsetY.value;
      const mode = dragMode.value;

      isDragging.value = false;
      dragMode.value = 'none';
      offsetY.value = withTiming(0, { duration: 150 });

      runOnJS(commitDrag)(finalOffset, mode);
    })
    .onFinalize(() => {
      // Reset if gesture is cancelled
      if (isDragging.value) {
        isDragging.value = false;
        dragMode.value = 'none';
        offsetY.value = withTiming(0, { duration: 150 });
        runOnJS(setIsDragActive)(false);
      }
    });

  // Tap gesture for regular press (mutually exclusive with pan)
  const tapGesture = Gesture.Tap()
    .enabled(editable)
    .onEnd(() => {
      runOnJS(onPress)();
    });

  // Animated style for the block
  const animatedBlockStyle = useAnimatedStyle(() => {
    if (!isDragging.value) {
      return {};
    }

    if (dragMode.value === 'move') {
      return {
        transform: [{ translateY: offsetY.value }],
        zIndex: 100,
      };
    }

    if (dragMode.value === 'resize-top') {
      // Move top edge: translateY moves the block, height shrinks by same amount
      const newHeight = Math.max(MIN_DURATION * (HOUR_HEIGHT / 60), originalHeight.value - offsetY.value);
      return {
        transform: [{ translateY: offsetY.value }],
        height: newHeight,
        zIndex: 100,
      };
    }

    if (dragMode.value === 'resize-bottom') {
      // Move bottom edge: just change height
      const newHeight = Math.max(MIN_DURATION * (HOUR_HEIGHT / 60), originalHeight.value + offsetY.value);
      return {
        height: newHeight,
        zIndex: 100,
      };
    }

    return { zIndex: 100 };
  });

  // Animated style for selection highlight
  const animatedHighlightStyle = useAnimatedStyle(() => ({
    borderWidth: isDragging.value ? 2 : 0,
    borderColor: isDragging.value ? '#2d5a2d' : 'transparent',
  }));

  // Animated style for resize handles
  const topHandleStyle = useAnimatedStyle(() => ({
    opacity: isDragging.value && isResizable ? 0.8 : 0,
  }));

  const bottomHandleStyle = useAnimatedStyle(() => ({
    opacity: isDragging.value && isResizable ? 0.8 : 0,
  }));

  // Flatten style array and extract positioning for the outer Pressable
  const flatStyle = StyleSheet.flatten(style) as ViewStyle & { top?: number; left?: number; width?: number; height?: number };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { top, left, width, height, position, ...innerStyle } = flatStyle;

  // Compose gestures: pan (with long-press) takes priority over tap
  const composedGesture = Gesture.Exclusive(panGesture, tapGesture);

  // Use state display times during drag, original event times otherwise
  const effectiveStartTime = isDragActive ? displayStartTime : event.start_time;
  const effectiveEndTime = isDragActive ? displayEndTime : event.end_time;

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          { position: 'absolute', top, left, width, height },
          innerStyle,
          animatedBlockStyle,
          animatedHighlightStyle,
        ]}
        onLayout={(e) => {
          blockHeight.value = e.nativeEvent.layout.height;
        }}
      >
        <>{children(effectiveStartTime, effectiveEndTime)}</>

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
});
