'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import type { Citation } from '@/lib/schemas/protocol';

interface ChatCitationsDropdownProps {
  citations: Citation[];
}

export function ChatCitationsDropdown({ citations }: ChatCitationsDropdownProps) {
  const [expanded, setExpanded] = useState(false);

  if (citations.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        <span>
          {citations.length} source{citations.length !== 1 ? 's' : ''}
        </span>
      </button>

      {expanded && (
        <div className="mt-2 space-y-1 pl-4 border-l border-border">
          {citations.map((citation) => (
            <a
              key={citation.id}
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ExternalLink className="h-3 w-3 mt-0.5 flex-shrink-0 opacity-50 group-hover:opacity-100" />
              <span className="line-clamp-1">
                <span className="font-medium">{citation.domain}</span>
                {citation.title && (
                  <span className="ml-1">- {citation.title}</span>
                )}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
