import { AuthButton } from '@/components/auth/AuthButton';
import { SubscriptionStatus } from '@/components/subscription/SubscriptionStatus';
import Image from 'next/image';
import Link from 'next/link';
import { Settings } from 'lucide-react';

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard">
              <Image src="/wordmark.png" alt="oo.coach" width={100} height={25} />
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <SubscriptionStatus />
            <AuthButton />
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
