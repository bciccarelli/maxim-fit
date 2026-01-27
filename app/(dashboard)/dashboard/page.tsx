import { createClient } from '@/lib/supabase/server';
import { NewProtocolButton } from '@/components/protocol/NewProtocolButton';
import { DashboardProtocolView } from './DashboardProtocolView';

interface Props {
  searchParams: Promise<{ protocol?: string }>;
}

export default async function DashboardPage({ searchParams }: Props) {
  const { protocol: selectedId } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Fetch lightweight protocol list for dropdown (current versions only)
  const { data: protocols } = await supabase
    .from('protocols')
    .select('id, created_at, version, weighted_goal_score, viability_score')
    .eq('user_id', user?.id)
    .eq('is_current', true)
    .order('created_at', { ascending: false });

  // Determine which protocol to show
  const targetId = selectedId || protocols?.[0]?.id;

  // Fetch full protocol data for the selected protocol
  let selectedProtocol = null;
  if (targetId) {
    const { data } = await supabase
      .from('protocols')
      .select('*')
      .eq('id', targetId)
      .eq('user_id', user?.id)
      .single();
    selectedProtocol = data;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Your daily health protocol</p>
        </div>
        <NewProtocolButton />
      </div>

      {protocols && protocols.length > 0 && selectedProtocol ? (
        <DashboardProtocolView
          protocols={protocols}
          selectedProtocol={selectedProtocol}
        />
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">No protocols yet. Create your first one!</p>
          <div className="mt-4">
            <NewProtocolButton />
          </div>
        </div>
      )}
    </div>
  );
}
