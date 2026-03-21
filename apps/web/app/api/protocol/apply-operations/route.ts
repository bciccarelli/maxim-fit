import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizeProtocol } from '@/lib/schemas/protocol';
import { getUserTier, isPro } from '@/lib/stripe/subscription';
import {
  applyOperations,
  validateOperations,
  protocolOperationSchema,
} from '@protocol/shared';
import { z } from 'zod';

const requestSchema = z.object({
  protocolId: z.string(),
  operations: z.array(protocolOperationSchema).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check Pro subscription
    const tier = await getUserTier(user.id);
    if (!isPro(tier)) {
      return NextResponse.json({
        error: 'This feature requires a Pro subscription',
        code: 'UPGRADE_REQUIRED',
        currentTier: tier,
      }, { status: 402 });
    }

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { protocolId, operations } = parsed.data;

    // Fetch the current protocol
    const { data: current, error: fetchError } = await supabase
      .from('protocols')
      .select('*')
      .eq('id', protocolId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !current) {
      return NextResponse.json({ error: 'Protocol not found' }, { status: 404 });
    }

    // Normalize to ensure all elements have IDs
    const protocolData = normalizeProtocol(current.protocol_data);

    // Log workout state for debugging
    console.log('[Apply-ops] Workouts before ops:', JSON.stringify(
      protocolData.training.workouts.map(w => ({ id: w.id, name: w.name, day: w.day }))
    ));

    // Validate operations reference existing elements
    const validOps = validateOperations(protocolData, operations);
    if (validOps.length === 0) {
      return NextResponse.json(
        { error: 'No valid operations to apply' },
        { status: 400 }
      );
    }

    // Log operations for debugging
    console.log('[Apply-ops] Operations:', JSON.stringify(validOps.map(op => ({
      op: op.op,
      elementType: op.elementType,
      ...(op.op === 'create' ? { data: op.data } : {}),
      ...(op.op === 'modify' ? { elementId: op.elementId, fields: op.fields } : {}),
      ...(op.op === 'delete' ? { elementId: op.elementId } : {}),
    }))));

    // Apply operations
    const modified = applyOperations(protocolData, validOps);

    // Normalize the resulting protocol (handles type coercion, assigns IDs, validates)
    let normalizedResult;
    try {
      normalizedResult = normalizeProtocol(modified);
    } catch (err) {
      // Log detailed Zod validation errors for debugging
      const zodErrors = (err as { errors?: Array<{ path: (string | number)[]; message: string }> }).errors;
      if (zodErrors) {
        console.error('Apply-operations Zod validation errors:', JSON.stringify(zodErrors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        }))));
      }
      console.error('Apply-operations produced invalid protocol:', err);
      const detail = zodErrors
        ? zodErrors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
        : (err instanceof Error ? err.message : 'Validation failed');
      return NextResponse.json(
        { error: `Operations produced an invalid protocol: ${detail}` },
        { status: 422 }
      );
    }

    // Build change note from operation reasons
    const changeNote = validOps
      .map(op => op.reason)
      .filter(Boolean)
      .join('; ') || 'Chat suggestion applied';

    // Mark old row as not current
    await supabase
      .from('protocols')
      .update({ is_current: false })
      .eq('id', protocolId)
      .eq('user_id', user.id);

    // Insert new version
    const { data: newVersion, error: insertError } = await supabase
      .from('protocols')
      .insert({
        user_id: user.id,
        config_id: current.config_id,
        protocol_data: normalizedResult,
        name: current.name,
        version: (current.version ?? 1) + 1,
        version_chain_id: current.version_chain_id ?? current.id,
        is_current: true,
        parent_version_id: current.id,
        change_note: changeNote,
        change_source: 'chat_suggestion',
        verified: false,
        verified_at: null,
        weighted_goal_score: null,
        viability_score: null,
        requirements_met: null,
        requirement_scores: null,
        goal_scores: null,
        critiques: null,
        iteration: current.iteration,
        is_anonymous: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating new version:', insertError);
      return NextResponse.json(
        { error: 'Failed to apply operations', message: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: newVersion.id,
      version: newVersion.version,
      operationsApplied: validOps.length,
      message: 'Operations applied successfully',
    });
  } catch (error) {
    console.error('Apply operations error:', error);
    return NextResponse.json(
      { error: 'Failed to apply operations', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
