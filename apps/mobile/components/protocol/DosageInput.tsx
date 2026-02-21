import { View, Text, TextInput, StyleSheet, Pressable, Modal, Platform } from 'react-native';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react-native';
import { KEYBOARD_ACCESSORY_ID } from '@/components/shared/KeyboardAccessoryProvider';

const DOSAGE_UNITS = ['mg', 'g', 'mcg', 'IU', 'ml', 'drops', 'capsules', 'tablets'];

interface DosageInputProps {
  amount: string;
  unit: string;
  notes: string | null | undefined;
  onAmountChange: (amount: string) => void;
  onUnitChange: (unit: string) => void;
  onNotesChange: (notes: string | null) => void;
}

export function DosageInput({
  amount,
  unit,
  notes,
  onAmountChange,
  onUnitChange,
  onNotesChange,
}: DosageInputProps) {
  const [showUnitPicker, setShowUnitPicker] = useState(false);

  const handleUnitSelect = (newUnit: string) => {
    setShowUnitPicker(false);
    onUnitChange(newUnit);
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <TextInput
          style={styles.amountInput}
          value={amount}
          onChangeText={onAmountChange}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor="#999"
          returnKeyType="done"
          inputAccessoryViewID={Platform.OS === 'ios' ? KEYBOARD_ACCESSORY_ID : undefined}
        />
        <Pressable style={styles.unitButton} onPress={() => setShowUnitPicker(true)}>
          <Text style={styles.unitText}>{unit || 'mg'}</Text>
          <ChevronDown size={16} color="#666" />
        </Pressable>
      </View>

      <TextInput
        style={styles.notesInput}
        value={notes || ''}
        onChangeText={(text) => onNotesChange(text || null)}
        placeholder="Notes (e.g., standardized to 3%)"
        placeholderTextColor="#999"
        returnKeyType="done"
        inputAccessoryViewID={Platform.OS === 'ios' ? KEYBOARD_ACCESSORY_ID : undefined}
      />

      <Modal
        visible={showUnitPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUnitPicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowUnitPicker(false)}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>Select Unit</Text>
            {DOSAGE_UNITS.map((u) => (
              <Pressable
                key={u}
                style={[styles.pickerOption, u === unit && styles.pickerOptionSelected]}
                onPress={() => handleUnitSelect(u)}
              >
                <Text style={[styles.pickerOptionText, u === unit && styles.pickerOptionTextSelected]}>
                  {u}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2d5a2d',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    color: '#1a2e1a',
    backgroundColor: '#fff',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1a2e1a',
    backgroundColor: '#fff',
  },
  unitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f9f9f7',
    gap: 4,
  },
  unitText: {
    fontSize: 14,
    color: '#1a2e1a',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: 200,
  },
  pickerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a2e1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  pickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  pickerOptionSelected: {
    backgroundColor: '#e8f5e9',
  },
  pickerOptionText: {
    fontSize: 15,
    color: '#1a2e1a',
    textAlign: 'center',
  },
  pickerOptionTextSelected: {
    color: '#2d5a2d',
    fontWeight: '600',
  },
});
