import { View, Text, StyleSheet, Pressable, Modal, Keyboard, KeyboardAvoidingView, Platform, InputAccessoryView } from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { Plus, Trash2, X, Utensils } from 'lucide-react-native';
import type { DietPlan, Meal } from '@protocol/shared/schemas';
import { colors } from '@/lib/theme';
import { EditableField } from './EditableField';
import { KEYBOARD_ACCESSORY_ID } from '@/components/shared/KeyboardAccessoryProvider';

type Props = {
  diet: DietPlan;
  editable?: boolean;
  onChange?: (diet: DietPlan) => void;
};

const EMPTY_MEAL: Meal = {
  name: 'New Meal',
  time: '12:00',
  foods: [],
  calories: 400,
  protein_g: 30,
  carbs_g: 40,
  fat_g: 15,
  notes: null,
};

export function DietSection({ diet, editable = false, onChange }: Props) {
  const [editingMacros, setEditingMacros] = useState(false);
  const [editingMealIndex, setEditingMealIndex] = useState<number | null>(null);
  const [expandedMealIndex, setExpandedMealIndex] = useState<number | null>(null);

  const mealTotals = useMemo(() => ({
    calories: diet.meals.reduce((sum, m) => sum + m.calories, 0),
    protein: diet.meals.reduce((sum, m) => sum + m.protein_g, 0),
    carbs: diet.meals.reduce((sum, m) => sum + m.carbs_g, 0),
    fat: diet.meals.reduce((sum, m) => sum + m.fat_g, 0),
  }), [diet.meals]);

  const updateDiet = useCallback(
    (updates: Partial<DietPlan>) => {
      onChange?.({ ...diet, ...updates });
    },
    [diet, onChange]
  );

  const updateMeal = useCallback(
    (index: number, updates: Partial<Meal>) => {
      const newMeals = [...diet.meals];
      newMeals[index] = { ...newMeals[index], ...updates };
      onChange?.({ ...diet, meals: newMeals });
    },
    [diet, onChange]
  );

  const addMeal = useCallback(() => {
    const newMeals = [...diet.meals, { ...EMPTY_MEAL }];
    onChange?.({ ...diet, meals: newMeals });
    setEditingMealIndex(newMeals.length - 1);
  }, [diet, onChange]);

  const removeMeal = useCallback(
    (index: number) => {
      const newMeals = diet.meals.filter((_, i) => i !== index);
      onChange?.({ ...diet, meals: newMeals });
      setEditingMealIndex(null);
    },
    [diet, onChange]
  );

  const renderMacroSummary = () => {
    if (editingMacros && editable) {
      return (
        <View style={styles.macrosEditCard}>
          <View style={styles.editHeader}>
            <Text style={styles.editLabel}>Edit Daily Targets</Text>
            <Pressable style={styles.iconButton} onPress={() => setEditingMacros(false)}>
              <X size={18} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>

          <View style={styles.macroEditRow}>
            <View style={styles.macroEditItem}>
              <Text style={styles.macroEditLabel}>Calories</Text>
              <EditableField
                value={String(diet.daily_calories)}
                onChange={(v) => updateDiet({ daily_calories: parseInt(v) || 0 })}
                type="number"
                editable
                mono
                style={styles.macroEditValue}
              />
            </View>
            <View style={styles.macroEditItem}>
              <Text style={styles.macroEditLabel}>Protein (g)</Text>
              <EditableField
                value={String(diet.protein_target_g)}
                onChange={(v) => updateDiet({ protein_target_g: parseInt(v) || 0 })}
                type="number"
                editable
                mono
                style={styles.macroEditValue}
              />
            </View>
          </View>

          <View style={styles.macroEditRow}>
            <View style={styles.macroEditItem}>
              <Text style={styles.macroEditLabel}>Carbs (g)</Text>
              <EditableField
                value={String(diet.carbs_target_g)}
                onChange={(v) => updateDiet({ carbs_target_g: parseInt(v) || 0 })}
                type="number"
                editable
                mono
                style={styles.macroEditValue}
              />
            </View>
            <View style={styles.macroEditItem}>
              <Text style={styles.macroEditLabel}>Fat (g)</Text>
              <EditableField
                value={String(diet.fat_target_g)}
                onChange={(v) => updateDiet({ fat_target_g: parseInt(v) || 0 })}
                type="number"
                editable
                mono
                style={styles.macroEditValue}
              />
            </View>
          </View>

          <View style={styles.macroEditRow}>
            <View style={[styles.macroEditItem, { flex: 1 }]}>
              <Text style={styles.macroEditLabel}>Hydration (oz)</Text>
              <EditableField
                value={String(diet.hydration_oz)}
                onChange={(v) => updateDiet({ hydration_oz: parseInt(v) || 0 })}
                type="number"
                editable
                mono
                style={styles.macroEditValue}
              />
            </View>
          </View>
        </View>
      );
    }

    return (
      <Pressable onPress={() => editable && setEditingMacros(true)}>
        <View style={styles.macrosRow}>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{mealTotals.calories.toLocaleString()}</Text>
            <Text style={styles.macroTarget}>of {diet.daily_calories.toLocaleString()}</Text>
            <Text style={styles.macroLabel}>Calories</Text>
          </View>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{mealTotals.protein}g</Text>
            <Text style={styles.macroTarget}>of {diet.protein_target_g}g</Text>
            <Text style={styles.macroLabel}>Protein</Text>
          </View>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{mealTotals.carbs}g</Text>
            <Text style={styles.macroTarget}>of {diet.carbs_target_g}g</Text>
            <Text style={styles.macroLabel}>Carbs</Text>
          </View>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{mealTotals.fat}g</Text>
            <Text style={styles.macroTarget}>of {diet.fat_target_g}g</Text>
            <Text style={styles.macroLabel}>Fat</Text>
          </View>
        </View>

        <View style={styles.hydration}>
          <Text style={styles.hydrationText}>
            {diet.hydration_oz} oz water daily
          </Text>
        </View>
      </Pressable>
    );
  };

  const renderMeal = (meal: Meal, index: number) => {
    const isExpanded = expandedMealIndex === index;

    const handleMealPress = () => {
      if (editable) {
        // Open edit modal
        setEditingMealIndex(index);
      } else {
        // Toggle expand
        setExpandedMealIndex(isExpanded ? null : index);
      }
    };

    return (
      <Pressable
        key={index}
        style={styles.mealItem}
        onPress={handleMealPress}
      >
        <View style={styles.mealHeader}>
          <Text style={styles.mealTime}>{meal.time}</Text>
          <Text style={styles.mealName}>{meal.name}</Text>
          <Text style={styles.mealCalories}>{meal.calories} cal</Text>
        </View>
        <View style={styles.mealMacros}>
          <Text style={styles.mealMacroText}>
            P {meal.protein_g}g · C {meal.carbs_g}g · F {meal.fat_g}g
          </Text>
        </View>
        {(isExpanded || !editable) && meal.foods.length > 0 && (
          <View style={styles.foodsList}>
            {meal.foods.map((food, foodIndex) => (
              <Text key={foodIndex} style={styles.foodItem}>
                • {food}
              </Text>
            ))}
          </View>
        )}
      </Pressable>
    );
  };

  const editingMeal = editingMealIndex !== null ? diet.meals[editingMealIndex] : null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Diet</Text>

      <View style={styles.card}>
        {renderMacroSummary()}

        <View style={styles.meals}>
          {diet.meals.map(renderMeal)}
        </View>

        {editable && (
          <Pressable style={styles.addButton} onPress={addMeal}>
            <Plus size={16} color={colors.primaryContainer} />
            <Text style={styles.addButtonText}>Add meal</Text>
          </Pressable>
        )}

        {diet.dietary_notes.length > 0 && (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>Notes</Text>
            {diet.dietary_notes.map((note, index) => (
              <Text key={index} style={styles.noteItem}>
                • {note}
              </Text>
            ))}
          </View>
        )}
      </View>

      {/* Edit Meal Modal */}
      <Modal
        visible={editingMeal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingMealIndex(null)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => {
              Keyboard.dismiss();
              setEditingMealIndex(null);
            }}
          >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {editingMeal && editingMealIndex !== null && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderLeft}>
                    <Utensils size={16} color={colors.primaryContainer} />
                    <Text style={styles.modalTitle}>{editingMeal.name}</Text>
                  </View>
                  <Pressable
                    style={styles.modalCloseButton}
                    onPress={() => setEditingMealIndex(null)}
                  >
                    <X size={20} color={colors.onSurfaceVariant} />
                  </Pressable>
                </View>

                <View style={styles.modalBody}>
                  <View style={styles.modalFieldRow}>
                    <View style={[styles.modalField, { flex: 1 }]}>
                      <Text style={styles.modalFieldLabel}>Time</Text>
                      <EditableField
                        value={editingMeal.time}
                        onChange={(time) => updateMeal(editingMealIndex, { time })}
                        type="time"
                        editable
                        mono
                        style={styles.modalFieldInput}
                      />
                    </View>
                    <View style={[styles.modalField, { flex: 2, marginLeft: 12 }]}>
                      <Text style={styles.modalFieldLabel}>Name</Text>
                      <EditableField
                        value={editingMeal.name}
                        onChange={(name) => updateMeal(editingMealIndex, { name })}
                        editable
                        style={styles.modalFieldInput}
                      />
                    </View>
                  </View>

                  <View style={styles.modalFieldRow}>
                    <View style={[styles.modalField, { flex: 1 }]}>
                      <Text style={styles.modalFieldLabel}>Calories</Text>
                      <EditableField
                        value={String(editingMeal.calories)}
                        onChange={(v) => updateMeal(editingMealIndex, { calories: parseInt(v) || 0 })}
                        type="number"
                        editable
                        mono
                        style={styles.modalFieldInput}
                      />
                    </View>
                    <View style={[styles.modalField, { flex: 1, marginLeft: 12 }]}>
                      <Text style={styles.modalFieldLabel}>Protein (g)</Text>
                      <EditableField
                        value={String(editingMeal.protein_g)}
                        onChange={(v) => updateMeal(editingMealIndex, { protein_g: parseInt(v) || 0 })}
                        type="number"
                        editable
                        mono
                        style={styles.modalFieldInput}
                      />
                    </View>
                  </View>

                  <View style={styles.modalFieldRow}>
                    <View style={[styles.modalField, { flex: 1 }]}>
                      <Text style={styles.modalFieldLabel}>Carbs (g)</Text>
                      <EditableField
                        value={String(editingMeal.carbs_g)}
                        onChange={(v) => updateMeal(editingMealIndex, { carbs_g: parseInt(v) || 0 })}
                        type="number"
                        editable
                        mono
                        style={styles.modalFieldInput}
                      />
                    </View>
                    <View style={[styles.modalField, { flex: 1, marginLeft: 12 }]}>
                      <Text style={styles.modalFieldLabel}>Fat (g)</Text>
                      <EditableField
                        value={String(editingMeal.fat_g)}
                        onChange={(v) => updateMeal(editingMealIndex, { fat_g: parseInt(v) || 0 })}
                        type="number"
                        editable
                        mono
                        style={styles.modalFieldInput}
                      />
                    </View>
                  </View>

                  <View style={styles.modalField}>
                    <Text style={styles.modalFieldLabel}>Foods (comma-separated)</Text>
                    <EditableField
                      value={editingMeal.foods.join(', ')}
                      onChange={(v) => updateMeal(editingMealIndex, { foods: v.split(',').map((f) => f.trim()).filter(Boolean) })}
                      editable
                      multiline
                      style={styles.modalFieldInput}
                    />
                  </View>
                </View>

                <Pressable
                  style={styles.modalDeleteButton}
                  onPress={() => removeMeal(editingMealIndex)}
                >
                  <Trash2 size={16} color={colors.destructive} />
                  <Text style={styles.modalDeleteText}>Delete meal</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={KEYBOARD_ACCESSORY_ID}>
          <View style={styles.accessoryContainer}>
            <View style={{ flex: 1 }} />
            <Pressable
              onPress={() => Keyboard.dismiss()}
              style={styles.accessoryDoneButton}
              hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
            >
              <Text style={styles.accessoryDoneText}>Done</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      )}
      </KeyboardAvoidingView>
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
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 0,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: colors.primaryContainer,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.onSurface,
    fontVariant: ['tabular-nums'],
  },
  macroTarget: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    fontVariant: ['tabular-nums'],
    marginTop: 1,
  },
  macroLabel: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  macrosEditCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 0,
    padding: 12,
    marginBottom: 12,
  },
  macroEditRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  macroEditItem: {
    flex: 1,
  },
  macroEditLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  macroEditValue: {
    fontSize: 16,
  },
  hydration: {
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    padding: 8,
    borderRadius: 0,
    marginBottom: 16,
  },
  hydrationText: {
    fontSize: 13,
    color: colors.info,
    textAlign: 'center',
  },
  meals: {},
  mealItem: {
    marginBottom: 16,
    paddingBottom: 16,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  mealTime: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    fontVariant: ['tabular-nums'],
    width: 50,
  },
  mealName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.onSurface,
    flex: 1,
  },
  mealCalories: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    fontVariant: ['tabular-nums'],
  },
  mealMacros: {
    marginLeft: 50,
    marginBottom: 6,
  },
  mealMacroText: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    fontVariant: ['tabular-nums'],
  },
  foodsList: {
    marginLeft: 50,
  },
  foodItem: {
    fontSize: 13,
    color: colors.onSurface,
    lineHeight: 20,
  },
  notes: {
    marginTop: 8,
    paddingTop: 12,
  },
  notesTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  noteItem: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
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
    color: colors.primaryContainer,
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
  editFieldRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 4,
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primaryContainer,
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
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 0,
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
    color: colors.onSurface,
    flex: 1,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    gap: 12,
  },
  modalFieldRow: {
    flexDirection: 'row',
  },
  modalField: {
    marginBottom: 4,
  },
  modalFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  modalFieldInput: {
    fontSize: 16,
    backgroundColor: colors.surface,
    borderRadius: 0,
    padding: 12,
  },
  modalDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 12,
  },
  modalDeleteText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.destructive,
  },
  accessoryContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  accessoryDoneButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  accessoryDoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primaryContainer,
  },
});
