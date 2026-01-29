'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface InlineEditFieldProps {
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'number' | 'time';
  mono?: boolean;
  className?: string;
  inputClassName?: string;
  editable?: boolean;
}

export function InlineEditField({
  value,
  onChange,
  type = 'text',
  mono = false,
  className = '',
  inputClassName = '',
  editable = true,
}: InlineEditFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  if (!editable) {
    return <span className={`${mono ? 'font-mono' : ''} ${className}`}>{value}</span>;
  }

  if (!editing) {
    return (
      <span
        className={`cursor-pointer rounded px-1 -mx-1 hover:bg-muted transition-colors duration-150 ${mono ? 'font-mono' : ''} ${className}`}
        onClick={() => setEditing(true)}
      >
        {value}
      </span>
    );
  }

  const handleSave = () => {
    setEditing(false);
    if (draft !== value) {
      onChange(draft);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setDraft(value);
  };

  return (
    <Input
      ref={inputRef}
      type={type}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={handleSave}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') handleCancel();
      }}
      className={`h-auto py-0.5 px-1 -mx-1 ${mono ? 'font-mono' : ''} ${inputClassName}`}
    />
  );
}
