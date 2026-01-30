import Image from 'next/image';
import Link from 'next/link';
import { AuthButton } from '@/components/auth/AuthButton';
import { PricingSection } from '@/components/subscription/PricingSection';
import { createClient } from '@/lib/supabase/server';
import { getUserTier } from '@/lib/stripe/subscription';
import { TRIAL_PERIOD_DAYS } from '@/lib/stripe/config';

export const metadata = {
  title: 'Pricing — Protocol',
  description: 'Simple, transparent pricing. Start free, upgrade when you need AI-powered features.',
};

export default async function PricingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let currentTier: 'free' | 'pro' = 'free';
  if (user) {
    currentTier = await getUserTier(user.id);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Protocol" width={32} height={32} />
          </Link>
          <AuthButton />
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Simple, transparent pricing
          </h1>
          <p className="text-sm text-muted-foreground">
            Start free. Upgrade when you need AI-powered features.
          </p>
        </div>

        <PricingSection currentTier={currentTier} />

        <div className="mt-12 border-l-2 border-l-info pl-4 py-2 max-w-xl mx-auto">
          <p className="text-sm">
            Pro includes a <span className="font-semibold">{TRIAL_PERIOD_DAYS}-day free trial</span>.
            No charge until the trial ends. Cancel anytime.
          </p>
        </div>

        {/* FAQ or additional info */}
        <div className="mt-16 max-w-xl mx-auto">
          <h2 className="text-lg font-semibold tracking-tight mb-6 text-center">
            Questions?
          </h2>
          <div className="space-y-6">
            <div className="border-l-2 border-l-muted pl-4">
              <h3 className="text-sm font-medium">What happens after my trial ends?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                You&apos;ll be charged based on your selected plan ($9/month or $79/year). Cancel anytime from your billing settings to avoid being charged.
              </p>
            </div>
            <div className="border-l-2 border-l-muted pl-4">
              <h3 className="text-sm font-medium">Can I still use the app if I cancel?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Yes. You&apos;ll revert to the Free tier and can still generate and edit protocols. AI features like Verify, Modify, and Ask will be unavailable.
              </p>
            </div>
            <div className="border-l-2 border-l-muted pl-4">
              <h3 className="text-sm font-medium">What payment methods do you accept?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                We accept all major credit cards through Stripe.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
