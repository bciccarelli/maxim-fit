'use client';

import { useClaimPendingProtocol } from '@/lib/hooks/useClaimPendingProtocol';

/**
 * Provider component that enables automatic claiming of anonymous protocols
 * when users authenticate. Wraps the app to listen for auth state changes.
 */
export function ClaimProtocolProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useClaimPendingProtocol();
  return <>{children}</>;
}
