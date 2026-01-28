'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Check, X, Loader2 } from 'lucide-react';

interface EditableProtocolNameProps {
  protocolId: string;
  name: string | null;
  className?: string;
}

export function EditableProtocolName({ protocolId, name, className }: EditableProtocolNameProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name ?? '');
  const [saving, setSaving] = useState(false);

  const displayName = name || 'Untitled protocol';

  const handleSave = async () => {
    if (!value.trim()) return;
    setSaving(true);
    try {
      const response = await fetch('/api/protocol/name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ protocolId, name: value.trim() }),
      });

      if (response.ok) {
        setEditing(false);
        router.refresh();
      }
    } catch {
      // Silent fail
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(name ?? '');
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  if (editing) {
    return (
      <div className={`flex items-center gap-1 ${className ?? ''}`}>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="text-lg font-semibold tracking-tight h-8 max-w-xs"
          maxLength={100}
          autoFocus
        />
        <Button variant="ghost" size="icon" onClick={handleSave} disabled={saving || !value.trim()} className="h-7 w-7">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={handleCancel} disabled={saving} className="h-7 w-7">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 group ${className ?? ''}`}>
      <h2 className="text-lg font-semibold tracking-tight truncate">{displayName}</h2>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setValue(name ?? '');
          setEditing(true);
        }}
        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Edit protocol name"
      >
        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
    </div>
  );
}
