import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProgressPageClient } from '@/components/progress/ProgressPageClient';
import { normalizeProtocol } from '@/lib/schemas/protocol';

export default async function ProgressPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch all current protocols with their data
  const { data: protocols } = await supabase
    .from('protocols')
    .select('id, name, version_chain_id, protocol_data')
    .eq('user_id', user.id)
    .eq('is_current', true)
    .order('created_at', { ascending: false });

  const normalizedProtocols = (protocols ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    version_chain_id: p.version_chain_id,
    protocol_data: normalizeProtocol(p.protocol_data),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Progress</h1>
        <p className="text-sm text-muted-foreground">Track your daily protocol compliance</p>
      </div>
      <ProgressPageClient protocols={normalizedProtocols} />
    </div>
  );
}
