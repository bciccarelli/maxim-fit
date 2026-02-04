'use client';

import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import type { Citation } from '@/lib/schemas/protocol';

interface CitationsSectionProps {
  citations: Citation[];
}

const OPERATION_LABELS: Record<string, string> = {
  verify: 'Verification',
  modify: 'Modification',
  ask: 'Q&A',
  generate_meals: 'Meal Planning',
};

export function CitationsSection({ citations }: CitationsSectionProps) {
  const [expanded, setExpanded] = useState(false);

  if (!citations || citations.length === 0) return null;

  // Group by operation type
  const byOperation = citations.reduce((acc, c) => {
    (acc[c.operation] = acc[c.operation] || []).push(c);
    return acc;
  }, {} as Record<string, Citation[]>);

  return (
    <div className="border rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {citations.length} source{citations.length !== 1 ? 's' : ''}
          </span>
          <span className="px-2 py-0.5 rounded text-xs font-medium font-mono bg-primary/10 text-primary">
            Evidence-backed
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {Object.entries(byOperation).map(([op, opCitations]) => (
            <div key={op} className="space-y-2">
              <h4 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                {OPERATION_LABELS[op] || op}
              </h4>
              <div className="divide-y divide-border">
                {opCitations.map((citation) => (
                  <a
                    key={citation.id}
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 py-2 hover:bg-muted/30 rounded transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                          {citation.title}
                        </span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">
                        {citation.domain}
                      </span>
                      {citation.relevantText && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">
                          &ldquo;{citation.relevantText}&rdquo;
                        </p>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
