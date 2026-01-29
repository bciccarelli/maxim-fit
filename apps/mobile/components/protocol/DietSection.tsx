import { View, Text, StyleSheet } from 'react-native';
import type { DietPlan } from '@protocol/shared/schemas';

type Props = {
  diet: DietPlan;
};

export function DietSection({ diet }: Props) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Diet</Text>

      <View style={styles.card}>
        {/* Macro Summary */}
        <View style={styles.macrosRow}>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{diet.daily_calories.toLocaleString()}</Text>
            <Text style={styles.macroLabel}>Calories</Text>
          </View>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{diet.protein_target_g}g</Text>
            <Text style={styles.macroLabel}>Protein</Text>
          </View>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{diet.carbs_target_g}g</Text>
            <Text style={styles.macroLabel}>Carbs</Text>
          </View>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{diet.fat_target_g}g</Text>
            <Text style={styles.macroLabel}>Fat</Text>
          </View>
        </View>

        <View style={styles.hydration}>
          <Text style={styles.hydrationText}>
            💧 {diet.hydration_oz} oz water daily
          </Text>
        </View>

        {/* Meals */}
        <View style={styles.meals}>
          {diet.meals.map((meal, index) => (
            <View key={index} style={styles.mealItem}>
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
              <View style={styles.foodsList}>
                {meal.foods.map((food, foodIndex) => (
                  <Text key={foodIndex} style={styles.foodItem}>
                    • {food}
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Dietary Notes */}
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
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a2e1a',
    fontVariant: ['tabular-nums'],
  },
  macroLabel: {
    fontSize: 10,
    color: '#666',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  hydration: {
    backgroundColor: '#e3f2fd',
    padding: 8,
    borderRadius: 6,
    marginBottom: 16,
  },
  hydrationText: {
    fontSize: 13,
    color: '#1565c0',
    textAlign: 'center',
  },
  meals: {},
  mealItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  mealTime: {
    fontSize: 12,
    color: '#666',
    fontVariant: ['tabular-nums'],
    width: 50,
  },
  mealName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a2e1a',
    flex: 1,
  },
  mealCalories: {
    fontSize: 13,
    color: '#666',
    fontVariant: ['tabular-nums'],
  },
  mealMacros: {
    marginLeft: 50,
    marginBottom: 6,
  },
  mealMacroText: {
    fontSize: 11,
    color: '#888',
    fontVariant: ['tabular-nums'],
  },
  foodsList: {
    marginLeft: 50,
  },
  foodItem: {
    fontSize: 13,
    color: '#444',
    lineHeight: 20,
  },
  notes: {
    marginTop: 8,
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
});
