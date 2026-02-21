import { View, Text, StyleSheet, Pressable, Modal, Keyboard } from 'react-native';
import { useState, useCallback } from 'react';
import { Plus, Trash2, X, Pill } from 'lucide-react-native';
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
    const isLast = index === supplementation.supplements.length - 1;

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

  const editingSupplement = editingIndex !== null ? supplementation.supplements[editingIndex] : null;

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

      {/* Edit Supplement Modal */}
      <Modal
        visible={editingSupplement !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingIndex(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            Keyboard.dismiss();
            setEditingIndex(null);
          }}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {editingSupplement && editingIndex !== null && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderLeft}>
                    <Pill size={16} color="#0284c7" />
                    <Text style={styles.modalTitle}>{editingSupplement.name}</Text>
                  </View>
                  <Pressable
                    style={styles.modalCloseButton}
                    onPress={() => setEditingIndex(null)}
                  >
                    <X size={20} color="#666" />
                  </Pressable>
                </View>

                <View style={styles.modalBody}>
                  <View style={styles.modalField}>
                    <Text style={styles.modalFieldLabel}>Name</Text>
                    <EditableField
                      value={editingSupplement.name}
                      onChange={(name) => updateSupplement(editingIndex, { name })}
                      editable
                      style={styles.modalFieldInput}
                    />
                  </View>

                  <View style={styles.modalField}>
                    <Text style={styles.modalFieldLabel}>Dosage</Text>
                    <DosageInput
                      amount={editingSupplement.dosage_amount}
                      unit={editingSupplement.dosage_unit}
                      notes={editingSupplement.dosage_notes}
                      onAmountChange={(dosage_amount) => updateSupplement(editingIndex, { dosage_amount })}
                      onUnitChange={(dosage_unit) => updateSupplement(editingIndex, { dosage_unit })}
                      onNotesChange={(dosage_notes) => updateSupplement(editingIndex, { dosage_notes })}
                    />
                  </View>

                  <View style={styles.modalField}>
                    <Text style={styles.modalFieldLabel}>Timing</Text>
                    <EditableField
                      value={editingSupplement.timing}
                      onChange={(timing) => updateSupplement(editingIndex, { timing })}
                      editable
                      style={styles.modalFieldInput}
                    />
                  </View>

                  <View style={styles.modalField}>
                    <Text style={styles.modalFieldLabel}>Purpose</Text>
                    <EditableField
                      value={editingSupplement.purpose}
                      onChange={(purpose) => updateSupplement(editingIndex, { purpose })}
                      editable
                      style={styles.modalFieldInput}
                    />
                  </View>

                  <View style={styles.modalField}>
                    <Text style={styles.modalFieldLabel}>Notes</Text>
                    <EditableField
                      value={editingSupplement.notes || ''}
                      onChange={(notes) => updateSupplement(editingIndex, { notes: notes || null })}
                      editable
                      style={styles.modalFieldInput}
                      placeholder="Optional"
                    />
                  </View>
                </View>

                <Pressable
                  style={styles.modalDeleteButton}
                  onPress={() => removeSupplement(editingIndex)}
                >
                  <Trash2 size={16} color="#c62828" />
                  <Text style={styles.modalDeleteText}>Delete supplement</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a2e1a',
    flex: 1,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    gap: 12,
  },
  modalField: {
    marginBottom: 4,
  },
  modalFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  modalFieldInput: {
    fontSize: 16,
    backgroundColor: '#f5f5f0',
    borderRadius: 8,
    padding: 12,
  },
  modalDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  modalDeleteText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#c62828',
  },
});
