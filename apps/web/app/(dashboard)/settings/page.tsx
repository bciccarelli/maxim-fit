import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SettingsClient } from './SettingsClient';
import type { PersonalInfo, Goal } from '@/lib/schemas/user-config';

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/sign-in');
  }

  // Fetch user's default config
  const { data: configData } = await supabase
    .from('user_configs')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_default', true)
    .single();

  // Fetch user's notes
  const { data: notesData } = await supabase
    .from('user_notes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const config = configData ? {
    id: configData.id,
    personal_info: configData.personal_info as PersonalInfo,
    goals: configData.goals as Goal[],
    requirements: configData.requirements,
  } : null;

  const notes = (notesData ?? []).map((n) => ({
    id: n.id,
    note: n.note,
    source: n.source,
    created_at: n.created_at,
  }));

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Settings</h1>
      <SettingsClient config={config} notes={notes} />
    </div>
  );
}
