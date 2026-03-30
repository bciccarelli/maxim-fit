'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface Conversation {
  id: string;
  firstQuestion: string;
  messageCount: number;
  createdAt: string | null;
  updatedAt: string | null;
}

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewConversation: () => void;
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNewConversation,
}: ConversationSidebarProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <Button onClick={onNewConversation} variant="outline" size="sm" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          New conversation
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="text-xs text-muted-foreground p-3">No conversations yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={cn(
                  'w-full text-left px-3 py-3 transition-colors duration-150 hover:bg-muted/50',
                  activeId === conv.id && 'bg-primary/5 border-l-2 border-l-primary'
                )}
              >
                <p className="text-sm font-medium truncate">
                  {conv.firstQuestion || 'New conversation'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {relativeTime(conv.updatedAt)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    · {conv.messageCount} {conv.messageCount === 1 ? 'message' : 'messages'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
