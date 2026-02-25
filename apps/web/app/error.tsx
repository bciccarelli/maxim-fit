'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button, buttonVariants } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <Link href="/" className="inline-block mb-8">
          <Image src="/logo.png" alt="Maxim" width={48} height={48} />
        </Link>

        <div className="flex justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>

        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
          Something went wrong
        </p>

        <h1 className="text-3xl font-bold tracking-tight mb-3">
          Unexpected error
        </h1>

        <p className="text-sm text-muted-foreground mb-8">
          We encountered an error while loading this page. Please try again.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => reset()}>Try again</Button>
          <Link href="/" className={buttonVariants({ variant: 'outline' })}>
            Go home
          </Link>
        </div>

        {error.digest && (
          <p className="mt-6 text-xs font-mono text-muted-foreground">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
