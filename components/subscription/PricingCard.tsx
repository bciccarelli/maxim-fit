'use client';

import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PricingCardProps {
  name: string;
  price: number;
  period: string;
  features: string[];
  highlighted?: boolean;
  currentPlan?: boolean;
  onSelect: () => void;
  loading?: boolean;
  trialDays?: number;
  annualEquivalent?: number;
}

export function PricingCard({
  name,
  price,
  period,
  features,
  highlighted,
  currentPlan,
  onSelect,
  loading,
  trialDays,
  annualEquivalent,
}: PricingCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-5',
        highlighted && 'border-l-2 border-l-primary'
      )}
    >
      <div className="mb-4">
        <h3 className="text-base font-semibold tracking-tight">{name}</h3>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="font-mono text-2xl font-semibold">
            ${price}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            /{period}
          </span>
        </div>
        {annualEquivalent && (
          <p className="text-xs text-muted-foreground mt-1">
            ${annualEquivalent.toFixed(2)}/month, billed annually
          </p>
        )}
        {trialDays && price > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {trialDays}-day free trial included
          </p>
        )}
      </div>

      <ul className="space-y-2 mb-6">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm">
            <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        className="w-full"
        variant={highlighted ? 'default' : 'outline'}
        onClick={onSelect}
        disabled={currentPlan || loading}
      >
        {currentPlan ? 'Current plan' : loading ? 'Loading...' : 'Get started'}
      </Button>
    </div>
  );
}
