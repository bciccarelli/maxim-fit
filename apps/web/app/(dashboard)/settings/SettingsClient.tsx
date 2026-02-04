'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfigSummary } from '@/components/settings/ConfigSummary';
import { ConfigEditForm } from '@/components/settings/ConfigEditForm';
import { UserNotes } from '@/components/settings/UserNotes';
import { Pencil, Plus, MessageSquare, ExternalLink } from 'lucide-react';
import type { PersonalInfo, Goal } from '@/lib/schemas/user-config';

interface UserConfig {
  id: string;
  personal_info: PersonalInfo;
  goals: Goal[];
  requirements: string[];
}

interface Note {
  id: string;
  note: string;
  source: string | null;
  created_at: string | null;
}

interface SettingsClientProps {
  config: UserConfig | null;
  notes: Note[];
}

export function SettingsClient({ config: initialConfig, notes: initialNotes }: SettingsClientProps) {
  const router = useRouter();
  const [config, setConfig] = useState<UserConfig | null>(initialConfig);
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSaveConfig = async (newConfig: { personal_info: PersonalInfo; goals: Goal[]; requirements: string[] }) => {
    setSaving(true);
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: newConfig }),
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      const result = await response.json();
      setConfig({
        id: result.id,
        ...newConfig,
      });
      setEditing(false);
      router.refresh();
    } catch (error) {
      console.error('Error saving config:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async (note: string) => {
    const response = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note, source: 'manual' }),
    });

    if (!response.ok) {
      throw new Error('Failed to add note');
    }

    const result = await response.json();
    setNotes([result.note, ...notes]);
  };

  const handleDeleteNote = async (noteId: string) => {
    const response = await fetch(`/api/notes?id=${noteId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete note');
    }

    setNotes(notes.filter((n) => n.id !== noteId));
  };

  const defaultConfig = {
    personal_info: {
      age: 30,
      weight_lbs: 170,
      height_in: 70,
      sex: 'other' as const,
      lifestyle_considerations: [],
      fitness_level: 'intermediate' as const,
      dietary_restrictions: [],
    },
    goals: [{ name: 'General Health', weight: 1.0 }],
    requirements: [],
  };

  return (
    <div className="space-y-8">
      {/* Configuration Section */}
      <Card className="border-l-2 border-l-primary">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">Your Configuration</CardTitle>
          {!editing && config && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!config && !editing ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-4">
                No configuration set yet. Create your first configuration to personalize protocol generation.
              </p>
              <Button onClick={() => setEditing(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create configuration
              </Button>
            </div>
          ) : editing ? (
            <ConfigEditForm
              initialConfig={config ?? defaultConfig}
              onSave={handleSaveConfig}
              onCancel={() => setEditing(false)}
              saving={saving}
            />
          ) : config ? (
            <ConfigSummary
              personalInfo={config.personal_info}
              goals={config.goals}
              requirements={config.requirements}
            />
          ) : null}
        </CardContent>
      </Card>

      {/* Preferences/Notes Section */}
      <Card className="border-l-2 border-l-primary">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Your Preferences</CardTitle>
          <p className="text-sm text-muted-foreground">
            Preferences are learned from your protocol modifications and used to personalize future generations.
          </p>
        </CardHeader>
        <CardContent>
          <UserNotes
            notes={notes}
            onAdd={handleAddNote}
            onDelete={handleDeleteNote}
          />
        </CardContent>
      </Card>

      {/* Feedback Section */}
      <Card className="border-l-2 border-l-primary">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Feedback</CardTitle>
          <p className="text-sm text-muted-foreground">
            Help us improve Maxim Fit by sharing your feedback, reporting bugs, or requesting features.
          </p>
        </CardHeader>
        <CardContent>
          <a
            href="https://maximfit.featurebase.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <MessageSquare className="h-4 w-4" />
            Share feedback
            <ExternalLink className="h-3 w-3" />
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
