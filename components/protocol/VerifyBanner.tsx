'use client';

import { Button } from '@/components/ui/button';
import { Shield, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface VerifyBannerProps {
  onVerify: () => Promise<void>;
}

export function VerifyBanner({ onVerify }: VerifyBannerProps) {
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      await onVerify();
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="border-l-2 border-l-warning pl-4 py-3 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">Protocol unverified</p>
        <p className="text-xs text-muted-foreground">
          Scores may be outdated. Verify to update with current research.
        </p>
      </div>
      <Button size="sm" onClick={handleVerify} disabled={verifying}>
        {verifying ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Verifying...
          </>
        ) : (
          <>
            <Shield className="h-4 w-4 mr-2" />
            Verify
          </>
        )}
      </Button>
    </div>
  );
}
