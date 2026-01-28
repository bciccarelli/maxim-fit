'use client';

import { cn } from '@/lib/utils';
import type { Tier, SubscriptionStatus } from '@/lib/stripe/config';

interface SubscriptionBadgeProps {
  tier: Tier;
  status?: SubscriptionStatus;
  className?: string;
}

export function SubscriptionBadge({
  tier,
  status,
  className,
}: SubscriptionBadgeProps) {
  const isTrialing = status === 'trialing';

  if (tier === 'free') {
    return null; // Don't show badge for free tier
  }

  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded text-xs font-medium font-mono uppercase',
        'bg-primary/15 text-primary',
        className
      )}
    >
      {tier}
      {isTrialing && ' (trial)'}
    </span>
  );
}
