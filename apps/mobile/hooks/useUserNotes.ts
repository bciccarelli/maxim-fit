import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchApi } from '@/lib/api';

export interface Note {
  id: string;
  note: string;
  source: string | null;
  created_at: string | null;
}

interface UseUserNotesReturn {
  notes: Note[];
  isLoading: boolean;
  error: string | null;
  addNote: (note: string) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  isAdding: boolean;
  deletingId: string | null;
  refresh: () => Promise<void>;
}

export function useUserNotes(): UseUserNotesReturn {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setNotes([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchApi<{ notes: Note[] }>('/api/notes');
      setNotes(data.notes);
    } catch (err) {
      console.error('Error fetching user notes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load notes');
      setNotes([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const addNote = useCallback(async (note: string) => {
    setIsAdding(true);
    setError(null);

    try {
      const data = await fetchApi<{ note: Note }>('/api/notes', {
        method: 'POST',
        body: JSON.stringify({ note, source: 'manual' }),
      });
      setNotes((prev) => [data.note, ...prev]);
    } catch (err) {
      console.error('Error adding note:', err);
      setError(err instanceof Error ? err.message : 'Failed to add note');
      throw err;
    } finally {
      setIsAdding(false);
    }
  }, []);

  const deleteNote = useCallback(async (noteId: string) => {
    setDeletingId(noteId);
    setError(null);

    try {
      await fetchApi<{ success: boolean }>(`/api/notes?id=${noteId}`, {
        method: 'DELETE',
      });
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      console.error('Error deleting note:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete note');
      throw err;
    } finally {
      setDeletingId(null);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    notes,
    isLoading,
    error,
    addNote,
    deleteNote,
    isAdding,
    deletingId,
    refresh,
  };
}
