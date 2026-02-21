import { View, Text, StyleSheet, TextInput, Pressable, LayoutChangeEvent, Platform } from 'react-native';
import { useState, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react-native';
import type { GoalsStepProps } from './types';
import { EXAMPLE_GOALS } from './types';
import { KEYBOARD_ACCESSORY_ID } from '@/components/shared/KeyboardAccessoryProvider';

interface WeightSliderProps {
  value: number; // 0-1
  onChange: (value: number) => void;
}

function WeightSlider({ value, onChange }: WeightSliderProps) {
  const percent = Math.round(value * 100);
  const sliderWidth = useRef(0);

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
      <Text style={styles.sliderValue}>{percent}%</Text>
    </View>
  );
}

export function GoalsStep({ goals, onChange }: GoalsStepProps) {
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
                  <Trash2 size={16} color="#c62828" />
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
          placeholderTextColor="#999"
          onSubmitEditing={() => addGoal(newGoalText)}
          returnKeyType="done"
          inputAccessoryViewID={Platform.OS === 'ios' ? KEYBOARD_ACCESSORY_ID : undefined}
        />
        <Pressable
          style={[styles.addButton, !newGoalText.trim() && styles.addButtonDisabled]}
          onPress={() => addGoal(newGoalText)}
          disabled={!newGoalText.trim()}
        >
          <Plus size={20} color={newGoalText.trim() ? '#fff' : '#999'} />
        </Pressable>
      </View>

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
                <Plus size={14} color="#2d5a2d" />
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
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
  },
  goalsList: {
    gap: 12,
    marginBottom: 16,
  },
  goalItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
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
    color: '#1a2e1a',
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
    backgroundColor: '#e5e5e5',
    borderRadius: 3,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#2d5a2d',
    borderRadius: 3,
  },
  sliderThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2d5a2d',
    marginLeft: -10,
    top: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  sliderValue: {
    width: 42,
    fontSize: 14,
    fontWeight: '600',
    color: '#2d5a2d',
    textAlign: 'right',
  },
  addGoalRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  addGoalInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#2d5a2d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#e5e5e5',
  },
  examplesSection: {
    marginTop: 4,
  },
  examplesLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
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
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#e8f5e9',
    borderRadius: 20,
  },
  exampleChipText: {
    fontSize: 13,
    color: '#2d5a2d',
  },
});
