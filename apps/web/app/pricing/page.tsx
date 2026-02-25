import Image from 'next/image';
import Link from 'next/link';
import { Metadata } from 'next';
import { AuthButton } from '@/components/auth/AuthButton';
import { PricingSection } from '@/components/subscription/PricingSection';
import { createClient } from '@/lib/supabase/server';
import { getUserTier } from '@/lib/stripe/subscription';
import { TRIAL_PERIOD_DAYS } from '@/lib/stripe/config';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://maxim.fit';

const faqItems = [
  {
    question: 'What happens after my trial ends?',
    answer:
      "You'll be charged based on your selected plan ($9/month or $79/year). Cancel anytime from your billing settings to avoid being charged.",
  },
  {
    question: 'Can I still use the app if I cancel?',
    answer:
      "Yes. You'll revert to the Free tier and can still generate and edit protocols. AI features like Verify, Modify, and Ask will be unavailable.",
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards through Stripe.',
  },
];

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Simple, transparent pricing for Maxim. Start free, upgrade when you need AI-powered health protocol features. Pro includes verification, modification, and unlimited Q&A.',
  openGraph: {
    title: 'Pricing | Maxim',
    description:
      'Simple, transparent pricing. Start free, upgrade when you need AI-powered features.',
    url: `${BASE_URL}/pricing`,
    type: 'website',
  },
  twitter: {
    title: 'Pricing | Maxim',
    description:
      'Simple, transparent pricing. Start free, upgrade when you need AI-powered features.',
  },
};

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let currentTier: 'free' | 'pro' = 'free';
  if (user) {
    currentTier = await getUserTier(user.id);
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema),
        }}
      />

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
            Pro includes a{' '}
            <span className="font-semibold">{TRIAL_PERIOD_DAYS}-day free trial</span>.
            No charge until the trial ends. Cancel anytime.
          </p>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-xl mx-auto">
          <h2 className="text-lg font-semibold tracking-tight mb-6 text-center">
            Questions?
          </h2>
          <div className="space-y-6">
            {faqItems.map((item, index) => (
              <div key={index} className="border-l-2 border-l-muted pl-4">
                <h3 className="text-sm font-medium">{item.question}</h3>
                <p className="text-sm text-muted-foreground mt-1">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
