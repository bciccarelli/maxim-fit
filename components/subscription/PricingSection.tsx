'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PricingCard } from './PricingCard';
import { PRO_PRICES, TRIAL_PERIOD_DAYS } from '@/lib/stripe/config';
import type { Tier, BillingInterval } from '@/lib/stripe/config';
import { cn } from '@/lib/utils';

interface PricingSectionProps {
  currentTier?: Tier;
}

const FREE_FEATURES = [
  'Generate health protocols',
  'Edit protocols directly',
  '1 saved protocol',
  'Last 3 versions',
];

const PRO_FEATURES = [
  'Everything in Free',
  'AI Verification with Google Search',
  'AI-powered modifications',
  'Unlimited Q&A',
  'Import existing protocols',
  'Unlimited saved protocols',
  'Full version history',
];

export function PricingSection({ currentTier = 'free' }: PricingSectionProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('month');

  const currentPrice = PRO_PRICES[billingInterval];

  const handleProSelect = async () => {
    if (currentTier === 'pro') return;

    setLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval: billingInterval }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error === 'Authentication required') {
        router.push('/login?redirect=/pricing');
      } else {
        console.error('Checkout error:', data.error);
        setLoading(false);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setBillingInterval('month')}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-md transition-colors',
            billingInterval === 'month'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          )}
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingInterval('year')}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-md transition-colors relative',
            billingInterval === 'year'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          )}
        >
          Annual
          <span className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px] font-semibold bg-success text-success-foreground rounded">
            27% off
          </span>
        </button>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
        <PricingCard
          name="Free"
          price={0}
          period="month"
          features={FREE_FEATURES}
          currentPlan={currentTier === 'free'}
          onSelect={() => {}}
        />
        <PricingCard
          name="Pro"
          price={currentPrice.amount}
          period={currentPrice.interval}
          features={PRO_FEATURES}
          highlighted
          currentPlan={currentTier === 'pro'}
          onSelect={handleProSelect}
          loading={loading}
          trialDays={TRIAL_PERIOD_DAYS}
          annualEquivalent={billingInterval === 'year' ? Math.round(currentPrice.amount / 12 * 100) / 100 : undefined}
        />
      </div>
    </div>
  );
}
