import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { askAboutProtocol, askAboutProtocolStream } from '@/lib/gemini/generation';
import { dailyProtocolSchema } from '@/lib/schemas/protocol';
import { userConfigSchema } from '@/lib/schemas/user-config';
import { SSE_HEADERS } from '@/lib/streaming';

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
    if (!chainId) {
      return NextResponse.json({ error: 'chainId is required' }, { status: 400 });
    }

    const { data: questions, error } = await supabase
      .from('protocol_questions')
      .select('id, question, answer, created_at')
      .eq('version_chain_id', chainId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
    }

    return NextResponse.json({ questions: questions ?? [] });
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

    const { protocolId, question } = await request.json();

    if (!protocolId || typeof protocolId !== 'string') {
      return NextResponse.json({ error: 'Protocol ID is required' }, { status: 400 });
    }
    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

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

    const protocolData = dailyProtocolSchema.parse(protocol.protocol_data);
    const config = buildConfig(protocol.user_configs);
    const askConfig = config?.success ? config.data : fallbackConfig;

    if (useStreaming) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const generator = askAboutProtocolStream(protocolData, askConfig, question);
            let genResult: IteratorResult<string, { answer: string; suggestsModification: boolean }>;
            do {
              genResult = await generator.next();
              if (!genResult.done && genResult.value) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ chunk: genResult.value })}\n\n`)
                );
              }
            } while (!genResult.done);

            const { answer, suggestsModification } = genResult.value;

            // Save Q&A
            await supabase
              .from('protocol_questions')
              .insert({
                protocol_id: protocolId,
                version_chain_id: protocol.version_chain_id ?? protocol.id,
                user_id: user.id,
                question,
                answer,
              });

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                done: true,
                result: { answer, suggestsModification },
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

    // Non-streaming path
    const { answer, suggestsModification } = await askAboutProtocol(protocolData, askConfig, question);

    // Save Q&A
    const { error: saveError } = await supabase
      .from('protocol_questions')
      .insert({
        protocol_id: protocolId,
        version_chain_id: protocol.version_chain_id ?? protocol.id,
        user_id: user.id,
        question,
        answer,
      });

    if (saveError) {
      console.error('Error saving question:', saveError);
    }

    return NextResponse.json({ answer, suggestsModification });
  } catch (error) {
    console.error('Protocol ask error:', error);
    return NextResponse.json(
      { error: 'Failed to answer question', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
