import { View, Text, StyleSheet, TextInput, Pressable, Platform } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import type { PersonalInfoStepProps } from './types';
import { KEYBOARD_ACCESSORY_ID } from '@/components/shared/KeyboardAccessoryProvider';
import { colors } from '@/lib/theme';

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

const digits = (text: string) => text.replace(/[^0-9]/g, '');
const parseOrUndef = (text: string) => {
  const n = parseInt(text, 10);
  return isNaN(n) ? undefined : n;
};

export function PersonalInfoStep({ personalInfo, onChange }: PersonalInfoStepProps) {
  const [useMetric, setUseMetric] = useState(false);
  const [showOtherConsiderations, setShowOtherConsiderations] = useState(false);

  // Local text state so typing is never reformatted mid-input. We only seed
  // from personalInfo on mount; after that the input is the source of truth
  // and the parsed number flows to onChange.
  const [ageText, setAgeText] = useState(() => personalInfo.age?.toString() ?? '');
  const [weightLbsText, setWeightLbsText] = useState(() => personalInfo.weight_lbs?.toString() ?? '');
  const [weightKgText, setWeightKgText] = useState(() =>
    personalInfo.weight_lbs ? Math.round(personalInfo.weight_lbs * 0.453592).toString() : ''
  );
  const [heightFtText, setHeightFtText] = useState(() =>
    personalInfo.height_in ? Math.floor(personalInfo.height_in / 12).toString() : ''
  );
  const [heightInText, setHeightInText] = useState(() =>
    personalInfo.height_in ? (personalInfo.height_in % 12).toString() : ''
  );
  const [heightCmText, setHeightCmText] = useState(() =>
    personalInfo.height_in ? Math.round(personalInfo.height_in * 2.54).toString() : ''
  );

  const [lifestyleText, setLifestyleText] = useState(
    () => personalInfo.lifestyle_considerations?.join(', ') ?? ''
  );
  const [dietText, setDietText] = useState(
    () => personalInfo.dietary_restrictions?.join(', ') ?? ''
  );

  // Keep a ref so we can call the latest onChange without re-running effects.
  const onChangeRef = useRef(onChange);
  const infoRef = useRef(personalInfo);
  useEffect(() => {
    onChangeRef.current = onChange;
    infoRef.current = personalInfo;
  });

  const updateField = <K extends keyof typeof personalInfo>(
    key: K,
    value: (typeof personalInfo)[K]
  ) => {
    onChangeRef.current({ ...infoRef.current, [key]: value });
  };

  const onAge = (text: string) => {
    const clean = digits(text).slice(0, 3);
    setAgeText(clean);
    updateField('age', parseOrUndef(clean));
  };

  const onWeightLbs = (text: string) => {
    const clean = digits(text).slice(0, 3);
    setWeightLbsText(clean);
    updateField('weight_lbs', parseOrUndef(clean));
  };

  const onWeightKg = (text: string) => {
    const clean = digits(text).slice(0, 3);
    setWeightKgText(clean);
    const kg = parseOrUndef(clean);
    updateField('weight_lbs', kg == null ? undefined : Math.round(kg / 0.453592));
  };

  const commitImperial = (ft: string, inches: string) => {
    const f = parseOrUndef(ft) ?? 0;
    const i = parseOrUndef(inches) ?? 0;
    const total = f * 12 + i;
    updateField('height_in', total > 0 ? total : undefined);
  };

  const onHeightFt = (text: string) => {
    const clean = digits(text).slice(0, 1);
    setHeightFtText(clean);
    commitImperial(clean, heightInText);
  };

  const onHeightIn = (text: string) => {
    const clean = digits(text).slice(0, 2);
    setHeightInText(clean);
    commitImperial(heightFtText, clean);
  };

  const onHeightCm = (text: string) => {
    const clean = digits(text).slice(0, 3);
    setHeightCmText(clean);
    const cm = parseOrUndef(clean);
    // Store cm directly (converted to inches) but don't round-trip the display.
    updateField('height_in', cm == null ? undefined : Math.round(cm / 2.54));
  };

  const onLifestyle = (text: string) => {
    setLifestyleText(text);
    // Only finalize the array shape on commit; during typing just split on
    // commas without trimming so trailing spaces and partial words survive.
    const items = text.split(',').map((s) => s.trim()).filter(Boolean);
    updateField('lifestyle_considerations', items);
  };

  const onDiet = (text: string) => {
    setDietText(text);
    const items = text.split(',').map((s) => s.trim()).filter(Boolean);
    updateField('dietary_restrictions', items);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.description}>
        All fields are optional — share what's helpful.
      </Text>

      {/* Age */}
      <View style={styles.field}>
        <Text style={styles.label}>Age</Text>
        <TextInput
          style={styles.input}
          value={ageText}
          onChangeText={onAge}
          placeholder="Enter age"
          placeholderTextColor={colors.onSurfaceVariant}
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
            value={weightKgText}
            onChangeText={onWeightKg}
            placeholder="Enter weight in kg"
            placeholderTextColor={colors.onSurfaceVariant}
            keyboardType="numeric"
            maxLength={3}
            returnKeyType="done"
            inputAccessoryViewID={Platform.OS === 'ios' ? KEYBOARD_ACCESSORY_ID : undefined}
          />
        ) : (
          <TextInput
            style={styles.input}
            value={weightLbsText}
            onChangeText={onWeightLbs}
            placeholder="Enter weight in lbs"
            placeholderTextColor={colors.onSurfaceVariant}
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
            value={heightCmText}
            onChangeText={onHeightCm}
            placeholder="Enter height in cm"
            placeholderTextColor={colors.onSurfaceVariant}
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
                value={heightFtText}
                onChangeText={onHeightFt}
                placeholder="ft"
                placeholderTextColor={colors.onSurfaceVariant}
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
                value={heightInText}
                onChangeText={onHeightIn}
                placeholder="in"
                placeholderTextColor={colors.onSurfaceVariant}
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
          <ChevronUp size={20} color={colors.onSurfaceVariant} />
        ) : (
          <ChevronDown size={20} color={colors.onSurfaceVariant} />
        )}
      </Pressable>

      {showOtherConsiderations && (
        <View style={styles.collapsibleContent}>
          <View style={styles.field}>
            <Text style={styles.label}>Lifestyle considerations</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={lifestyleText}
              onChangeText={onLifestyle}
              placeholder="e.g., office worker, frequent travel"
              placeholderTextColor={colors.onSurfaceVariant}
              multiline
              inputAccessoryViewID={Platform.OS === 'ios' ? KEYBOARD_ACCESSORY_ID : undefined}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Dietary restrictions</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={dietText}
              onChangeText={onDiet}
              placeholder="e.g., vegetarian, gluten-free, nut allergy"
              placeholderTextColor={colors.onSurfaceVariant}
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
    color: colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: 20,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
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
    color: colors.onSurfaceVariant,
  },
  unitTextActive: {
    color: colors.primaryContainer,
    fontWeight: '600',
  },
  unitDivider: {
    fontSize: 12,
    color: colors.outlineVariant,
    marginHorizontal: 4,
  },
  input: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
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
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
  },
  pillSelected: {
    backgroundColor: colors.selectedBg,
    borderColor: colors.primaryContainer,
  },
  pillText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  pillTextSelected: {
    color: colors.primaryContainer,
  },
  heightRow: {
    flexDirection: 'row',
    gap: 12,
  },
  heightInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingRight: 12,
  },
  heightInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.onSurface,
  },
  heightUnit: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 16,
  },
  collapsibleTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.onSurface,
  },
  collapsibleSubtitle: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginLeft: 6,
    flex: 1,
  },
  collapsibleContent: {
    paddingTop: 8,
  },
});
