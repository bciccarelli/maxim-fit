import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { askAboutProtocol, askAboutProtocolStream, type QAHistoryItem, type ImageData } from '@/lib/gemini/generation';
import { normalizeProtocol, type Citation } from '@/lib/schemas/protocol';
import { userConfigSchema } from '@/lib/schemas/user-config';
import { SSE_HEADERS } from '@/lib/streaming';
import { getUserTier, isPro } from '@/lib/stripe/subscription';
import { mergeCitations } from '@/lib/gemini/citations';
import { validateOperations, protocolOperationSchema, type ProtocolOperation } from '@protocol/shared';
import type { DailyProtocol } from '@protocol/shared/schemas/protocol';

/**
 * Parse raw Gemini operations through Zod, then validate element IDs exist.
 */
function parseAndValidateOperations(
  rawOps: Array<Record<string, unknown>> | undefined,
  protocol: DailyProtocol
): ProtocolOperation[] | undefined {
  if (!rawOps || rawOps.length === 0) {
    console.log('[Ask] No raw operations to validate');
    return undefined;
  }

  console.log('[Ask] Validating', rawOps.length, 'raw operations');

  const parsed: ProtocolOperation[] = [];
  for (const raw of rawOps) {
    const result = protocolOperationSchema.safeParse(raw);
    if (result.success) {
      parsed.push(result.data);
    } else {
      console.error('[Ask] Operation failed Zod parse:', JSON.stringify(raw));
      console.error('[Ask] Zod errors:', JSON.stringify(result.error.flatten()));
    }
  }

  if (parsed.length === 0) {
    console.error('[Ask] All', rawOps.length, 'operations failed Zod parsing');
    return undefined;
  }

  console.log('[Ask] Zod parsing:', parsed.length, '/', rawOps.length, 'passed');

  const valid = validateOperations(protocol, parsed);
  if (valid.length < parsed.length) {
    const dropped = parsed.filter(op => op.op !== 'create' && !valid.some(v => v.op !== 'create' && v.op === op.op && ('elementId' in v && 'elementId' in op && v.elementId === op.elementId)));
    console.warn('[Ask] ID validation:', valid.length, '/', parsed.length, 'passed. Dropped ops:', JSON.stringify(dropped.map(op => ({ op: op.op, elementType: op.elementType, elementId: 'elementId' in op ? op.elementId : undefined }))));
  }

  console.log('[Ask] Final valid operations:', valid.length);
  return valid.length > 0 ? valid : undefined;
}

const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4MB base64 (approximately 3MB image)
const VALID_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

function validateImage(image: unknown): ImageData | null {
  if (!image || typeof image !== 'object') return null;
  const img = image as Record<string, unknown>;

  if (!img.base64 || typeof img.base64 !== 'string') return null;
  if (!img.mimeType || typeof img.mimeType !== 'string') return null;

  if (img.base64.length > MAX_IMAGE_SIZE) {
    throw new Error('Image too large. Maximum size is 3MB.');
  }

  if (!VALID_MIME_TYPES.includes(img.mimeType)) {
    throw new Error('Invalid image type. Use JPEG, PNG, GIF, or WebP.');
  }

  return { base64: img.base64, mimeType: img.mimeType };
}

