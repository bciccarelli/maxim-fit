'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles, Upload, ChevronDown } from 'lucide-react';
import { GenerateProtocolDialog } from './GenerateProtocolDialog';
import { ImportProtocolDialog } from './ImportProtocolButton';

export function NewProtocolButton() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  return (
    <>
      <div className="relative inline-flex" ref={ref}>
        <Button onClick={() => setDropdownOpen(!dropdownOpen)}>
          <Plus className="h-4 w-4 mr-2" />
          New protocol
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>

        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-1 w-48 rounded-md border bg-popover p-1 z-50">
            <button
              className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors duration-150"
              onClick={() => {
                setDropdownOpen(false);
                setGenerateOpen(true);
              }}
            >
              <Sparkles className="h-4 w-4" />
              Generate new
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors duration-150"
              onClick={() => {
                setDropdownOpen(false);
                setImportOpen(true);
              }}
            >
              <Upload className="h-4 w-4" />
              Import existing
            </button>
          </div>
        )}
      </div>

      <GenerateProtocolDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
      />

      <ImportProtocolDialog
        open={importOpen}
        onOpenChange={setImportOpen}
      />
    </>
  );
}
