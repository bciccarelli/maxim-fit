import Link from 'next/link';
import Image from 'next/image';
import { buttonVariants } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <Link href="/" className="inline-block mb-8">
          <Image src="/logo.png" alt="Maxim" width={48} height={48} />
        </Link>

        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
          404 Error
        </p>

        <h1 className="text-3xl font-bold tracking-tight mb-3">
          Page not found
        </h1>

        <p className="text-sm text-muted-foreground mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className={buttonVariants()}>
            Go home
          </Link>
          <Link href="/dashboard" className={buttonVariants({ variant: 'outline' })}>
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
