import { View, Text, StyleSheet, TextInput, Pressable, LayoutChangeEvent, Platform } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import { Plus, Trash2 } from 'lucide-react-native';
import type { GoalsStepProps } from './types';
import { EXAMPLE_GOALS } from './types';
import { KEYBOARD_ACCESSORY_ID } from '@/components/shared/KeyboardAccessoryProvider';
import { colors, spacing, borderRadius, fontSize } from '@/lib/theme';

interface WeightSliderProps {
  value: number; // 0-1
  onChange: (value: number) => void;
}

function WeightSlider({ value, onChange }: WeightSliderProps) {
  const percent = Math.round(value * 100);
  const sliderWidth = useRef(0);
  const scale = useSharedValue(1);

  const animatedTextStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleLayout = (e: LayoutChangeEvent) => {
    sliderWidth.current = e.nativeEvent.layout.width;
  };

  const handlePress = (e: { nativeEvent: { locationX: number } }) => {
    if (sliderWidth.current <= 0) return;

    const rawPercent = (e.nativeEvent.locationX / sliderWidth.current) * 100;
    // Snap to 5% increments
    const snappedPercent = Math.round(rawPercent / 5) * 5;
    const clampedPercent = Math.max(0, Math.min(100, snappedPercent));
    onChange(clampedPercent / 100);
    // Pulse the percentage text
    scale.value = withSequence(
      withTiming(1.15, { duration: 80 }),
      withTiming(1, { duration: 80 })
    );
  };

  return (
    <View style={styles.sliderRow}>
      <Pressable
        style={styles.sliderContainer}
        onLayout={handleLayout}
        onPress={handlePress}
      >
        <View style={styles.sliderTrack}>
          <View style={[styles.sliderFill, { width: `${percent}%` }]} />
        </View>
        <View style={[styles.sliderThumb, { left: `${percent}%` }]} />
      </Pressable>
      <Animated.Text style={[styles.sliderValue, animatedTextStyle]}>{percent}%</Animated.Text>
    </View>
  );
}

export function GoalsStep({ goals, onChange, showValidation }: GoalsStepProps) {
  const [newGoalText, setNewGoalText] = useState('');

  const addGoal = (name: string) => {
    if (!name.trim()) return;
    // Check if goal already exists
    if (goals.some(g => g.name.toLowerCase() === name.toLowerCase())) return;

    const newGoal = { name: name.trim(), weight: 0.5 };
    onChange([...goals, newGoal]);
    setNewGoalText('');
  };

  const removeGoal = (index: number) => {
    onChange(goals.filter((_, i) => i !== index));
  };

  const updateWeight = (index: number, newWeight: number) => {
    // Clamp between 0 and 1
    const clampedWeight = Math.max(0, Math.min(1, newWeight));
    const updated = goals.map((g, i) => (i === index ? { ...g, weight: clampedWeight } : g));
    onChange(updated);
  };

  const availableExamples = EXAMPLE_GOALS.filter(
    ex => !goals.some(g => g.name.toLowerCase() === ex.name.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Text style={styles.description}>
        What are your health goals? Add goals and adjust their relative importance using the sliders.
      </Text>

      {/* Current Goals */}
      {goals.length > 0 && (
        <View style={styles.goalsList}>
          {goals.map((goal, index) => (
            <View key={goal.name} style={styles.goalItem}>
              <View style={styles.goalRow}>
                <Text style={styles.goalName} numberOfLines={2}>
                  {goal.name}
                </Text>
                <Pressable
                  style={styles.removeButton}
                  onPress={() => removeGoal(index)}
                  hitSlop={8}
                >
                  <Trash2 size={16} color={colors.destructive} />
                </Pressable>
              </View>
              <WeightSlider
                value={goal.weight}
                onChange={(value) => updateWeight(index, value)}
              />
            </View>
          ))}
        </View>
      )}

      {/* Add Custom Goal */}
      <View style={styles.addGoalRow}>
        <TextInput
          style={styles.addGoalInput}
          value={newGoalText}
          onChangeText={setNewGoalText}
          placeholder="Add a custom goal..."
          placeholderTextColor={colors.onSurfaceVariant}
          onSubmitEditing={() => addGoal(newGoalText)}
          returnKeyType="done"
          inputAccessoryViewID={Platform.OS === 'ios' ? KEYBOARD_ACCESSORY_ID : undefined}
        />
        <Pressable
          style={[styles.addButton, !newGoalText.trim() && styles.addButtonDisabled]}
          onPress={() => addGoal(newGoalText)}
          disabled={!newGoalText.trim()}
        >
          <Plus size={20} color={newGoalText.trim() ? colors.onPrimary : colors.onSurfaceVariant} />
        </Pressable>
      </View>

      {/* Validation hint */}
      {showValidation && goals.length === 0 && (
        <Text style={styles.validationHint}>Add at least one goal to continue</Text>
      )}

      {/* Example Goals */}
      {availableExamples.length > 0 && (
        <View style={styles.examplesSection}>
          <Text style={styles.examplesLabel}>Suggestions</Text>
          <View style={styles.examplesWrap}>
            {availableExamples.map((example) => (
              <Pressable
                key={example.name}
                style={styles.exampleChip}
                onPress={() => addGoal(example.name)}
              >
                <Plus size={14} color={colors.primaryContainer} />
                <Text style={styles.exampleChipText}>{example.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  description: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: 20,
  },
  goalsList: {
    gap: 12,
    marginBottom: 16,
  },
  goalItem: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 0,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  goalName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.onSurface,
    marginRight: 12,
  },
  removeButton: {
    padding: 4,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sliderContainer: {
    flex: 1,
    height: 32,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 6,
    backgroundColor: colors.outlineVariant,
    borderRadius: 0,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: colors.primaryContainer,
    borderRadius: 0,
  },
  sliderThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primaryContainer,
    marginLeft: -10,
    top: 6,
  },
  sliderValue: {
    width: 42,
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryContainer,
    textAlign: 'right',
  },
  addGoalRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  addGoalInput: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 0,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: colors.outlineVariant,
  },
  examplesSection: {
    marginTop: 4,
  },
  examplesLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  examplesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exampleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.selectedBg,
    borderRadius: 0,
  },
  exampleChipText: {
    fontSize: 14,
    color: colors.primaryContainer,
  },
  validationHint: {
    fontSize: 12,
    color: colors.warning,
    marginBottom: 16,
  },
});
