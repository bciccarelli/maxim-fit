import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useState, useCallback } from 'react';
import { Plus, Trash2, X } from 'lucide-react-native';
import type { SupplementationPlan, Supplement } from '@protocol/shared/schemas';
import { EditableField } from './EditableField';
import { DosageInput } from './DosageInput';

type Props = {
  supplementation: SupplementationPlan;
  editable?: boolean;
  onChange?: (supplementation: SupplementationPlan) => void;
};

const EMPTY_SUPPLEMENT: Supplement = {
  name: 'New Supplement',
  dosage_amount: '',
  dosage_unit: 'mg',
  dosage_notes: null,
  time: '08:00',
  timing: 'Morning',
  purpose: '',
  notes: null,
};

export function SupplementsSection({
  supplementation,
  editable = false,
  onChange,
}: Props) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const updateSupplement = useCallback(
    (index: number, updates: Partial<Supplement>) => {
      const newSupplements = [...supplementation.supplements];
      newSupplements[index] = { ...newSupplements[index], ...updates };
      onChange?.({ ...supplementation, supplements: newSupplements });
    },
    [supplementation, onChange]
  );

  const addSupplement = useCallback(() => {
    const newSupplements = [...supplementation.supplements, { ...EMPTY_SUPPLEMENT }];
    onChange?.({ ...supplementation, supplements: newSupplements });
    setEditingIndex(newSupplements.length - 1);
  }, [supplementation, onChange]);

  const removeSupplement = useCallback(
    (index: number) => {
      const newSupplements = supplementation.supplements.filter((_, i) => i !== index);
      onChange?.({ ...supplementation, supplements: newSupplements });
      setEditingIndex(null);
    },
    [supplementation, onChange]
  );

  const renderSupplement = (supplement: Supplement, index: number) => {
    const isEditing = editingIndex === index;
    const isLast = index === supplementation.supplements.length - 1;

    if (isEditing && editable) {
      return (
        <View
          key={index}
          style={[styles.supplementItem, !isLast && styles.supplementItemBorder]}
        >
          <View style={styles.editHeader}>
            <Text style={styles.editLabel}>Edit Supplement</Text>
            <View style={styles.editActions}>
              <Pressable
                style={styles.iconButton}
                onPress={() => removeSupplement(index)}
              >
                <Trash2 size={18} color="#c62828" />
              </Pressable>
              <Pressable
                style={styles.iconButton}
                onPress={() => setEditingIndex(null)}
              >
                <X size={18} color="#666" />
              </Pressable>
            </View>
          </View>

          <View style={styles.editField}>
            <Text style={styles.fieldLabel}>Name</Text>
            <EditableField
              value={supplement.name}
              onChange={(name) => updateSupplement(index, { name })}
              editable
              style={styles.fieldValue}
            />
          </View>

          <View style={styles.editField}>
            <Text style={styles.fieldLabel}>Dosage</Text>
            <DosageInput
              amount={supplement.dosage_amount}
              unit={supplement.dosage_unit}
              notes={supplement.dosage_notes}
              onAmountChange={(dosage_amount) => updateSupplement(index, { dosage_amount })}
              onUnitChange={(dosage_unit) => updateSupplement(index, { dosage_unit })}
              onNotesChange={(dosage_notes) => updateSupplement(index, { dosage_notes })}
            />
          </View>

          <View style={styles.editField}>
            <Text style={styles.fieldLabel}>Timing</Text>
            <EditableField
              value={supplement.timing}
              onChange={(timing) => updateSupplement(index, { timing })}
              editable
              style={styles.fieldValue}
            />
          </View>

          <View style={styles.editField}>
            <Text style={styles.fieldLabel}>Purpose</Text>
            <EditableField
              value={supplement.purpose}
              onChange={(purpose) => updateSupplement(index, { purpose })}
              editable
              style={styles.fieldValue}
            />
          </View>

          <View style={styles.editField}>
            <Text style={styles.fieldLabel}>Notes</Text>
            <EditableField
              value={supplement.notes || ''}
              onChange={(notes) => updateSupplement(index, { notes: notes || null })}
              editable
              style={styles.fieldValue}
              placeholder="Optional"
            />
          </View>
        </View>
      );
    }

    const dosageDisplay = supplement.dosage_amount
      ? `${supplement.dosage_amount} ${supplement.dosage_unit}`
      : '';

    return (
      <Pressable
        key={index}
        style={[styles.supplementItem, !isLast && styles.supplementItemBorder]}
        onPress={() => editable && setEditingIndex(index)}
      >
        <View style={styles.supplementHeader}>
          <Text style={styles.supplementName} numberOfLines={1}>{supplement.name}</Text>
          {dosageDisplay ? (
            <Text style={styles.supplementDosage}>{dosageDisplay}</Text>
          ) : null}
        </View>
        {supplement.dosage_notes && (
          <Text style={styles.dosageNotes}>{supplement.dosage_notes}</Text>
        )}
        <Text style={styles.supplementTiming}>{supplement.timing}</Text>
        <Text style={styles.supplementPurpose}>{supplement.purpose}</Text>
        {supplement.notes && (
          <Text style={styles.supplementNotes}>Note: {supplement.notes}</Text>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Supplements</Text>

      <View style={styles.card}>
        {supplementation.supplements.map(renderSupplement)}

        {editable && (
          <Pressable style={styles.addButton} onPress={addSupplement}>
            <Plus size={16} color="#2d5a2d" />
            <Text style={styles.addButtonText}>Add supplement</Text>
          </Pressable>
        )}

        {supplementation.general_notes.length > 0 && (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>General Notes</Text>
            {supplementation.general_notes.map((note, index) => (
              <Text key={index} style={styles.noteItem}>
                • {note}
              </Text>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#2d5a2d',
  },
  supplementItem: {
    paddingBottom: 12,
    marginBottom: 12,
  },
  supplementItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  supplementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  supplementName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a2e1a',
    flex: 1,
  },
  supplementDosage: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2d5a2d',
    fontVariant: ['tabular-nums'],
  },
  dosageNotes: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  supplementTiming: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  supplementPurpose: {
    fontSize: 13,
    color: '#444',
    fontStyle: 'italic',
  },
  supplementNotes: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  notes: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  notesTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  noteItem: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2d5a2d',
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 6,
  },
  editField: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 14,
    color: '#1a2e1a',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2d5a2d',
  },
});
