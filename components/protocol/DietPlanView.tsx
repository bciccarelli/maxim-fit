'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Utensils, Droplets } from 'lucide-react';
import type { DietPlan } from '@/lib/schemas/protocol';

interface DietPlanViewProps {
  diet: DietPlan;
}

export function DietPlanView({ diet }: DietPlanViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Utensils className="h-5 w-5" />
          Diet Plan
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Macro Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-muted text-center">
            <p className="text-2xl font-bold">{diet.daily_calories}</p>
            <p className="text-xs text-muted-foreground">Calories</p>
          </div>
          <div className="p-4 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-center">
            <p className="text-2xl font-bold">{diet.protein_target_g}g</p>
            <p className="text-xs text-muted-foreground">Protein</p>
          </div>
          <div className="p-4 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-center">
            <p className="text-2xl font-bold">{diet.carbs_target_g}g</p>
            <p className="text-xs text-muted-foreground">Carbs</p>
          </div>
          <div className="p-4 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-center">
            <p className="text-2xl font-bold">{diet.fat_target_g}g</p>
            <p className="text-xs text-muted-foreground">Fat</p>
          </div>
        </div>

        {/* Hydration */}
        <div className="flex items-center gap-2 mb-6 p-3 rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
          <Droplets className="h-5 w-5 text-cyan-600" />
          <span className="font-medium">Daily Hydration: {diet.hydration_oz} oz</span>
        </div>

        {/* Meals */}
        <div className="space-y-4">
          <h4 className="font-semibold">Meals</h4>
          {diet.meals.map((meal, index) => (
            <div key={index} className="p-4 rounded-lg border">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium">{meal.name}</p>
                  <p className="text-sm text-muted-foreground">{meal.time}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium">{meal.calories} cal</p>
                  <p className="text-muted-foreground">
                    P: {meal.protein_g}g | C: {meal.carbs_g}g | F: {meal.fat_g}g
                  </p>
                </div>
              </div>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                {meal.foods.map((food, i) => (
                  <li key={i}>{food}</li>
                ))}
              </ul>
              {meal.notes && (
                <p className="mt-2 text-sm text-muted-foreground italic">{meal.notes}</p>
              )}
            </div>
          ))}
        </div>

        {/* Dietary Notes */}
        {diet.dietary_notes.length > 0 && (
          <div className="mt-6 p-4 rounded-lg bg-muted/50">
            <h4 className="font-semibold mb-2">Notes</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              {diet.dietary_notes.map((note, index) => (
                <li key={index}>{note}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
