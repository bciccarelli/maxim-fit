'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Utensils, Droplets } from 'lucide-react';
import type { DietPlan } from '@/lib/schemas/protocol';

interface DietPlanViewProps {
  diet: DietPlan;
}

export function DietPlanView({ diet }: DietPlanViewProps) {
  return (
    <Card className="border-l-2 border-l-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Utensils className="h-5 w-5" />
          Diet plan
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Macro Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="p-4 rounded-lg bg-muted text-center">
            <p className="font-mono text-2xl font-semibold tabular-nums">{diet.daily_calories.toLocaleString()}</p>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mt-1">Calories</p>
          </div>
          <div className="p-4 rounded-lg bg-forest-100 dark:bg-forest-800/30 text-center">
            <p className="font-mono text-2xl font-semibold tabular-nums">{diet.protein_target_g}<span className="text-xs text-muted-foreground ml-0.5">g</span></p>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mt-1">Protein</p>
          </div>
          <div className="p-4 rounded-lg bg-forest-100 dark:bg-forest-800/30 text-center">
            <p className="font-mono text-2xl font-semibold tabular-nums">{diet.carbs_target_g}<span className="text-xs text-muted-foreground ml-0.5">g</span></p>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mt-1">Carbs</p>
          </div>
          <div className="p-4 rounded-lg bg-forest-200 dark:bg-forest-800/30 text-center">
            <p className="font-mono text-2xl font-semibold tabular-nums">{diet.fat_target_g}<span className="text-xs text-muted-foreground ml-0.5">g</span></p>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mt-1">Fat</p>
          </div>
        </div>

        {/* Hydration */}
        <div className="flex items-center gap-2 mb-6 border-l-2 border-l-info pl-4 py-2">
          <Droplets className="h-4 w-4 text-info" />
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Hydration</span>
          <span className="font-mono text-sm font-medium">{diet.hydration_oz}<span className="text-xs text-muted-foreground ml-0.5">oz</span></span>
        </div>

        {/* Meals */}
        <div className="space-y-3">
          <h4 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Meals</h4>
          <div className="divide-y divide-border">
            {diet.meals.map((meal, index) => (
              <div key={index} className="py-3">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="font-medium text-sm">{meal.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{meal.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-medium tabular-nums">{meal.calories}<span className="text-xs text-muted-foreground ml-0.5">cal</span></p>
                    <p className="font-mono text-xs text-muted-foreground tabular-nums">
                      P {meal.protein_g}g · C {meal.carbs_g}g · F {meal.fat_g}g
                    </p>
                  </div>
                </div>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  {meal.foods.map((food, i) => (
                    <li key={i}>{food}</li>
                  ))}
                </ul>
                {meal.notes && (
                  <p className="mt-1 text-sm text-muted-foreground italic">{meal.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Dietary Notes */}
        {diet.dietary_notes.length > 0 && (
          <div className="mt-6 border-t pt-4">
            <h4 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Notes</h4>
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
