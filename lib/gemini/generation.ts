import { zodToJsonSchema } from 'zod-to-json-schema';
import { getGeminiClient, MODEL_NAME } from './client';
import { dailyProtocolSchema, type DailyProtocol } from '../schemas/protocol';
import type { UserConfig, AnonymousUserConfig } from '../schemas/user-config';

export async function generateProtocol(
  config: UserConfig | AnonymousUserConfig
): Promise<DailyProtocol> {
  const client = getGeminiClient();

  const prompt = buildGenerationPrompt(config);
  const jsonSchema = zodToJsonSchema(dailyProtocolSchema);

  const response = await client.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: 'application/json',
      responseJsonSchema: jsonSchema,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('No response from Gemini');
  }

  const parsed = JSON.parse(text);
  return dailyProtocolSchema.parse(parsed);
}

function buildGenerationPrompt(config: UserConfig | AnonymousUserConfig): string {
  const { personal_info, goals, requirements } = config;

  const goalsText = goals
    .map((g) => `- ${g.name} (weight: ${g.weight}): ${g.description}`)
    .join('\n');

  const requirementsText = requirements.length > 0
    ? requirements.map((r) => `- ${r}`).join('\n')
    : 'No specific requirements provided.';

  return `You are an expert health protocol designer. Create a comprehensive, personalized daily health protocol based on the following user information.

## User Profile

**Personal Information:**
- Age: ${personal_info.age} years
- Weight: ${personal_info.weight_lbs} lbs
- Height: ${personal_info.height_in} inches
- Sex: ${personal_info.sex}
- Genetic Background: ${personal_info.genetic_background}
- Health Conditions: ${personal_info.health_conditions.length > 0 ? personal_info.health_conditions.join(', ') : 'None reported'}
- Fitness Level: ${personal_info.fitness_level}
- Dietary Restrictions: ${personal_info.dietary_restrictions.length > 0 ? personal_info.dietary_restrictions.join(', ') : 'None'}

**Goals (weighted by importance):**
${goalsText}

**Requirements:**
${requirementsText}

## Instructions

1. Use Google Search to find the latest evidence-based recommendations for this user's specific goals and conditions.
2. Design a complete daily protocol including:
   - A detailed schedule from wake to sleep
   - A comprehensive diet plan with macros and specific meals
   - A supplementation plan tailored to their goals
   - A training program appropriate for their fitness level and goals
3. Ensure all requirements are satisfied where possible.
4. Prioritize adherence - the protocol must be realistic and sustainable.
5. Consider the user's health conditions and restrictions when making recommendations.

Generate the protocol now.`;
}

export async function evaluateProtocol(
  protocol: DailyProtocol,
  config: UserConfig | AnonymousUserConfig
): Promise<{
  requirement_scores: Array<{
    requirement_name: string;
    target: number;
    achieved: number;
    adherence_percent: number;
    suggestions: string;
  }>;
  goal_scores: Array<{
    goal_name: string;
    score: number;
    reasoning: string;
    suggestions: string;
  }>;
  critiques: Array<{
    category: string;
    criticism: string;
    severity: 'minor' | 'moderate' | 'major';
    suggestion: string;
  }>;
  requirements_met: boolean;
  weighted_goal_score: number;
  viability_score: number;
}> {
  const client = getGeminiClient();

  const prompt = `You are a critical evaluator of health protocols. Analyze the following protocol and provide honest, thorough feedback.

## User Configuration
${JSON.stringify(config, null, 2)}

## Generated Protocol
${JSON.stringify(protocol, null, 2)}

## Evaluation Tasks

1. **Requirement Adherence**: For each requirement, score how well the protocol meets it (0-100%).
2. **Goal Scores**: For each goal, score how well the protocol supports it (0-100) with reasoning.
3. **Critiques**: Identify weaknesses, potential issues, and areas for improvement. Be a devil's advocate.
4. **Overall Viability**: Score how likely this protocol is to be followed long-term (0-100).

Be thorough and honest. A protocol that won't be followed is worthless.`;

  const evaluationSchema = {
    type: 'object',
    properties: {
      requirement_scores: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            requirement_name: { type: 'string' },
            target: { type: 'number' },
            achieved: { type: 'number' },
            adherence_percent: { type: 'number' },
            suggestions: { type: 'string' },
          },
          required: ['requirement_name', 'target', 'achieved', 'adherence_percent', 'suggestions'],
        },
      },
      goal_scores: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            goal_name: { type: 'string' },
            score: { type: 'number' },
            reasoning: { type: 'string' },
            suggestions: { type: 'string' },
          },
          required: ['goal_name', 'score', 'reasoning', 'suggestions'],
        },
      },
      critiques: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            category: { type: 'string' },
            criticism: { type: 'string' },
            severity: { type: 'string', enum: ['minor', 'moderate', 'major'] },
            suggestion: { type: 'string' },
          },
          required: ['category', 'criticism', 'severity', 'suggestion'],
        },
      },
      requirements_met: { type: 'boolean' },
      weighted_goal_score: { type: 'number' },
      viability_score: { type: 'number' },
    },
    required: ['requirement_scores', 'goal_scores', 'critiques', 'requirements_met', 'weighted_goal_score', 'viability_score'],
  };

  const response = await client.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: 'application/json',
      responseJsonSchema: evaluationSchema,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('No evaluation response from Gemini');
  }

  return JSON.parse(text);
}
