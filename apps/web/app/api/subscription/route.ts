import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSubscriptionDetails } from '@/lib/stripe/subscription';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if subscription check is bypassed
    const bypassed = process.env.BYPASS_SUBSCRIPTION_CHECK === 'true';
    if (bypassed) {
      return NextResponse.json({
        tier: 'pro',
        status: 'active',
        isTrialing: false,
        trialEndsAt: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        bypassed: true,
      });
    }

    const details = await getSubscriptionDetails(user.id);

    return NextResponse.json(details);
  } catch (error) {
    console.error('Subscription status error:', error);
    return NextResponse.json(
      { error: 'Failed to get subscription status' },
      { status: 500 }
    );
  }
}
