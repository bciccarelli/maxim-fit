import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let query = supabase
      .from('protocol_schedules')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: true });

    // Optional date range filter — include schedules that overlap with [from, to]
    if (from) {
      // end_date is null (indefinite) OR end_date >= from
      query = query.or(`end_date.gte.${from},end_date.is.null`);
    }
    if (to) {
      query = query.lte('start_date', to);
    }

    const { data: schedules, error } = await query;

    if (error) {
      console.error('Error fetching schedules:', error);
      return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 });
    }

    // Enrich with protocol names — fetch current version for each unique chain
    const chainIds = [...new Set(schedules.map(s => s.version_chain_id))];
    let protocolMap: Record<string, { name: string | null; weighted_goal_score: number | null }> = {};

    if (chainIds.length > 0) {
      const { data: protocols } = await supabase
        .from('protocols')
        .select('version_chain_id, name, weighted_goal_score')
        .in('version_chain_id', chainIds)
        .eq('is_current', true);

      if (protocols) {
        for (const p of protocols) {
          if (p.version_chain_id) {
            protocolMap[p.version_chain_id] = {
              name: p.name,
              weighted_goal_score: p.weighted_goal_score,
            };
          }
        }
      }
    }

    const enriched = schedules.map(s => ({
      ...s,
      protocol_name: protocolMap[s.version_chain_id]?.name ?? null,
      weighted_goal_score: protocolMap[s.version_chain_id]?.weighted_goal_score ?? null,
    }));

    return NextResponse.json({ schedules: enriched });
  } catch (error) {
    console.error('Schedule fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedules', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id, versionChainId, startDate, endDate, label } = await request.json();

    if (!versionChainId || typeof versionChainId !== 'string') {
      return NextResponse.json({ error: 'versionChainId is required' }, { status: 400 });
    }
    if (!startDate || typeof startDate !== 'string') {
      return NextResponse.json({ error: 'startDate is required' }, { status: 400 });
    }

    // Validate the chain belongs to this user
    const { data: protocol } = await supabase
      .from('protocols')
      .select('version_chain_id')
      .eq('version_chain_id', versionChainId)
      .eq('user_id', user.id)
      .eq('is_current', true)
      .single();

    if (!protocol) {
      return NextResponse.json({ error: 'Protocol not found' }, { status: 404 });
    }

    // Check for overlapping schedules
    let overlapQuery = supabase
      .from('protocol_schedules')
      .select('*')
      .eq('user_id', user.id);

    // Exclude the current schedule when updating
    if (id) {
      overlapQuery = overlapQuery.neq('id', id);
    }

    const { data: existing } = await overlapQuery;

    if (existing) {
      const overlap = existing.find(s => {
        const sStart = new Date(s.start_date);
        const sEnd = s.end_date ? new Date(s.end_date) : null;
        const newStart = new Date(startDate);
        const newEnd = endDate ? new Date(endDate) : null;

        // Check overlap: two ranges overlap if start1 <= end2 AND start2 <= end1
        // With nulls (indefinite), treat as +infinity
        const start1LteEnd2 = sEnd === null || newStart <= sEnd;
        const start2LteEnd1 = newEnd === null || sStart <= newEnd;

        return start1LteEnd2 && start2LteEnd1;
      });

      if (overlap) {
        return NextResponse.json({
          error: 'Schedule overlaps with existing schedule',
          conflicting: {
            id: overlap.id,
            label: overlap.label,
            start_date: overlap.start_date,
            end_date: overlap.end_date,
          },
        }, { status: 409 });
      }
    }

    if (id) {
      // Update existing schedule
      const { data: updated, error } = await supabase
        .from('protocol_schedules')
        .update({
          version_chain_id: versionChainId,
          start_date: startDate,
          end_date: endDate || null,
          label: label || null,
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating schedule:', error);
        return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
      }

      return NextResponse.json({ schedule: updated });
    } else {
      // Create new schedule
      const { data: created, error } = await supabase
        .from('protocol_schedules')
        .insert({
          user_id: user.id,
          version_chain_id: versionChainId,
          start_date: startDate,
          end_date: endDate || null,
          label: label || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating schedule:', error);
        return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 });
      }

      return NextResponse.json({ schedule: created });
    }
  } catch (error) {
    console.error('Schedule create/update error:', error);
    return NextResponse.json(
      { error: 'Failed to save schedule', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await request.json();

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('protocol_schedules')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting schedule:', error);
      return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Schedule delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete schedule', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
