import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ChatPageClient } from '@/components/chat/ChatPageClient';

export default async function ChatPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch protocol list for selector
  const { data: protocols } = await supabase
    .from('protocols')
    .select('id, name, version_chain_id')
    .eq('user_id', user.id)
    .eq('is_current', true)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Chat</h1>
        <p className="text-sm text-muted-foreground">Ask questions about your protocol</p>
      </div>
      <ChatPageClient protocols={protocols ?? []} />
    </div>
  );
}
