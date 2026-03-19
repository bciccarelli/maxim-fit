import { View, Text, StyleSheet, TextInput, Pressable, Platform } from 'react-native';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react-native';
import type { RequirementsStepProps } from './types';
import { EXAMPLE_REQUIREMENTS } from './types';
import { KEYBOARD_ACCESSORY_ID } from '@/components/shared/KeyboardAccessoryProvider';
import { colors, spacing, borderRadius, fontSize } from '@/lib/theme';

export function RequirementsStep({ requirements, onChange }: RequirementsStepProps) {
  const [newReqText, setNewReqText] = useState('');

  const addRequirement = (text: string) => {
    if (!text.trim()) return;
    // Check for duplicates
    if (requirements.some(r => r.toLowerCase() === text.toLowerCase())) return;

    onChange([...requirements, text.trim()]);
    setNewReqText('');
  };

  const removeRequirement = (index: number) => {
    onChange(requirements.filter((_, i) => i !== index));
  };

  const availableExamples = EXAMPLE_REQUIREMENTS.filter(
    ex => !requirements.some(r => r.toLowerCase() === ex.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Text style={styles.description}>
        What constraints should your protocol respect? These are hard requirements like work schedule, time availability, or dietary restrictions.
      </Text>

      <Text style={styles.optionalNote}>This step is optional.</Text>

      {/* Current Requirements */}
      {requirements.length > 0 && (
        <View style={styles.requirementsList}>
          {requirements.map((req, index) => (
            <View key={`${req}-${index}`} style={styles.requirementItem}>
              <Text style={styles.requirementText} numberOfLines={2}>
                {req}
              </Text>
              <Pressable
                style={styles.removeButton}
                onPress={() => removeRequirement(index)}
                hitSlop={8}
              >
                <Trash2 size={18} color={colors.destructive} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Add Custom Requirement */}
      <View style={styles.addRow}>
        <TextInput
          style={styles.addInput}
          value={newReqText}
          onChangeText={setNewReqText}
          placeholder="Add a requirement..."
          placeholderTextColor={colors.onSurfaceVariant}
          onSubmitEditing={() => addRequirement(newReqText)}
          returnKeyType="done"
          inputAccessoryViewID={Platform.OS === 'ios' ? KEYBOARD_ACCESSORY_ID : undefined}
        />
        <Pressable
          style={[styles.addButton, !newReqText.trim() && styles.addButtonDisabled]}
          onPress={() => addRequirement(newReqText)}
          disabled={!newReqText.trim()}
        >
          <Plus size={20} color={newReqText.trim() ? colors.onPrimary : colors.onSurfaceVariant} />
        </Pressable>
      </View>

      {/* Example Requirements */}
      {availableExamples.length > 0 && (
        <View style={styles.examplesSection}>
          <Text style={styles.examplesLabel}>Suggestions</Text>
          <View style={styles.examplesWrap}>
            {availableExamples.map((example) => (
              <Pressable
                key={example}
                style={styles.exampleChip}
                onPress={() => addRequirement(example)}
              >
                <Plus size={14} color={colors.primaryContainer} />
                <Text style={styles.exampleChipText}>{example}</Text>
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
    marginBottom: 8,
  },
  optionalNote: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    fontStyle: 'italic',
    marginBottom: 20,
  },
  requirementsList: {
    gap: 8,
    marginBottom: 16,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 0,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  requirementText: {
    flex: 1,
    fontSize: 14,
    color: colors.onSurface,
    marginRight: 12,
  },
  removeButton: {
    padding: 4,
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  addInput: {
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
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.selectedBg,
    borderRadius: 0,
  },
  exampleChipText: {
    fontSize: 13,
    color: colors.primaryContainer,
  },
});
