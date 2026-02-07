import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Bookmark, Plus, Trash2 } from 'lucide-react-native';
import { useUserNotes, type Note } from '@/hooks/useUserNotes';

function getSourceLabel(source: string | null): string {
  switch (source) {
    case 'modify':
      return 'From modification';
    case 'critique_apply':
      return 'From critique';
    case 'manual':
    default:
      return 'Manual';
  }
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function PreferencesCard() {
  const { notes, isLoading, addNote, deleteNote, isAdding, deletingId } = useUserNotes();
  const [newNote, setNewNote] = useState('');

  const handleAdd = async () => {
    const trimmed = newNote.trim();
    if (!trimmed) return;

    try {
      await addNote(trimmed);
      setNewNote('');
    } catch {
      Alert.alert('Error', 'Failed to add preference. Please try again.');
    }
  };

  const handleDelete = async (noteId: string) => {
    try {
      await deleteNote(noteId);
    } catch {
      Alert.alert('Error', 'Failed to delete preference. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Bookmark size={20} color="#2d5a2d" />
          <Text style={styles.cardTitle}>Your Preferences</Text>
        </View>
        <ActivityIndicator size="small" color="#2d5a2d" />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Bookmark size={20} color="#2d5a2d" />
        <Text style={styles.cardTitle}>Your Preferences</Text>
      </View>

      <Text style={styles.helperText}>
        Preferences are learned from your protocol modifications and used to personalize future generations.
      </Text>

      {/* Add note input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={newNote}
          onChangeText={setNewNote}
          placeholder="Add a preference..."
          placeholderTextColor="#999"
          returnKeyType="done"
          onSubmitEditing={handleAdd}
          editable={!isAdding}
        />
        <Pressable
          style={[
            styles.addButton,
            (!newNote.trim() || isAdding) && styles.addButtonDisabled,
          ]}
          onPress={handleAdd}
          disabled={!newNote.trim() || isAdding}
        >
          {isAdding ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Plus size={18} color={newNote.trim() ? '#fff' : '#999'} />
          )}
        </Pressable>
      </View>

      {/* Notes list */}
      {notes.length > 0 ? (
        <View style={styles.notesList}>
          {notes.map((note, index) => (
            <View
              key={note.id}
              style={[styles.noteItem, index > 0 && styles.noteItemBorder]}
            >
              <View style={styles.noteContent}>
                <Text style={styles.noteText}>{note.note}</Text>
                <View style={styles.noteMeta}>
                  <Text style={styles.noteSource}>{getSourceLabel(note.source)}</Text>
                  {note.created_at && (
                    <>
                      <Text style={styles.noteDot}>•</Text>
                      <Text style={styles.noteDate}>{formatDate(note.created_at)}</Text>
                    </>
                  )}
                </View>
              </View>
              <Pressable
                style={styles.deleteButton}
                onPress={() => handleDelete(note.id)}
                disabled={deletingId === note.id}
              >
                {deletingId === note.id ? (
                  <ActivityIndicator size="small" color="#c62828" />
                ) : (
                  <Trash2 size={16} color="#999" />
                )}
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyText}>
          No preference notes yet. Notes will be added automatically when you modify protocols, or you can add them manually above.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#2d5a2d',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a2e1a',
    marginLeft: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  helperText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a2e1a',
  },
  addButton: {
    backgroundColor: '#2d5a2d',
    borderRadius: 8,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  notesList: {
    marginTop: 4,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  noteItemBorder: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  noteContent: {
    flex: 1,
    marginRight: 12,
  },
  noteText: {
    fontSize: 14,
    color: '#1a2e1a',
    lineHeight: 20,
  },
  noteMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  noteSource: {
    fontSize: 11,
    color: '#666',
  },
  noteDot: {
    fontSize: 11,
    color: '#666',
    marginHorizontal: 6,
  },
  noteDate: {
    fontSize: 11,
    color: '#666',
  },
  deleteButton: {
    padding: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 16,
    lineHeight: 18,
  },
});
