import { View, Text, StyleSheet, TextInput, Pressable, Platform } from 'react-native';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import type { PersonalInfoStepProps } from './types';
import { KEYBOARD_ACCESSORY_ID } from '@/components/shared/KeyboardAccessoryProvider';

type Sex = 'male' | 'female' | 'other';
type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const FITNESS_OPTIONS: { value: FitnessLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export function PersonalInfoStep({ personalInfo, onChange }: PersonalInfoStepProps) {
  const [useMetric, setUseMetric] = useState(false);
  const [showOtherConsiderations, setShowOtherConsiderations] = useState(false);

  // Height in feet/inches for display
  const heightFeet = personalInfo.height_in ? Math.floor(personalInfo.height_in / 12) : undefined;
  const heightInches = personalInfo.height_in ? personalInfo.height_in % 12 : undefined;

  // Weight in kg for display
  const weightKg = personalInfo.weight_lbs ? Math.round(personalInfo.weight_lbs * 0.453592) : undefined;

  // Height in cm for display
  const heightCm = personalInfo.height_in ? Math.round(personalInfo.height_in * 2.54) : undefined;

  const updateField = <K extends keyof typeof personalInfo>(
    key: K,
    value: typeof personalInfo[K]
  ) => {
    onChange({ ...personalInfo, [key]: value });
  };

  const updateHeightImperial = (feet: number | undefined, inches: number | undefined) => {
    const totalInches = (feet || 0) * 12 + (inches || 0);
    updateField('height_in', totalInches > 0 ? totalInches : undefined);
  };

  const updateHeightMetric = (cm: number | undefined) => {
    if (cm) {
      const inches = Math.round(cm / 2.54);
      updateField('height_in', inches);
    } else {
      updateField('height_in', undefined);
    }
  };

  const updateWeightMetric = (kg: number | undefined) => {
    if (kg) {
      const lbs = Math.round(kg / 0.453592);
      updateField('weight_lbs', lbs);
    } else {
      updateField('weight_lbs', undefined);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.description}>
        Tell us about yourself so we can personalize your protocol.
      </Text>

      {/* Age */}
      <View style={styles.field}>
        <Text style={styles.label}>Age</Text>
        <TextInput
          style={styles.input}
          value={personalInfo.age?.toString() || ''}
          onChangeText={(text) => {
            const num = parseInt(text, 10);
            updateField('age', isNaN(num) ? undefined : num);
          }}
          placeholder="Enter age"
          placeholderTextColor="#999"
          keyboardType="numeric"
          maxLength={3}
          returnKeyType="done"
          inputAccessoryViewID={Platform.OS === 'ios' ? KEYBOARD_ACCESSORY_ID : undefined}
        />
      </View>

      {/* Sex */}
      <View style={styles.field}>
        <Text style={styles.label}>Sex</Text>
        <View style={styles.pillGroup}>
          {SEX_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              style={[
                styles.pill,
                personalInfo.sex === option.value && styles.pillSelected,
              ]}
              onPress={() => updateField('sex', option.value)}
            >
              <Text
                style={[
                  styles.pillText,
                  personalInfo.sex === option.value && styles.pillTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Weight */}
      <View style={styles.field}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Weight</Text>
          <Pressable
            style={styles.unitToggle}
            onPress={() => setUseMetric(!useMetric)}
          >
            <Text style={[styles.unitText, !useMetric && styles.unitTextActive]}>
              lbs
            </Text>
            <Text style={styles.unitDivider}>/</Text>
            <Text style={[styles.unitText, useMetric && styles.unitTextActive]}>
              kg
            </Text>
          </Pressable>
        </View>
        {useMetric ? (
          <TextInput
            style={styles.input}
            value={weightKg?.toString() || ''}
            onChangeText={(text) => {
              const num = parseInt(text, 10);
              updateWeightMetric(isNaN(num) ? undefined : num);
            }}
            placeholder="Enter weight in kg"
            placeholderTextColor="#999"
            keyboardType="numeric"
            maxLength={3}
            returnKeyType="done"
            inputAccessoryViewID={Platform.OS === 'ios' ? KEYBOARD_ACCESSORY_ID : undefined}
          />
        ) : (
          <TextInput
            style={styles.input}
            value={personalInfo.weight_lbs?.toString() || ''}
            onChangeText={(text) => {
              const num = parseInt(text, 10);
              updateField('weight_lbs', isNaN(num) ? undefined : num);
            }}
            placeholder="Enter weight in lbs"
            placeholderTextColor="#999"
            keyboardType="numeric"
            maxLength={3}
            returnKeyType="done"
            inputAccessoryViewID={Platform.OS === 'ios' ? KEYBOARD_ACCESSORY_ID : undefined}
          />
        )}
      </View>

      {/* Height */}
      <View style={styles.field}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Height</Text>
          <Pressable
            style={styles.unitToggle}
            onPress={() => setUseMetric(!useMetric)}
          >
            <Text style={[styles.unitText, !useMetric && styles.unitTextActive]}>
              ft/in
            </Text>
            <Text style={styles.unitDivider}>/</Text>
            <Text style={[styles.unitText, useMetric && styles.unitTextActive]}>
              cm
            </Text>
          </Pressable>
        </View>
        {useMetric ? (
          <TextInput
            style={styles.input}
            value={heightCm?.toString() || ''}
            onChangeText={(text) => {
              const num = parseInt(text, 10);
              updateHeightMetric(isNaN(num) ? undefined : num);
            }}
            placeholder="Enter height in cm"
            placeholderTextColor="#999"
            keyboardType="numeric"
            maxLength={3}
            returnKeyType="done"
            inputAccessoryViewID={Platform.OS === 'ios' ? KEYBOARD_ACCESSORY_ID : undefined}
          />
        ) : (
          <View style={styles.heightRow}>
            <View style={styles.heightInputWrapper}>
              <TextInput
                style={styles.heightInput}
                value={heightFeet?.toString() || ''}
                onChangeText={(text) => {
                  const num = parseInt(text, 10);
                  updateHeightImperial(isNaN(num) ? undefined : num, heightInches);
                }}
                placeholder="ft"
                placeholderTextColor="#999"
                keyboardType="numeric"
                maxLength={1}
                returnKeyType="done"
                inputAccessoryViewID={Platform.OS === 'ios' ? KEYBOARD_ACCESSORY_ID : undefined}
              />
              <Text style={styles.heightUnit}>ft</Text>
            </View>
            <View style={styles.heightInputWrapper}>
              <TextInput
                style={styles.heightInput}
                value={heightInches?.toString() || ''}
                onChangeText={(text) => {
                  const num = parseInt(text, 10);
                  updateHeightImperial(heightFeet, isNaN(num) ? undefined : num);
                }}
                placeholder="in"
                placeholderTextColor="#999"
                keyboardType="numeric"
                maxLength={2}
                returnKeyType="done"
                inputAccessoryViewID={Platform.OS === 'ios' ? KEYBOARD_ACCESSORY_ID : undefined}
              />
              <Text style={styles.heightUnit}>in</Text>
            </View>
          </View>
        )}
      </View>

      {/* Fitness Level */}
      <View style={styles.field}>
        <Text style={styles.label}>Fitness level</Text>
        <View style={styles.pillGroup}>
          {FITNESS_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              style={[
                styles.pill,
                personalInfo.fitness_level === option.value && styles.pillSelected,
              ]}
              onPress={() => updateField('fitness_level', option.value)}
            >
              <Text
                style={[
                  styles.pillText,
                  personalInfo.fitness_level === option.value && styles.pillTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Other Considerations (collapsible) */}
      <Pressable
        style={styles.collapsibleHeader}
        onPress={() => setShowOtherConsiderations(!showOtherConsiderations)}
      >
        <Text style={styles.collapsibleTitle}>Other Considerations</Text>
        <Text style={styles.collapsibleSubtitle}>(optional)</Text>
        {showOtherConsiderations ? (
          <ChevronUp size={20} color="#666" />
        ) : (
          <ChevronDown size={20} color="#666" />
        )}
      </Pressable>

      {showOtherConsiderations && (
        <View style={styles.collapsibleContent}>
          <View style={styles.field}>
            <Text style={styles.label}>Lifestyle considerations</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={personalInfo.lifestyle_considerations?.join(', ') || ''}
              onChangeText={(text) => {
                const items = text.split(',').map(s => s.trim()).filter(Boolean);
                updateField('lifestyle_considerations', items);
              }}
              placeholder="e.g., office worker, frequent travel"
              placeholderTextColor="#999"
              multiline
              inputAccessoryViewID={Platform.OS === 'ios' ? KEYBOARD_ACCESSORY_ID : undefined}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Dietary restrictions</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={personalInfo.dietary_restrictions?.join(', ') || ''}
              onChangeText={(text) => {
                const items = text.split(',').map(s => s.trim()).filter(Boolean);
                updateField('dietary_restrictions', items);
              }}
              placeholder="e.g., vegetarian, gluten-free, nut allergy"
              placeholderTextColor="#999"
              multiline
              inputAccessoryViewID={Platform.OS === 'ios' ? KEYBOARD_ACCESSORY_ID : undefined}
            />
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
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  unitToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unitText: {
    fontSize: 12,
    color: '#999',
  },
  unitTextActive: {
    color: '#2d5a2d',
    fontWeight: '600',
  },
  unitDivider: {
    fontSize: 12,
    color: '#ccc',
    marginHorizontal: 4,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  multilineInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  pillGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    alignItems: 'center',
  },
  pillSelected: {
    backgroundColor: '#e8f5e9',
    borderColor: '#2d5a2d',
  },
  pillText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  pillTextSelected: {
    color: '#2d5a2d',
  },
  heightRow: {
    flexDirection: 'row',
    gap: 12,
  },
  heightInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    paddingRight: 12,
  },
  heightInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
  },
  heightUnit: {
    fontSize: 12,
    color: '#666',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    marginTop: 8,
  },
  collapsibleTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a2e1a',
  },
  collapsibleSubtitle: {
    fontSize: 12,
    color: '#999',
    marginLeft: 6,
    flex: 1,
  },
  collapsibleContent: {
    paddingTop: 8,
  },
});
