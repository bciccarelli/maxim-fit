'use client';

import { CheckCircle, XCircle, ShieldOff } from 'lucide-react';

interface EvaluationSummaryProps {
  requirementsMet?: boolean;
  goalScore?: number;
  verified?: boolean;
}

export function EvaluationSummary({
  requirementsMet,
  goalScore,
  verified = true,
}: EvaluationSummaryProps) {
  const hasData = goalScore != null || requirementsMet != null;
  if (!hasData) return null;

  return (
    <div className={`flex items-center gap-3 ${!verified ? 'opacity-60' : ''}`}>
      {requirementsMet != null && (
        <div className="flex items-center gap-1">
          {requirementsMet ? (
            <CheckCircle className="h-4 w-4 text-success" />
          ) : (
            <XCircle className="h-4 w-4 text-destructive" />
          )}
          <span className="text-xs text-muted-foreground">Reqs</span>
        </div>
      )}
      {goalScore != null && (
        <div className="flex items-center gap-1">
          <span className="font-mono text-sm font-semibold tabular-nums">
            {goalScore.toFixed(1)}
          </span>
          <span className="text-xs text-muted-foreground">Goal</span>
        </div>
      )}
      {!verified && (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-warning/15 text-warning">
          <ShieldOff className="h-3 w-3" />
          Unverified
        </span>
      )}
    </div>
  );
}
