'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const PENDING_PROTOCOL_KEY = 'pendingProtocolId';

/**
 * Hook that automatically claims pending anonymous protocols when a user authenticates.
 * Listens for SIGNED_IN events, checks localStorage for a pending protocol,
 * and calls the claim API to transfer ownership.
 */
export function useClaimPendingProtocol() {
  const router = useRouter();
  const claimAttempted = useRef(false);
  const supabase = createClient();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Only trigger on sign-in events, not on initial session check
      if (event !== 'SIGNED_IN' || !session?.user) return;

      // Prevent duplicate claims in the same session
      if (claimAttempted.current) return;

      const pendingProtocolId = localStorage.getItem(PENDING_PROTOCOL_KEY);
      if (!pendingProtocolId) return;

      claimAttempted.current = true;

      try {
        const response = await fetch('/api/protocol/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ protocolId: pendingProtocolId }),
        });

        const data = await response.json();

        if (response.ok) {
          // Clear the pending protocol
          localStorage.removeItem(PENDING_PROTOCOL_KEY);
          // Redirect to the claimed protocol
          router.push(`/protocols/${data.protocolId}`);
          router.refresh();
        } else if (response.status === 410) {
          // Protocol expired - clear and let user generate new one
          localStorage.removeItem(PENDING_PROTOCOL_KEY);
          console.log('Pending protocol expired');
        } else if (response.status === 403) {
          // Tier limit reached - clear but don't redirect
          localStorage.removeItem(PENDING_PROTOCOL_KEY);
          console.log('Protocol limit reached, cannot claim');
        } else if (response.status === 400) {
          // Already claimed - clear localStorage
          localStorage.removeItem(PENDING_PROTOCOL_KEY);
          console.log('Protocol already claimed');
        }
        // For other errors (404, 500), keep in localStorage for retry
      } catch (error) {
        console.error('Error claiming protocol:', error);
        claimAttempted.current = false; // Allow retry on error
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth, router]);
}

/**
 * Store a protocol ID for claiming after authentication.
 */
export function setPendingProtocol(protocolId: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PENDING_PROTOCOL_KEY, protocolId);
  }
}

/**
 * Get the pending protocol ID, if any.
 */
export function getPendingProtocol(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(PENDING_PROTOCOL_KEY);
  }
  return null;
}

/**
 * Clear the pending protocol ID.
 */
export function clearPendingProtocol() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(PENDING_PROTOCOL_KEY);
  }
}
