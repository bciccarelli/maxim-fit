'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileText, AlertCircle, CheckCircle2, ClipboardPaste, Sparkles, X } from 'lucide-react';

type ImportState = 'idle' | 'loading' | 'success' | 'error';
type ImportMode = 'file' | 'paste';

export function ImportProtocolButton() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ImportMode>('file');
  const [state, setState] = useState<ImportState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setState('loading');
    setError(null);

    try {
      const text = await file.text();
      let data;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Invalid JSON file');
      }

      // Handle both wrapped { protocol: ... } and direct protocol format
      const protocol = data.protocol || data;

      const response = await fetch('/api/protocol/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ protocol }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to import protocol');
      }

      handleSuccess(result.id);
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Failed to import protocol');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePasteSubmit = async () => {
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

      handleSuccess(result.id);
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Failed to parse protocol');
    }
  };

  const handleSuccess = (protocolId: string) => {
    setState('success');

    // Redirect to the imported protocol after a brief delay
    setTimeout(() => {
      setOpen(false);
      router.push(`/protocols/${protocolId}`);
      router.refresh();
    }, 1500);
  };

  const handleClose = () => {
    setOpen(false);
    // Reset state when dialog closes
    setState('idle');
    setError(null);
    setFileName(null);
    setPasteText('');
  };

  const resetState = () => {
    setState('idle');
    setError(null);
    setFileName(null);
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4 mr-2" />
        Import Protocol
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Dialog */}
          <div className="relative z-50 w-full max-w-lg mx-4 bg-background border rounded-lg shadow-sm p-6">
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>

            {/* Header */}
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Import Protocol</h2>
              <p className="text-sm text-muted-foreground">
                Upload a JSON file or paste text to import a protocol.
              </p>
            </div>

            {/* Content */}
            {state === 'loading' && (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  {mode === 'file' ? `Importing ${fileName}...` : 'Parsing with AI...'}
                </p>
                {mode === 'paste' && (
                  <p className="text-xs text-muted-foreground mt-2">
                    This may take a moment
                  </p>
                )}
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
                <Button variant="outline" className="w-full" onClick={resetState}>
                  Try again
                </Button>
              </div>
            )}

            {state === 'idle' && (
              <Tabs defaultValue="file" value={mode} onValueChange={(v) => setMode(v as ImportMode)} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="file" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Upload JSON
                  </TabsTrigger>
                  <TabsTrigger value="paste" className="flex items-center gap-2">
                    <ClipboardPaste className="h-4 w-4" />
                    Paste Text
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="file" className="mt-4">
                  <div
                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Click to select a JSON file
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supports .json files exported from this app
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </TabsContent>

                <TabsContent value="paste" className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Sparkles className="h-4 w-4" />
                      <span>AI will parse your text into a structured protocol</span>
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
                    onClick={handlePasteSubmit}
                    disabled={!pasteText.trim()}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Parse with AI
                  </Button>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      )}
    </>
  );
}
