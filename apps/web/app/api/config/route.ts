import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { userConfigSchema } from '@/lib/schemas/user-config';

/**
 * GET /api/config - Fetch user's default config
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Fetch user's default config
    const { data: config, error } = await supabase
      .from('user_configs')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine
      console.error('Error fetching config:', error);
      return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
    }

    return NextResponse.json({ config: config ?? null });
  } catch (error) {
    console.error('Config fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch config', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/config - Create new config and set as default
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { config } = body;

    // Validate config
    const parseResult = userConfigSchema.safeParse({
      ...config,
      iterations: 1, // Required by schema but not stored
    });

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid configuration', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    // Unset any existing default config for this user
    await supabase
      .from('user_configs')
      .update({ is_default: false })
      .eq('user_id', user.id)
      .eq('is_default', true);

    // Insert new config as default
    const { data: newConfig, error: insertError } = await supabase
      .from('user_configs')
      .insert({
        user_id: user.id,
        personal_info: config.personal_info,
        goals: config.goals,
        requirements: config.requirements,
        is_default: true,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error creating config:', insertError);
      return NextResponse.json({ error: 'Failed to create config' }, { status: 500 });
    }

    return NextResponse.json({ id: newConfig.id, success: true });
  } catch (error) {
    console.error('Config create error:', error);
    return NextResponse.json(
      { error: 'Failed to create config', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
