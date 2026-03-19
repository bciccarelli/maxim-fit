import React, { useCallback, useState, useLayoutEffect, useRef, type ReactNode } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  cancelAnimation,
} from 'react-native-reanimated';
import type { ScheduleEvent, ScheduleEventSource } from '@protocol/shared';
import { colors } from '@/lib/theme';

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

  // Extract positioning from style prop (needed for shared values below)
  const flatStyle = StyleSheet.flatten(style) as ViewStyle & { top?: number; left?: number; width?: number; height?: number };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { top: styleTop, left, width, height: styleHeight, position, ...innerStyle } = flatStyle;

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
  const baseTop = useSharedValue(styleTop ?? 0);
  const baseHeight = useSharedValue(styleHeight ?? 0);

  // Shared values for worklet-accessible time data (needed for visual snapping)
  const startMinShared = useSharedValue(startMin);
  const endMinShared = useSharedValue(endMin);

  // React state for display times (separate values for reliable updates)
  const [displayStartTime, setDisplayStartTime] = useState(event.start_time);
  const [displayEndTime, setDisplayEndTime] = useState(event.end_time);

  // Reset state when event times change (e.g., after undo or commit).
  // useLayoutEffect ensures offsetY resets in the SAME frame as the new CSS top,
  // preventing a visible snap-back or double-offset between frames.
  useLayoutEffect(() => {
    // Cancel any ongoing animations before resetting
    cancelAnimation(offsetY);

    // Reset all drag-related state to match the new event props.
    // Setting baseTop, baseHeight, and offsetY in the same synchronous JS execution
    // ensures Reanimated batches them into a single UI thread update — no double-offset.
    offsetY.value = 0;
    isDragging.value = false;
    dragMode.value = 'none';
    baseTop.value = styleTop ?? 0;
    baseHeight.value = styleHeight ?? 0;
    startMinShared.value = toMinutes(event.start_time);
    endMinShared.value = toMinutes(event.end_time);
    setIsDragActive(false);
    setCurrentDragMode('none');
    setDisplayStartTime(event.start_time);
    setDisplayEndTime(event.end_time);
  }, [event.start_time, event.end_time, styleTop, styleHeight]);

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

  // Keep ref to always-current calculateNewTimes (avoids stale closures)
  const calculateNewTimesRef = useRef(calculateNewTimes);
  calculateNewTimesRef.current = calculateNewTimes;

  // JS callbacks for gesture handlers
  const activateDrag = useCallback((mode: DragMode) => {
    setCurrentDragMode(mode);
    setIsDragActive(true);
    setDisplayStartTime(event.start_time);
    setDisplayEndTime(event.end_time);
  }, [event.start_time, event.end_time]);

  const updatePreview = useCallback((translationY: number, mode: DragMode) => {
    const { newStartMin, newEndMin } = calculateNewTimesRef.current(mode, translationY);
    setDisplayStartTime(fromMinutes(newStartMin));
    setDisplayEndTime(fromMinutes(newEndMin));
  }, []);

  const resetDragState = useCallback(() => {
    cancelAnimation(offsetY);
    offsetY.value = 0;
    isDragging.value = false;
    dragMode.value = 'none';
    setIsDragActive(false);
    setCurrentDragMode('none');
  }, []);

  const commitDrag = useCallback((finalOffsetY: number, mode: DragMode) => {
    const { newStartMin, newEndMin } = calculateNewTimesRef.current(mode, finalOffsetY);

    if (newStartMin !== startMin || newEndMin !== endMin) {
      // Don't reset offsetY here — the animated style keeps the block in place
      // via the offsetY !== 0 gate. The useLayoutEffect (triggered by the event
      // time change from onTimeChange) will reset offsetY in the same frame as
      // the new CSS top is applied, preventing any visible jump.
      setIsDragActive(false);
      setCurrentDragMode('none');

      const newStartTime = fromMinutes(newStartMin);
      const newEndTime = fromMinutes(newEndMin);
      if (canResize(event.source)) {
        onTimeChange(newStartTime, newEndTime);
      } else {
        onTimeChange(newStartTime);
      }
    } else {
      // No time change — clean up manually since useLayoutEffect won't fire
      resetDragState();
    }
  }, [startMin, endMin, event.source, onTimeChange, resetDragState]);

  // Pan gesture with long-press activation
  const panGesture = Gesture.Pan()
    .activateAfterLongPress(300)
    .enabled(editable)
    .onBegin((e) => {
      // Guard against starting a new drag while a previous commit is pending
      // (isDragging is false after onEnd, but offsetY may still be non-zero
      // until commitDrag runs on JS thread and resets it)
      if (isDragging.value || offsetY.value !== 0) return;

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
    .onEnd(() => {
      // Capture final values before any resets
      const finalOffset = offsetY.value;
      const mode = dragMode.value;

      // Set isDragging = false so onFinalize (which fires next) is a no-op.
      // Keep offsetY and dragMode intact — the animated style uses them
      // (gated on offsetY !== 0, not isDragging) to hold the block in place
      // until commitDrag resets offsetY and triggers the state update together.
      isDragging.value = false;

      runOnJS(commitDrag)(finalOffset, mode);
    })
    .onFinalize(() => {
      // Only fires for cancelled gestures — onEnd already set isDragging = false
      if (isDragging.value) {
        isDragging.value = false;
        dragMode.value = 'none';
        offsetY.value = 0;
        runOnJS(setIsDragActive)(false);
        runOnJS(setCurrentDragMode)('none');
      }
    });

  // Tap gesture for regular press (mutually exclusive with pan)
  const tapGesture = Gesture.Tap()
    .enabled(editable)
    .onEnd(() => {
      runOnJS(onPress)();
    });

  // Animated style for the block — uses snapped offsets so visual position matches displayed times.
  // Gated on offsetY !== 0 (not isDragging) so the block holds its position after onEnd
  // sets isDragging=false but before commitDrag resets offsetY and triggers the state update.
  // Animated style outputs `top` and `height` directly from shared values.
  // This eliminates the double-offset bug: both base position and drag offset
  // live in Reanimated shared values, so they update atomically on the UI thread.
  const animatedBlockStyle = useAnimatedStyle(() => {
    const active = isDragging.value;

    // No offset — use base position from shared values
    if (offsetY.value === 0) {
      return {
        top: baseTop.value,
        height: baseHeight.value,
        ...(active ? { zIndex: 100 } : {}),
      };
    }

    const minHeight = MIN_DURATION * (HOUR_HEIGHT / 60);
    const zIndex = active ? 100 : 1;
    const deltaMin = (offsetY.value / HOUR_HEIGHT) * 60;

    if (dragMode.value === 'move' || dragMode.value === 'none') {
      const snappedY = (snapToGrid(deltaMin) / 60) * HOUR_HEIGHT;
      return { top: baseTop.value + snappedY, height: baseHeight.value, zIndex };
    }

    if (dragMode.value === 'resize-top') {
      const snappedNewStart = snapToGrid(startMinShared.value + deltaMin);
      const clampedStart = Math.max(
        Math.min(snappedNewStart, endMinShared.value - MIN_DURATION),
        0
      );
      const snappedTopDelta = ((clampedStart - startMinShared.value) / 60) * HOUR_HEIGHT;
      const newHeight = Math.max(minHeight, originalHeight.value - snappedTopDelta);
      return { top: baseTop.value + snappedTopDelta, height: newHeight, zIndex };
    }

    if (dragMode.value === 'resize-bottom') {
      const snappedNewEnd = snapToGrid(endMinShared.value + deltaMin);
      const clampedEnd = Math.max(snappedNewEnd, startMinShared.value + MIN_DURATION);
      const snappedHeightDelta = ((clampedEnd - endMinShared.value) / 60) * HOUR_HEIGHT;
      const newHeight = Math.max(minHeight, originalHeight.value + snappedHeightDelta);
      return { top: baseTop.value, height: newHeight, zIndex };
    }

    return { top: baseTop.value, height: baseHeight.value, zIndex };
  });

  // Animated style for selection highlight
  const animatedHighlightStyle = useAnimatedStyle(() => ({
    borderWidth: isDragging.value ? 2 : 0,
    borderColor: isDragging.value ? colors.primaryContainer : 'transparent',
  }));

  // Animated style for resize handles
  const topHandleStyle = useAnimatedStyle(() => ({
    opacity: isDragging.value && isResizable ? 0.8 : 0,
  }));

  const bottomHandleStyle = useAnimatedStyle(() => ({
    opacity: isDragging.value && isResizable ? 0.8 : 0,
  }));

  // Compose gestures: pan (with long-press) takes priority over tap
  const composedGesture = Gesture.Exclusive(panGesture, tapGesture);

  // Use state display times during drag, original event times otherwise
  const effectiveStartTime = isDragActive ? displayStartTime : event.start_time;
  const effectiveEndTime = isDragActive ? displayEndTime : event.end_time;

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          { position: 'absolute', left, width },
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
    borderRadius: 9999,
    backgroundColor: colors.primaryContainer,
  },
});
