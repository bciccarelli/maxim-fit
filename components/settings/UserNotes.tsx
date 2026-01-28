'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Loader2 } from 'lucide-react';

interface Note {
  id: string;
  note: string;
  source: string | null;
  created_at: string | null;
}

interface UserNotesProps {
  notes: Note[];
  onAdd: (note: string) => Promise<void>;
  onDelete: (noteId: string) => Promise<void>;
}

export function UserNotes({ notes, onAdd, onDelete }: UserNotesProps) {
  const [newNote, setNewNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newNote.trim()) return;
    setAdding(true);
    try {
      await onAdd(newNote.trim());
      setNewNote('');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    setDeletingId(noteId);
    try {
      await onDelete(noteId);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getSourceLabel = (source: string | null) => {
    switch (source) {
      case 'modify':
        return 'From modification';
      case 'critique_apply':
        return 'From critique';
      case 'manual':
      default:
        return 'Manual';
    }
  };

  return (
    <div className="space-y-4">
      {/* Add note input */}
      <div className="flex gap-2">
        <Input
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a preference note..."
          className="text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !adding) {
              handleAdd();
            }
          }}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={adding || !newNote.trim()}
        >
          {adding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Notes list */}
      {notes.length > 0 ? (
        <div className="divide-y divide-border">
          {notes.map((note) => (
            <div key={note.id} className="flex items-start gap-3 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm">{note.note}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {getSourceLabel(note.source)}
                  </span>
                  {note.created_at && (
                    <>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(note.created_at)}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(note.id)}
                disabled={deletingId === note.id}
              >
                {deletingId === note.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No preference notes yet. Notes will be added automatically when you modify protocols,
          or you can add them manually above.
        </p>
      )}
    </div>
  );
}
