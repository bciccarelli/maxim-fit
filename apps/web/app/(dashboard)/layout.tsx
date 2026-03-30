import { AuthButton } from '@/components/auth/AuthButton';
import { SubscriptionStatus } from '@/components/subscription/SubscriptionStatus';
import { DashboardNav } from '@/components/navigation/DashboardNav';
import Image from 'next/image';
import Link from 'next/link';

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b shrink-0">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard/protocols">
              <Image src="/logo.png" alt="Protocol" width={32} height={32} />
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <SubscriptionStatus />
            <AuthButton />
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <DashboardNav />
        <div className="flex-1 min-w-0 pb-16 md:pb-0">
          {children}
        </div>
      </div>
    </div>
  );
}
