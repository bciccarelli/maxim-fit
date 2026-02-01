import { View, Text, TextInput, StyleSheet, Pressable, Modal } from 'react-native';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react-native';

const DOSAGE_UNITS = ['mg', 'g', 'mcg', 'IU', 'ml', 'drops', 'capsules', 'tablets'];

interface DosageInputProps {
  value: string;
  onChange: (value: string) => void;
}

function parseDosage(value: string): { amount: string; unit: string } {
  const match = value.match(/^([\d.]+)\s*(.*)$/);
  if (match) {
    return { amount: match[1], unit: match[2] || 'mg' };
  }
  return { amount: '', unit: 'mg' };
}

function formatDosage(amount: string, unit: string): string {
  if (!amount) return '';
  return `${amount} ${unit}`;
}

export function DosageInput({ value, onChange }: DosageInputProps) {
  const parsed = parseDosage(value);
  const [amount, setAmount] = useState(parsed.amount);
  const [unit, setUnit] = useState(parsed.unit || 'mg');
  const [showUnitPicker, setShowUnitPicker] = useState(false);

  const handleAmountChange = (newAmount: string) => {
    setAmount(newAmount);
    onChange(formatDosage(newAmount, unit));
  };

  const handleUnitSelect = (newUnit: string) => {
    setUnit(newUnit);
    setShowUnitPicker(false);
    onChange(formatDosage(amount, newUnit));
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.amountInput}
        value={amount}
        onChangeText={handleAmountChange}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor="#999"
      />
      <Pressable style={styles.unitButton} onPress={() => setShowUnitPicker(true)}>
        <Text style={styles.unitText}>{unit}</Text>
        <ChevronDown size={16} color="#666" />
      </Pressable>

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
