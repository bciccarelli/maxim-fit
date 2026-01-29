import { createClient } from '@/lib/supabase/server';
import { NewProtocolButton } from '@/components/protocol/NewProtocolButton';
import { DashboardProtocolView } from './DashboardProtocolView';
import { getUserTier } from '@/lib/stripe/subscription';
import { normalizeProtocol } from '@/lib/schemas/protocol';

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
    .select('id, name, created_at, version, weighted_goal_score, viability_score')
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

    // Normalize protocol_data to handle legacy single-schedule format
    if (data) {
      selectedProtocol = {
        ...data,
        protocol_data: normalizeProtocol(data.protocol_data),
      };
    }
  }

  // Get user's subscription tier
  const tier = user ? await getUserTier(user.id) : 'free';

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
          tier={tier}
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
