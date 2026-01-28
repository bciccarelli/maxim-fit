import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { EditableProtocolName } from '@/components/protocol/EditableProtocolName';
import { ProtocolDetailClient } from './ProtocolDetailClient';
import { getUserTier } from '@/lib/stripe/subscription';

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

  // Get user's subscription tier
  const tier = user ? await getUserTier(user.id) : 'free';

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
            <EditableProtocolName protocolId={protocol.id} name={protocol.name} />
            <p className="text-sm text-muted-foreground">
              Created {new Date(protocol.created_at!).toLocaleString()}
              {protocol.version != null && protocol.version > 1 && ` | v${protocol.version}`}
            </p>
          </div>
        </div>
      </div>

      <ProtocolDetailClient protocol={protocol} tier={tier} />
    </div>
  );
}
