import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateMealsStream, type MealSlotResult } from '@/lib/gemini/generation';
import { normalizeProtocol } from '@/lib/schemas/protocol';
import { userConfigSchema } from '@/lib/schemas/user-config';
import { SSE_HEADERS } from '@/lib/streaming';
import { getUserTier, isPro } from '@/lib/stripe/subscription';

function buildConfig(configData: Record<string, unknown> | null) {
  if (!configData) return null;
  return userConfigSchema.safeParse({
    personal_info: configData.personal_info,
    goals: configData.goals,
    requirements: configData.requirements,
    iterations: 1,
  });
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
        error: 'AI Meal Generation requires a Pro subscription',
        code: 'UPGRADE_REQUIRED',
        currentTier: tier,
      }, { status: 402 });
    }

    const { protocolId, mealCount, preferences, exclusions } = await request.json();

    if (!protocolId || typeof protocolId !== 'string') {
      return NextResponse.json({ error: 'Protocol ID is required' }, { status: 400 });
    }
    if (!mealCount || typeof mealCount !== 'number' || mealCount < 2 || mealCount > 6) {
      return NextResponse.json({ error: 'Meal count must be between 2 and 6' }, { status: 400 });
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

    const protocolData = normalizeProtocol(protocol.protocol_data);
    const config = buildConfig(protocol.user_configs);

    // Extract schedule info for meal timing
    const firstSchedule = protocolData.schedules[0];
    const schedule = {
      wakeTime: firstSchedule?.wake_time || '07:00',
      sleepTime: firstSchedule?.sleep_time || '22:00',
    };

    // Extract workout times from schedule for nutrient timing
    const workoutTimes = firstSchedule?.schedule
      ?.filter((block) =>
        block.activity.toLowerCase().includes('workout') ||
        block.activity.toLowerCase().includes('training') ||
        block.activity.toLowerCase().includes('exercise') ||
        block.activity.toLowerCase().includes('gym')
      )
      .map((block) => block.start_time) || [];

    // Extract dietary restrictions from config
    const dietaryRestrictions = config?.success
      ? config.data.personal_info.dietary_restrictions
      : [];

    const input = {
      dailyCalories: protocolData.diet.daily_calories,
      proteinTargetG: protocolData.diet.protein_target_g,
      carbsTargetG: protocolData.diet.carbs_target_g,
      fatTargetG: protocolData.diet.fat_target_g,
      mealCount,
      preferences: preferences || undefined,
      exclusions: exclusions || undefined,
      dietaryRestrictions,
      schedule,
      workoutTimes: workoutTimes.length > 0 ? workoutTimes : undefined,
    };

    // Current macro totals for comparison
    const currentMacros = {
      calories: protocolData.diet.meals.reduce((sum, m) => sum + m.calories, 0),
      protein_g: protocolData.diet.meals.reduce((sum, m) => sum + m.protein_g, 0),
      carbs_g: protocolData.diet.meals.reduce((sum, m) => sum + m.carbs_g, 0),
      fat_g: protocolData.diet.meals.reduce((sum, m) => sum + m.fat_g, 0),
    };

    if (useStreaming) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Stream meal slot generation
            const generator = generateMealsStream(input);
            let genResult: IteratorResult<string, MealSlotResult>;
            do {
              genResult = await generator.next();
              if (!genResult.done && genResult.value) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ chunk: genResult.value })}\n\n`)
                );
              }
            } while (!genResult.done);

            const { meals, reasoning, timingStrategy } = genResult.value;

            // Calculate proposed macro totals
            const proposedMacros = {
              calories: meals.reduce((sum, m) => sum + m.calories, 0),
              protein_g: meals.reduce((sum, m) => sum + m.protein_g, 0),
              carbs_g: meals.reduce((sum, m) => sum + m.carbs_g, 0),
              fat_g: meals.reduce((sum, m) => sum + m.fat_g, 0),
            };

            // Save proposal to staging table
            const { data: proposal } = await supabase
              .from('meal_generation_proposals')
              .insert({
                protocol_id: protocolId,
                user_id: user.id,
                meal_count: mealCount,
                preferences: preferences || null,
                exclusions: exclusions || null,
                proposed_meals: meals,
                reasoning,
                macro_comparison: {
                  current: currentMacros,
                  proposed: proposedMacros,
                  targets: {
                    calories: protocolData.diet.daily_calories,
                    protein_g: protocolData.diet.protein_target_g,
                    carbs_g: protocolData.diet.carbs_target_g,
                    fat_g: protocolData.diet.fat_target_g,
                  },
                },
                status: 'pending',
              })
              .select()
              .single();

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                done: true,
                result: {
                  proposalId: proposal?.id,
                  meals,
                  reasoning,
                  timingStrategy,
                  macroComparison: {
                    current: currentMacros,
                    proposed: proposedMacros,
                    targets: {
                      calories: protocolData.diet.daily_calories,
                      protein_g: protocolData.diet.protein_target_g,
                      carbs_g: protocolData.diet.carbs_target_g,
                      fat_g: protocolData.diet.fat_target_g,
                    },
                  },
                },
              })}\n\n`)
            );
          } catch (error) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                error: error instanceof Error ? error.message : 'Meal generation failed',
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
    const generator = generateMealsStream(input);
    let genResult: IteratorResult<string, MealSlotResult>;
    do {
      genResult = await generator.next();
    } while (!genResult.done);

    const { meals, reasoning, timingStrategy } = genResult.value;

    const proposedMacros = {
      calories: meals.reduce((sum, m) => sum + m.calories, 0),
      protein_g: meals.reduce((sum, m) => sum + m.protein_g, 0),
      carbs_g: meals.reduce((sum, m) => sum + m.carbs_g, 0),
      fat_g: meals.reduce((sum, m) => sum + m.fat_g, 0),
    };

    const { data: proposal } = await supabase
      .from('meal_generation_proposals')
      .insert({
        protocol_id: protocolId,
        user_id: user.id,
        meal_count: mealCount,
        preferences: preferences || null,
        exclusions: exclusions || null,
        proposed_meals: meals,
        reasoning,
        macro_comparison: {
          current: currentMacros,
          proposed: proposedMacros,
          targets: {
            calories: protocolData.diet.daily_calories,
            protein_g: protocolData.diet.protein_target_g,
            carbs_g: protocolData.diet.carbs_target_g,
            fat_g: protocolData.diet.fat_target_g,
          },
        },
        status: 'pending',
      })
      .select()
      .single();

    return NextResponse.json({
      proposalId: proposal?.id,
      meals,
      reasoning,
      timingStrategy,
      macroComparison: {
        current: currentMacros,
        proposed: proposedMacros,
        targets: {
          calories: protocolData.diet.daily_calories,
          protein_g: protocolData.diet.protein_target_g,
          carbs_g: protocolData.diet.carbs_target_g,
          fat_g: protocolData.diet.fat_target_g,
        },
      },
    });
  } catch (error) {
    console.error('Meal generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate meals', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
