'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Utensils, Droplets, Plus, Trash2, Save, ChevronDown, ChevronRight, Pencil, Sparkles, Clock, Target } from 'lucide-react';
import { InlineEditField } from './InlineEditField';
import { GenerateMealsModal } from './GenerateMealsModal';
import type { DietPlan, Meal } from '@/lib/schemas/protocol';

// Detect if a meal is a slot-based meal (has target macros set)
function isSlotBasedMeal(meal: Meal): boolean {
  return meal.target_calories !== undefined && meal.target_calories > 0;
}

interface DietPlanViewProps {
  diet: DietPlan;
  editable?: boolean;
  onChange?: (diet: DietPlan) => void;
  protocolId?: string;
  onMealsGenerated?: (newId: string) => void;
}

export function DietPlanView({ diet, editable = false, onChange, protocolId, onMealsGenerated }: DietPlanViewProps) {
  const [draft, setDraft] = useState<DietPlan>(diet);
  const [dirty, setDirty] = useState(false);
  const [expandedMeal, setExpandedMeal] = useState<number | null>(null);
  const [editingMealIndex, setEditingMealIndex] = useState<number | null>(null);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);

  const display = dirty ? draft : diet;

  const updateDraft = (updated: DietPlan) => {
    setDraft(updated);
    setDirty(true);
  };

  const handleSave = () => {
    onChange?.(draft);
    setDirty(false);
  };

  const handleUpdateMeal = (index: number, field: keyof Meal, value: unknown) => {
    const meals = [...draft.meals];
    meals[index] = { ...meals[index], [field]: value };
    updateDraft({ ...draft, meals });
  };

  const handleAddMeal = () => {
    const newIndex = draft.meals.length;
    updateDraft({ ...draft, meals: [...draft.meals, { name: 'New meal', time: '12:00', foods: [], calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, notes: null }] });
    setExpandedMeal(newIndex);
    setEditingMealIndex(newIndex);
  };

  const handleRemoveMeal = (index: number) => {
    updateDraft({ ...draft, meals: draft.meals.filter((_, i) => i !== index) });
    setExpandedMeal(null);
    setEditingMealIndex(null);
  };

  const handleStartEditing = (index: number) => {
    setEditingMealIndex(index);
    setExpandedMeal(index);
  };

  const isItemExpanded = (index: number) =>
    expandedMeal === index || editingMealIndex === index;

  return (
    <Card className="border-l-2 border-l-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Utensils className="h-5 w-5" />
          Diet plan
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="p-4 rounded-lg bg-muted text-center">
            {editable ? (
              <InlineEditField value={String(display.daily_calories)} onChange={(v) => updateDraft({ ...draft, daily_calories: parseInt(v) || 0 })} type="number" mono className="text-2xl font-semibold tabular-nums" />
            ) : (
              <p className="font-mono text-2xl font-semibold tabular-nums">{display.daily_calories.toLocaleString()}</p>
            )}
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mt-1">Calories</p>
          </div>
          <div className="p-4 rounded-lg bg-forest-100 dark:bg-forest-800/30 text-center">
            {editable ? (
              <InlineEditField value={String(display.protein_target_g)} onChange={(v) => updateDraft({ ...draft, protein_target_g: parseFloat(v) || 0 })} type="number" mono className="text-2xl font-semibold tabular-nums" />
            ) : (
              <p className="font-mono text-2xl font-semibold tabular-nums">{display.protein_target_g}<span className="text-xs text-muted-foreground ml-0.5">g</span></p>
            )}
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mt-1">Protein</p>
          </div>
          <div className="p-4 rounded-lg bg-forest-100 dark:bg-forest-800/30 text-center">
            {editable ? (
              <InlineEditField value={String(display.carbs_target_g)} onChange={(v) => updateDraft({ ...draft, carbs_target_g: parseFloat(v) || 0 })} type="number" mono className="text-2xl font-semibold tabular-nums" />
            ) : (
              <p className="font-mono text-2xl font-semibold tabular-nums">{display.carbs_target_g}<span className="text-xs text-muted-foreground ml-0.5">g</span></p>
            )}
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mt-1">Carbs</p>
          </div>
          <div className="p-4 rounded-lg bg-forest-200 dark:bg-forest-800/30 text-center">
            {editable ? (
              <InlineEditField value={String(display.fat_target_g)} onChange={(v) => updateDraft({ ...draft, fat_target_g: parseFloat(v) || 0 })} type="number" mono className="text-2xl font-semibold tabular-nums" />
            ) : (
              <p className="font-mono text-2xl font-semibold tabular-nums">{display.fat_target_g}<span className="text-xs text-muted-foreground ml-0.5">g</span></p>
            )}
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mt-1">Fat</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6 border-l-2 border-l-info pl-4 py-2">
          <Droplets className="h-4 w-4 text-info" />
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Hydration</span>
          {editable ? (
            <InlineEditField value={String(display.hydration_oz)} onChange={(v) => updateDraft({ ...draft, hydration_oz: parseFloat(v) || 0 })} type="number" mono className="text-sm font-medium" />
          ) : (
            <span className="font-mono text-sm font-medium">{display.hydration_oz}</span>
          )}
          <span className="font-mono text-xs text-muted-foreground">oz</span>
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Meals</h4>
          <div className="divide-y divide-border">
            {display.meals.map((meal, index) => {
              const expanded = isItemExpanded(index);
              const isEditing = editingMealIndex === index;
              const isSlot = isSlotBasedMeal(meal);

              return (
                <div key={index} className="py-3">
                  <div className="flex items-start justify-between mb-1">
                    <div
                      className="flex items-center gap-2 cursor-pointer flex-1"
                      onClick={() => setExpandedMeal(expandedMeal === index ? null : index)}
                    >
                      {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{meal.name}</p>
                          {isSlot && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-primary/10 text-primary">
                              <Target className="h-3 w-3" />
                              Slot
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span className="font-mono text-xs">{meal.time}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {editable && !isEditing && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => handleStartEditing(index)}
                          aria-label="Edit meal"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                      <div className="text-right">
                        {isSlot ? (
                          <>
                            <p className="font-mono text-sm font-semibold tabular-nums text-primary">
                              {meal.target_calories}<span className="text-xs text-primary/70 ml-0.5">cal target</span>
                            </p>
                            <p className="font-mono text-xs text-primary/80 tabular-nums">
                              P {Math.round(meal.target_protein_g || 0)}g · C {Math.round(meal.target_carbs_g || 0)}g · F {Math.round(meal.target_fat_g || 0)}g
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="font-mono text-sm font-medium tabular-nums">{meal.calories}<span className="text-xs text-muted-foreground ml-0.5">cal</span></p>
                            <p className="font-mono text-xs text-muted-foreground tabular-nums">P {meal.protein_g}g · C {meal.carbs_g}g · F {meal.fat_g}g</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {expanded && (
                    isEditing ? (
                      <div className="ml-6 mt-2 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <Input value={meal.name} onChange={(e) => handleUpdateMeal(index, 'name', e.target.value)} placeholder="Meal name" className="text-sm" />
                          <Input type="time" value={meal.time} onChange={(e) => handleUpdateMeal(index, 'time', e.target.value)} className="font-mono text-sm" />
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <div><label className="text-xs text-muted-foreground">Calories</label><Input type="number" value={meal.calories} onChange={(e) => handleUpdateMeal(index, 'calories', parseInt(e.target.value) || 0)} className="font-mono text-sm" /></div>
                          <div><label className="text-xs text-muted-foreground">Protein</label><Input type="number" value={meal.protein_g} onChange={(e) => handleUpdateMeal(index, 'protein_g', parseFloat(e.target.value) || 0)} className="font-mono text-sm" /></div>
                          <div><label className="text-xs text-muted-foreground">Carbs</label><Input type="number" value={meal.carbs_g} onChange={(e) => handleUpdateMeal(index, 'carbs_g', parseFloat(e.target.value) || 0)} className="font-mono text-sm" /></div>
                          <div><label className="text-xs text-muted-foreground">Fat</label><Input type="number" value={meal.fat_g} onChange={(e) => handleUpdateMeal(index, 'fat_g', parseFloat(e.target.value) || 0)} className="font-mono text-sm" /></div>
                        </div>
                        <Input value={meal.foods.join(', ')} onChange={(e) => handleUpdateMeal(index, 'foods', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))} placeholder="Foods (comma-separated)" className="text-sm" />
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setEditingMealIndex(null)}>Done</Button>
                          <Button variant="ghost" size="sm" onClick={() => handleRemoveMeal(index)} className="text-destructive hover:text-destructive"><Trash2 className="h-3 w-3 mr-1" />Remove meal</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="ml-6 mt-2 space-y-2">
                        {/* Timing context for slot-based meals */}
                        {isSlot && meal.timing_context && (
                          <div className="border-l-2 border-l-info pl-3 py-1">
                            <p className="text-xs text-muted-foreground">{meal.timing_context}</p>
                          </div>
                        )}

                        {/* Notes/guidance */}
                        {meal.notes && (
                          <p className="text-sm text-muted-foreground">{meal.notes}</p>
                        )}

                        {/* Foods list */}
                        {meal.foods.length > 0 ? (
                          <ul className="list-disc list-inside text-sm text-muted-foreground">
                            {meal.foods.map((food, i) => (<li key={i}>{food}</li>))}
                          </ul>
                        ) : isSlot ? (
                          <div className="p-3 rounded-lg bg-muted/50 border border-dashed border-muted-foreground/30">
                            <p className="text-xs text-muted-foreground italic">
                              Choose your own foods to hit the macro targets above
                            </p>
                            {editable && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-2 h-7 text-xs"
                                onClick={() => handleStartEditing(index)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add foods
                              </Button>
                            )}
                          </div>
                        ) : null}
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {display.dietary_notes.length > 0 && (
          <div className="mt-6 border-t pt-4">
            <h4 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Notes</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              {display.dietary_notes.map((note, index) => (<li key={index}>{note}</li>))}
            </ul>
          </div>
        )}

        {editable && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleAddMeal}><Plus className="h-4 w-4 mr-1" />Add meal</Button>
              {protocolId && onMealsGenerated && (
                <Button variant="outline" size="sm" onClick={() => setGenerateModalOpen(true)}>
                  <Sparkles className="h-4 w-4 mr-1" />Generate timing
                </Button>
              )}
            </div>
            {dirty && <Button size="sm" onClick={handleSave}><Save className="h-4 w-4 mr-1" />Save changes</Button>}
          </div>
        )}

        {protocolId && onMealsGenerated && (
          <GenerateMealsModal
            open={generateModalOpen}
            onOpenChange={setGenerateModalOpen}
            protocolId={protocolId}
            onAccepted={onMealsGenerated}
            currentMacros={{
              calories: display.daily_calories,
              protein_g: display.protein_target_g,
              carbs_g: display.carbs_target_g,
              fat_g: display.fat_target_g,
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
