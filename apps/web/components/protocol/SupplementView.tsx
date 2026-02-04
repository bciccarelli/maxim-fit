'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pill, Plus, Trash2, Save, ChevronDown, ChevronRight, Pencil } from 'lucide-react';
import type { SupplementationPlan, Supplement } from '@/lib/schemas/protocol';

interface SupplementViewProps {
  supplementation: SupplementationPlan;
  editable?: boolean;
  onChange?: (supplementation: SupplementationPlan) => void;
}

export function SupplementView({ supplementation, editable = false, onChange }: SupplementViewProps) {
  const [draft, setDraft] = useState<SupplementationPlan>(supplementation);
  const [dirty, setDirty] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const display = dirty ? draft : supplementation;

  const updateDraft = (updated: SupplementationPlan) => {
    setDraft(updated);
    setDirty(true);
  };

  const handleSave = () => {
    onChange?.(draft);
    setDirty(false);
  };

  const handleUpdateSupplement = (index: number, field: keyof Supplement, value: string) => {
    const supplements = [...draft.supplements];
    supplements[index] = { ...supplements[index], [field]: value };
    updateDraft({ ...draft, supplements });
  };

  const handleAddSupplement = () => {
    const newIndex = draft.supplements.length;
    updateDraft({ ...draft, supplements: [...draft.supplements, { name: 'New supplement', dosage_amount: '', dosage_unit: 'mg', dosage_notes: null, time: '08:00', timing: 'Morning', purpose: '', notes: null }] });
    setExpandedIndex(newIndex);
    setEditingIndex(newIndex);
  };

  const handleRemoveSupplement = (index: number) => {
    updateDraft({ ...draft, supplements: draft.supplements.filter((_, i) => i !== index) });
    setExpandedIndex(null);
    setEditingIndex(null);
  };

  const handleStartEditing = (index: number) => {
    setEditingIndex(index);
    setExpandedIndex(index);
  };

  const isItemExpanded = (index: number) =>
    expandedIndex === index || editingIndex === index;

  return (
    <Card className="border-l-2 border-l-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pill className="h-5 w-5" />
          Supplementation
        </CardTitle>
      </CardHeader>
      <CardContent>
        {display.supplements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No supplements recommended.</p>
        ) : (
          <div className="divide-y divide-border">
            {display.supplements.map((supplement, index) => {
              const expanded = isItemExpanded(index);
              const isEditing = editingIndex === index;
              return (
                <div key={index} className="py-3">
                  <div className="flex items-start justify-between mb-1">
                    <div
                      className="flex items-center gap-2 cursor-pointer flex-1"
                      onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                    >
                      {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                      <div>
                        <p className="font-medium text-sm">{supplement.name}</p>
                        <p className="font-mono text-sm text-primary">
                          {supplement.dosage_amount} {supplement.dosage_unit}
                          {supplement.dosage_notes && <span className="text-muted-foreground"> ({supplement.dosage_notes})</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {editable && !isEditing && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => handleStartEditing(index)}
                          aria-label="Edit supplement"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                      <span className="font-mono text-xs text-muted-foreground">{supplement.timing}</span>
                    </div>
                  </div>

                  {expanded && (
                    isEditing ? (
                      <div className="ml-6 mt-2 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <Input value={supplement.name} onChange={(e) => handleUpdateSupplement(index, 'name', e.target.value)} placeholder="Name" className="text-sm" />
                          <div className="flex gap-1">
                            <Input value={supplement.dosage_amount} onChange={(e) => handleUpdateSupplement(index, 'dosage_amount', e.target.value)} placeholder="Amount" className="font-mono text-sm w-20" />
                            <Input value={supplement.dosage_unit} onChange={(e) => handleUpdateSupplement(index, 'dosage_unit', e.target.value)} placeholder="Unit" className="text-sm w-20" />
                          </div>
                        </div>
                        <Input value={supplement.dosage_notes || ''} onChange={(e) => handleUpdateSupplement(index, 'dosage_notes', e.target.value)} placeholder="Dosage notes (e.g., standardized to 3%)" className="text-sm" />
                        <div className="grid grid-cols-2 gap-2">
                          <Input value={supplement.timing} onChange={(e) => handleUpdateSupplement(index, 'timing', e.target.value)} placeholder="Timing" className="text-sm" />
                          <Input value={supplement.purpose} onChange={(e) => handleUpdateSupplement(index, 'purpose', e.target.value)} placeholder="Purpose" className="text-sm" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setEditingIndex(null)}>Done</Button>
                          <Button variant="ghost" size="sm" onClick={() => handleRemoveSupplement(index)} className="text-destructive hover:text-destructive"><Trash2 className="h-3 w-3 mr-1" />Remove</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="ml-6">
                        <p className="text-sm text-muted-foreground">{supplement.purpose}</p>
                        {supplement.notes && <p className="mt-1 text-xs text-muted-foreground italic">{supplement.notes}</p>}
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}

        {display.general_notes.length > 0 && (
          <div className="mt-6 border-t pt-4">
            <h4 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Notes</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              {display.general_notes.map((note, index) => (<li key={index}>{note}</li>))}
            </ul>
          </div>
        )}

        {editable && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <Button variant="outline" size="sm" onClick={handleAddSupplement}><Plus className="h-4 w-4 mr-1" />Add supplement</Button>
            {dirty && <Button size="sm" onClick={handleSave}><Save className="h-4 w-4 mr-1" />Save changes</Button>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
