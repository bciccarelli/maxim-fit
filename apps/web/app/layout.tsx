import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { ClaimProtocolProvider } from '@/components/providers/ClaimProtocolProvider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://maxim.fit';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Maxim — Evidence-Based Health Protocols',
    template: '%s | Maxim',
  },
  description:
    'Stop guessing. Get a precise, evidence-based daily protocol — schedule, diet, supplements, training — tailored to your goals.',
  keywords: [
    'health protocol',
    'personalized health',
    'AI health coach',
    'evidence-based health',
    'daily health optimization',
    'fitness protocol',
    'supplement protocol',
    'diet plan',
    'workout schedule',
  ],
  authors: [{ name: 'Maxim' }],
  creator: 'Maxim',
  publisher: 'Maxim',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: BASE_URL,
    siteName: 'Maxim',
    title: 'Maxim — Evidence-Based Health Protocols',
    description:
      'Stop guessing. Get a precise, evidence-based daily protocol — schedule, diet, supplements, training — tailored to your goals.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Maxim - Your daily protocol, precisely engineered',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Maxim — Evidence-Based Health Protocols',
    description:
      'Stop guessing. Get a precise, evidence-based daily protocol — schedule, diet, supplements, training — tailored to your goals.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#2d5a3d" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Maxim',
              url: BASE_URL,
              logo: `${BASE_URL}/logo.png`,
              description:
                'Evidence-based health protocols. Schedule, diet, supplements, training — tailored to your goals.',
              sameAs: [],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Maxim',
              url: BASE_URL,
              description:
                'Get a precise, evidence-based daily health protocol tailored to your goals.',
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'Maxim',
              applicationCategory: 'HealthApplication',
              operatingSystem: 'Web, iOS',
              offers: [
                {
                  '@type': 'Offer',
                  name: 'Free',
                  price: '0',
                  priceCurrency: 'USD',
                },
                {
                  '@type': 'Offer',
                  name: 'Pro Monthly',
                  price: '9',
                  priceCurrency: 'USD',
                  billingDuration: 'P1M',
                },
                {
                  '@type': 'Offer',
                  name: 'Pro Annual',
                  price: '79',
                  priceCurrency: 'USD',
                  billingDuration: 'P1Y',
                },
              ],
              description:
                'AI-powered personalized health protocols. Generate evidence-based daily plans for schedule, diet, supplements, and training.',
              featureList: [
                'AI protocol generation',
                'Evidence-based verification',
                'AI-powered modifications',
                'Personalized diet plans',
                'Custom workout schedules',
                'Supplement recommendations',
              ],
            }),
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <ClaimProtocolProvider>{children}</ClaimProtocolProvider>
        <Analytics />
      </body>
    </html>
  );
}
