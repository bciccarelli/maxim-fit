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

export const metadata: Metadata = {
  title: 'Maxim — Evidence-Based Health Protocols',
  description: 'Stop guessing. Get a precise, evidence-based daily protocol — schedule, diet, supplements, training — tailored to your goals.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <ClaimProtocolProvider>{children}</ClaimProtocolProvider>
        <Analytics />
      </body>
    </html>
  );
}
