'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Zap, Check } from 'lucide-react';
import { PRO_PRICES, TRIAL_PERIOD_DAYS, type BillingInterval } from '@/lib/stripe/config';
import { cn } from '@/lib/utils';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
}

const PRO_FEATURES = [
  'AI Verification with Google Search',
  'AI-powered protocol modifications',
  'Unlimited Q&A about your protocol',
  'Import and parse existing protocols',
  'Unlimited saved protocols',
  'Full version history',
];

export function UpgradeModal({
  open,
  onOpenChange,
  feature,
}: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('month');

  const currentPrice = PRO_PRICES[billingInterval];

  const handleUpgrade = async () => {
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
      } else {
        console.error('No checkout URL returned');
        setLoading(false);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Upgrade to Pro
          </DialogTitle>
          <DialogDescription>
            {feature} requires a Pro subscription.
          </DialogDescription>
        </DialogHeader>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-2 my-2">
          <button
            onClick={() => setBillingInterval('month')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
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
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors relative',
              billingInterval === 'year'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            Annual
            <span className="absolute -top-1.5 -right-1.5 px-1 py-0.5 text-[9px] font-semibold bg-success text-success-foreground rounded">
              27% off
            </span>
          </button>
        </div>

        <div className="border-l-2 border-l-primary pl-4 py-2 my-4">
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-2xl font-semibold">
              ${currentPrice.amount}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              /{currentPrice.interval}
            </span>
          </div>
          {billingInterval === 'year' && (
            <p className="text-xs text-muted-foreground mt-1">
              ${(currentPrice.amount / 12).toFixed(2)}/month, billed annually
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Start with a {TRIAL_PERIOD_DAYS}-day free trial
          </p>
        </div>

        <ul className="space-y-2 mb-6">
          {PRO_FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <div className="space-y-3">
          <Button
            className="w-full"
            onClick={handleUpgrade}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Start free trial'}
          </Button>
          <Button
            className="w-full"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Maybe later
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2">
          Cancel anytime. No charge until trial ends.
        </p>
      </DialogContent>
    </Dialog>
  );
}
