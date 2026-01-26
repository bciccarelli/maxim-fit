'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, X, Loader2, MessageSquarePlus } from 'lucide-react';
import type { Critique } from '@/lib/schemas/protocol';

const CATEGORIES = [
  { value: 'Schedule', label: 'Schedule' },
  { value: 'Diet', label: 'Diet' },
  { value: 'Supplementation', label: 'Supplementation' },
  { value: 'Training', label: 'Training' },
  { value: 'Adherence', label: 'Adherence' },
  { value: 'Other', label: 'Other' },
];

const SEVERITIES = ['minor', 'moderate', 'major'] as const;

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (critiques: Critique[]) => void;
  loading: boolean;
}

export function FeedbackModal({ open, onOpenChange, onSubmit, loading }: FeedbackModalProps) {
  const [critiques, setCritiques] = useState<Critique[]>([]);
  const [category, setCategory] = useState('Schedule');
  const [criticism, setCriticism] = useState('');
  const [severity, setSeverity] = useState<'minor' | 'moderate' | 'major'>('moderate');
  const [suggestion, setSuggestion] = useState('');

  const resetForm = () => {
    setCategory('Schedule');
    setCriticism('');
    setSeverity('moderate');
    setSuggestion('');
  };

  const handleAdd = () => {
    if (!criticism.trim()) return;

    setCritiques((prev) => [
      ...prev,
      {
        category,
        criticism: criticism.trim(),
        severity,
        suggestion: suggestion.trim() || `Address the ${category.toLowerCase()} concern`,
      },
    ]);
    resetForm();
  };

  const handleRemove = (index: number) => {
    setCritiques((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    onSubmit(critiques);
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setCritiques([]);
      resetForm();
    }
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Feedback</DialogTitle>
          <DialogDescription>
            Provide your critiques to guide the optimization. Add one or more items, then click optimize.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                id="category"
                options={CATEGORIES}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <div className="flex gap-3 h-10 items-center">
                {SEVERITIES.map((s) => (
                  <label key={s} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="severity"
                      value={s}
                      checked={severity === s}
                      onChange={() => setSeverity(s)}
                      className="accent-primary"
                    />
                    <span className="capitalize">{s}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="criticism">Criticism *</Label>
            <Textarea
              id="criticism"
              placeholder="What needs to be improved?"
              value={criticism}
              onChange={(e) => setCriticism(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="suggestion">Suggestion (optional)</Label>
            <Textarea
              id="suggestion"
              placeholder="How should it be fixed?"
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              rows={2}
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAdd}
            disabled={!criticism.trim()}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add to List
          </Button>

          {critiques.length > 0 && (
            <div className="space-y-2">
              <Label>Added Critiques ({critiques.length})</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {critiques.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-2 rounded-md border p-3 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{c.category}</span>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            c.severity === 'major'
                              ? 'bg-destructive/15 text-destructive'
                              : c.severity === 'moderate'
                                ? 'bg-warning/15 text-warning'
                                : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {c.severity}
                        </span>
                      </div>
                      <p className="text-muted-foreground truncate">{c.criticism}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(i)}
                      className="shrink-0 rounded-sm opacity-70 hover:opacity-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={critiques.length === 0 || loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                Optimize with Feedback ({critiques.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
