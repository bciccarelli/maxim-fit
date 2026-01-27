'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Upload, AlertCircle, CheckCircle2, Sparkles, X } from 'lucide-react';

type ImportState = 'idle' | 'loading' | 'success' | 'error';

interface ImportProtocolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportProtocolDialog({ open, onOpenChange }: ImportProtocolDialogProps) {
  const [state, setState] = useState<ImportState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState('');
  const router = useRouter();

  const handleSubmit = async () => {
    if (!pasteText.trim()) {
      setError('Please paste some text to parse');
      setState('error');
      return;
    }

    setState('loading');
    setError(null);

    try {
      const response = await fetch('/api/protocol/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pasteText }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to parse protocol');
      }

      setState('success');
      setTimeout(() => {
        handleClose();
        router.push(`/protocols/${result.id}`);
        router.refresh();
      }, 1500);
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Failed to parse protocol');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setState('idle');
    setError(null);
    setPasteText('');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative z-50 w-full max-w-lg mx-4 bg-background border rounded-lg p-5">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-colors duration-150"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        <div className="mb-4">
          <h2 className="text-lg font-semibold">Import protocol</h2>
          <p className="text-sm text-muted-foreground">
            Paste your protocol text and AI will parse it into a structured protocol with inferred goals.
          </p>
        </div>

        {state === 'loading' && (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Parsing and verifying...</p>
            <p className="text-xs text-muted-foreground mt-2">
              Extracting protocol structure, inferring goals, and verifying with current evidence
            </p>
          </div>
        )}

        {state === 'success' && (
          <div className="text-center py-8">
            <CheckCircle2 className="h-10 w-10 mx-auto text-success mb-4" />
            <p className="text-sm font-medium">Protocol imported successfully!</p>
            <p className="text-xs text-muted-foreground mt-1">
              Redirecting to your protocol...
            </p>
          </div>
        )}

        {state === 'error' && (
          <div className="space-y-4 py-4">
            <div className="bg-destructive/10 text-destructive rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Import failed</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={() => { setState('idle'); setError(null); }}>
              Try again
            </Button>
          </div>
        )}

        {state === 'idle' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                <span>AI will parse your text and determine your goals</span>
              </div>
              <Textarea
                placeholder="Paste your protocol text here...

Example:
Wake up at 6am. Morning workout: 30 min cardio followed by strength training (3x10 squats, 3x10 bench press).

Breakfast at 8am: oatmeal with berries (400 cal).
Lunch at 12pm: chicken salad (600 cal).
Dinner at 6pm: salmon with vegetables (700 cal).

Supplements: Vitamin D 2000IU morning, Omega-3 1g with meals.

Sleep by 10pm."
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                className="min-h-[200px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Include details about schedule, diet, supplements, and training
              </p>
            </div>
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={!pasteText.trim()}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Parse with AI
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Standalone button that opens the import dialog */
export function ImportProtocolButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4 mr-2" />
        Import protocol
      </Button>
      <ImportProtocolDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
