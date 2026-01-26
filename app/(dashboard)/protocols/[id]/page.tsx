import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { ProtocolDisplay } from '@/components/protocol/ProtocolDisplay';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { OptimizeSection } from './OptimizeSection';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProtocolPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: protocol, error } = await supabase
    .from('protocols')
    .select('*')
    .eq('id', id)
    .eq('user_id', user?.id)
    .single();

  if (error || !protocol) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Protocol Details</h1>
            <p className="text-sm text-muted-foreground">
              Created {new Date(protocol.created_at).toLocaleString()}
              {protocol.iteration > 0 && ` | Iteration ${protocol.iteration}`}
            </p>
          </div>
        </div>
        <OptimizeSection
          protocolId={protocol.id}
          currentProtocol={protocol.protocol_data}
          critiques={protocol.critiques}
          iteration={protocol.iteration}
        />
      </div>

      <ProtocolDisplay
        protocol={protocol.protocol_data}
        scores={{
          requirement_scores: protocol.requirement_scores,
          goal_scores: protocol.goal_scores,
          critiques: protocol.critiques,
          requirements_met: protocol.requirements_met,
          weighted_goal_score: protocol.weighted_goal_score,
          viability_score: protocol.viability_score,
        }}
      />
    </div>
  );
}