async function uploadImageToStorage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  base64: string,
  mimeType: string,
  userId: string
): Promise<string | null> {
  try {
    // Convert base64 to buffer
    const buffer = Buffer.from(base64, 'base64');

    // Generate unique filename
    const ext = mimeType.split('/')[1] || 'jpg';
    const filename = `${userId}/${Date.now()}.${ext}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('chat-images')
      .upload(filename, buffer, {
        contentType: mimeType,
        cacheControl: '31536000', // 1 year cache
      });

    if (error) {
      console.error('Error uploading image:', error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('chat-images')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error processing image upload:', error);
    return null;
  }
}

function buildConfig(configData: Record<string, unknown> | null) {
  if (!configData) return null;
  return userConfigSchema.safeParse({
    personal_info: configData.personal_info,
    goals: configData.goals,
    requirements: configData.requirements,
    iterations: 1,
  });
}

const fallbackConfig = {
  personal_info: {
    age: 30, weight_lbs: 170, height_in: 70, sex: 'other' as const,
    lifestyle_considerations: [], fitness_level: 'intermediate' as const,
    dietary_restrictions: [],
  },
  goals: [{ name: 'General Health', weight: 1.0, description: 'Improve overall health' }],
  requirements: [],
  iterations: 1,
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const chainId = request.nextUrl.searchParams.get('chainId');
    const conversationId = request.nextUrl.searchParams.get('conversationId');

    if (!chainId) {
      return NextResponse.json({ error: 'chainId is required' }, { status: 400 });
    }

    // If conversationId provided, return Q&A for that specific conversation
    if (conversationId) {
      const { data: questions, error } = await supabase
        .from('protocol_questions')
        .select('id, question, answer, created_at, citations, conversation_id, image_url')
        .eq('version_chain_id', chainId)
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
      }

      return NextResponse.json({ questions: questions ?? [] });
    }

    // Otherwise, return all Q&A grouped by conversation
    const { data: questions, error } = await supabase
      .from('protocol_questions')
      .select('id, question, answer, created_at, citations, conversation_id, image_url')
      .eq('version_chain_id', chainId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
    }

    // Group questions by conversation_id
    const conversationMap = new Map<string, typeof questions>();
    for (const q of questions ?? []) {
      const convId = q.conversation_id || 'default';
      if (!conversationMap.has(convId)) {
        conversationMap.set(convId, []);
      }
      conversationMap.get(convId)!.push(q);
    }

    // Build conversations array with metadata
    const conversations = Array.from(conversationMap.entries()).map(([convId, qs]) => ({
      id: convId,
      firstQuestion: qs[0]?.question || '',
      messageCount: qs.length,
      createdAt: qs[0]?.created_at,
      updatedAt: qs[qs.length - 1]?.created_at,
    }));

    // Sort by most recent first
    conversations.sort((a, b) => {
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return dateB - dateA;
    });

    return NextResponse.json({
      questions: questions ?? [],
      conversations,
    });
  } catch (error) {
    console.error('Fetch questions error:', error);
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const useStreaming = request.nextUrl.searchParams.get('stream') === 'true';

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check Pro subscription
    const tier = await getUserTier(user.id);
    if (!isPro(tier)) {
      return NextResponse.json({
        error: 'Protocol Q&A requires a Pro subscription',
        code: 'UPGRADE_REQUIRED',
        currentTier: tier,
      }, { status: 402 });
    }

    const { protocolId, question, conversationId, image } = await request.json();

    if (!protocolId || typeof protocolId !== 'string') {
      return NextResponse.json({ error: 'Protocol ID is required' }, { status: 400 });
    }
    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    // Validate image if present
    let imageData: ImageData | null = null;
    try {
      imageData = validateImage(image);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid image' },
        { status: 400 }
      );
    }

    // Generate new conversation ID if not provided
    const activeConversationId = conversationId || crypto.randomUUID();

    // Fetch the protocol with config
    const { data: protocol, error: fetchError } = await supabase
      .from('protocols')
      .select('*, user_configs(*)')
      .eq('id', protocolId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !protocol) {
      return NextResponse.json({ error: 'Protocol not found' }, { status: 404 });
    }

    const versionChainId = protocol.version_chain_id ?? protocol.id;

    // Fetch conversation history for the current conversation (limit to last 10 for context window)
    const { data: historyData } = await supabase
      .from('protocol_questions')
      .select('question, answer')
      .eq('version_chain_id', versionChainId)
      .eq('conversation_id', activeConversationId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(10);

    const history: QAHistoryItem[] = historyData ?? [];

    const protocolData = normalizeProtocol(protocol.protocol_data);
    const config = buildConfig(protocol.user_configs);
    const askConfig = config?.success ? config.data : fallbackConfig;

    if (useStreaming) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Signal that Google Search grounding is happening
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ stage: 'researching' })}\n\n`)
            );

            const generator = askAboutProtocolStream(protocolData, askConfig, question, history, imageData);
            let genResult: IteratorResult<string, Awaited<ReturnType<typeof askAboutProtocol>>>;
            do {
              genResult = await generator.next();
              if (!genResult.done && genResult.value) {
                // Check for stage markers from the generator
                if (genResult.value.startsWith('\x00stage:')) {
                  const stage = genResult.value.slice(7);
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ stage })}\n\n`)
                  );
                } else {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ chunk: genResult.value })}\n\n`)
                  );
                }
              }
            } while (!genResult.done);

            const { answer, suggestsModification, citations: newCitations, operations: rawOperations } = genResult.value;

            // Parse and validate operations against the current protocol
            const operations = parseAndValidateOperations(rawOperations, protocolData);

            // Upload image to storage if present
            let imageUrl: string | null = null;
            if (imageData) {
              imageUrl = await uploadImageToStorage(supabase, imageData.base64, imageData.mimeType, user.id);
            }

            // Save Q&A with conversation ID, citations, and image URL
            await supabase
              .from('protocol_questions')
              .insert({
                protocol_id: protocolId,
                version_chain_id: protocol.version_chain_id ?? protocol.id,
                conversation_id: activeConversationId,
                user_id: user.id,
                question,
                answer,
                citations: newCitations.length > 0 ? newCitations : null,
                image_url: imageUrl,
              });

            // Merge new citations with existing ones on the protocol
            const existingCitations = (protocol.citations as Citation[]) || [];
            const mergedCitations = mergeCitations(existingCitations, newCitations);

            // Update protocol with merged citations if there are new ones
            if (newCitations.length > 0) {
              await supabase
                .from('protocols')
                .update({ citations: mergedCitations })
                .eq('id', protocolId)
                .eq('user_id', user.id);
            }

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                done: true,
                result: {
                  answer,
                  suggestsModification,
                  citations: newCitations,
                  conversationId: activeConversationId,
                  imageUrl,
                  operations: operations && operations.length > 0 ? operations : undefined,
                },
              })}\n\n`)
            );
          } catch (error) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                error: error instanceof Error ? error.message : 'Failed to answer',
              })}\n\n`)
            );
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, { headers: SSE_HEADERS });
    }

    // Non-streaming path - now captures citations and operations
    const { answer, suggestsModification, citations: newCitations, operations: rawOps } = await askAboutProtocol(protocolData, askConfig, question, history, imageData);

    // Parse and validate operations against the current protocol
    const validOps = parseAndValidateOperations(rawOps, protocolData);

    // Merge new citations with existing ones on the protocol
    const existingCitations = (protocol.citations as Citation[]) || [];
    const mergedCitations = mergeCitations(existingCitations, newCitations);

    // Upload image to storage if present
    let imageUrl: string | null = null;
    if (imageData) {
      imageUrl = await uploadImageToStorage(supabase, imageData.base64, imageData.mimeType, user.id);
    }

    // Save Q&A with conversation ID, citations, and image URL
    const { error: saveError } = await supabase
      .from('protocol_questions')
      .insert({
        protocol_id: protocolId,
        version_chain_id: protocol.version_chain_id ?? protocol.id,
        conversation_id: activeConversationId,
        user_id: user.id,
        question,
        answer,
        citations: newCitations.length > 0 ? newCitations : null,
        image_url: imageUrl,
      });

    if (saveError) {
      console.error('Error saving question:', saveError);
    }

    // Update protocol with merged citations
    if (newCitations.length > 0) {
      await supabase
        .from('protocols')
        .update({ citations: mergedCitations })
        .eq('id', protocolId)
        .eq('user_id', user.id);
    }

    return NextResponse.json({
      answer,
      suggestsModification,
      citations: mergedCitations,
      conversationId: activeConversationId,
      imageUrl,
      operations: validOps && validOps.length > 0 ? validOps : undefined,
    });
  } catch (error) {
    console.error('Protocol ask error:', error);
    return NextResponse.json(
      { error: 'Failed to answer question', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
