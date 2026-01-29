'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SubscriptionBadge } from './SubscriptionBadge';
import { ManageBillingButton } from './ManageBillingButton';
import type { Tier, SubscriptionStatus as Status } from '@/lib/stripe/config';

interface SubscriptionData {
  tier: Tier;
  status: Status;
  isTrialing: boolean;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export function SubscriptionStatus() {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSubscription() {
      try {
        const res = await fetch('/api/subscription');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error('Failed to fetch subscription:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchSubscription();
  }, []);

  if (loading) {
    return null;
  }

  if (!data) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      {data.tier === 'pro' ? (
        <>
          <SubscriptionBadge tier={data.tier} status={data.status} />
          <ManageBillingButton variant="ghost" size="sm" />
        </>
      ) : (
        <Link
          href="/pricing"
          className="text-xs font-medium text-primary hover:underline"
        >
          Upgrade to Pro
        </Link>
      )}
    </div>
  );
}
