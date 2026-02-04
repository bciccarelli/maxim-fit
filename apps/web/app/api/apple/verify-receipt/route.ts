import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Apple Receipt Verification Endpoint
 *
 * Validates iOS in-app purchase receipts with Apple's servers
 * and updates the user's subscription status in the database.
 */

// Apple verification URLs
const APPLE_PRODUCTION_URL = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';

// Apple status codes
const STATUS_OK = 0;
const STATUS_SANDBOX_RECEIPT_ON_PRODUCTION = 21007;
const STATUS_PRODUCTION_RECEIPT_ON_SANDBOX = 21008;

interface AppleReceiptResponse {
  status: number;
  environment?: 'Sandbox' | 'Production';
  receipt?: {
    bundle_id: string;
    application_version: string;
    in_app?: AppleInAppPurchase[];
  };
  latest_receipt_info?: AppleInAppPurchase[];
  pending_renewal_info?: ApplePendingRenewal[];
}

interface AppleInAppPurchase {
  product_id: string;
  transaction_id: string;
  original_transaction_id: string;
  purchase_date_ms: string;
  expires_date_ms?: string;
  is_trial_period?: string;
  is_in_intro_offer_period?: string;
  cancellation_date_ms?: string;
}

interface ApplePendingRenewal {
  product_id: string;
  auto_renew_status: string;
  original_transaction_id: string;
  expiration_intent?: string;
}

interface VerifyReceiptRequest {
  receiptData: string;
  userId: string;
}

/**
 * Verify receipt with Apple's servers.
 * Automatically handles sandbox/production routing.
 */
async function verifyWithApple(
  receiptData: string,
  useSandbox = false
): Promise<AppleReceiptResponse> {
  const url = useSandbox ? APPLE_SANDBOX_URL : APPLE_PRODUCTION_URL;
  const sharedSecret = process.env.APPLE_SHARED_SECRET;

  if (!sharedSecret) {
    throw new Error('APPLE_SHARED_SECRET environment variable is not set');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      'receipt-data': receiptData,
      password: sharedSecret,
      'exclude-old-transactions': true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Apple verification failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Get the most recent subscription transaction from the receipt.
 */
function getLatestTransaction(
  response: AppleReceiptResponse
): AppleInAppPurchase | null {
  const transactions = response.latest_receipt_info ?? response.receipt?.in_app ?? [];

  if (transactions.length === 0) {
    return null;
  }

  // Sort by expires_date_ms descending to get the most recent
  const sorted = [...transactions].sort((a, b) => {
    const aExpires = parseInt(a.expires_date_ms ?? '0', 10);
    const bExpires = parseInt(b.expires_date_ms ?? '0', 10);
    return bExpires - aExpires;
  });

  return sorted[0];
}

/**
 * Determine subscription status from Apple receipt data.
 */
function determineSubscriptionStatus(
  transaction: AppleInAppPurchase,
  pendingRenewal?: ApplePendingRenewal
): 'active' | 'trialing' | 'canceled' | 'expired' {
  const now = Date.now();
  const expiresAt = parseInt(transaction.expires_date_ms ?? '0', 10);
  const isCanceled = !!transaction.cancellation_date_ms;
  const isTrialing = transaction.is_trial_period === 'true';
  const willRenew = pendingRenewal?.auto_renew_status === '1';

  if (isCanceled) {
    return 'canceled';
  }

  if (expiresAt < now) {
    return 'expired';
  }

  if (isTrialing) {
    return 'trialing';
  }

  // Active but won't renew = will become canceled at period end
  if (!willRenew) {
    return 'active'; // Still active until expires, but cancel_at_period_end will be true
  }

  return 'active';
}

export async function POST(request: NextRequest) {
  try {
    const body: VerifyReceiptRequest = await request.json();
    const { receiptData, userId } = body;

    if (!receiptData || !userId) {
      return NextResponse.json(
        { error: 'Missing receiptData or userId' },
        { status: 400 }
      );
    }

    // First try production, then sandbox if needed
    let appleResponse = await verifyWithApple(receiptData, false);

    // If we get sandbox receipt on production error, retry with sandbox
    if (appleResponse.status === STATUS_SANDBOX_RECEIPT_ON_PRODUCTION) {
      console.log('[Apple] Sandbox receipt detected, retrying with sandbox URL');
      appleResponse = await verifyWithApple(receiptData, true);
    }

    // Check for valid response
    if (appleResponse.status !== STATUS_OK) {
      console.error('[Apple] Verification failed with status:', appleResponse.status);
      return NextResponse.json(
        { error: 'Receipt verification failed', appleStatus: appleResponse.status },
        { status: 400 }
      );
    }

    // Get the latest transaction
    const transaction = getLatestTransaction(appleResponse);

    if (!transaction) {
      return NextResponse.json(
        { error: 'No subscription found in receipt' },
        { status: 400 }
      );
    }

    // Find pending renewal info for this transaction
    const pendingRenewal = appleResponse.pending_renewal_info?.find(
      (p) => p.original_transaction_id === transaction.original_transaction_id
    );

    // Determine subscription status
    const status = determineSubscriptionStatus(transaction, pendingRenewal);
    const expiresAt = transaction.expires_date_ms
      ? new Date(parseInt(transaction.expires_date_ms, 10))
      : null;
    const isTrialing = transaction.is_trial_period === 'true';
    const cancelAtPeriodEnd = pendingRenewal?.auto_renew_status !== '1';

    // Update subscription in database
    const supabase = await createClient();

    const subscriptionData = {
      user_id: userId,
      tier: 'pro' as const,
      status: status === 'expired' ? 'canceled' : status,
      apple_product_id: transaction.product_id,
      apple_original_transaction_id: transaction.original_transaction_id,
      current_period_end: expiresAt?.toISOString() ?? null,
      cancel_at_period_end: cancelAtPeriodEnd,
      trial_end: isTrialing ? expiresAt?.toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    // Upsert subscription (update if exists, insert if new)
    const { data: subscription, error: dbError } = await supabase
      .from('subscriptions')
      .upsert(subscriptionData, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (dbError) {
      console.error('[Apple] Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      );
    }

    console.log('[Apple] Subscription updated:', {
      userId,
      productId: transaction.product_id,
      status,
      expiresAt,
      environment: appleResponse.environment,
    });

    return NextResponse.json({
      success: true,
      subscription: {
        tier: 'pro',
        status: subscription.status,
        expiresAt: expiresAt?.toISOString(),
        isTrialing,
        cancelAtPeriodEnd,
        environment: appleResponse.environment,
      },
    });
  } catch (error) {
    console.error('[Apple] Verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
