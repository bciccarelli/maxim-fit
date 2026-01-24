"""Protocol generation and evaluation functions."""

from typing import Optional

from google import genai

from .models import (
    AdherenceEvaluation,
    AdherenceScore,
    Critique,
    CritiqueEvaluation,
    CriticismResolutionEvaluation,
    DailyProtocol,
    Goal,
    GoalEvaluation,
    GoalScore,
    ParsedRequirements,
    PersonalInfo,
    Requirement,
    StoredCriticism,
)


def parse_requirements(
    client: genai.Client,
    requirements: list[str],
    personal_info: PersonalInfo
) -> list[Requirement]:
    """Parse natural language requirements into structured Requirement objects."""
    prompt = f"""Parse the following natural language requirements into structured data.
Consider the user's personal information when determining priorities:
- Age: {personal_info.age}
- Fitness level: {personal_info.fitness_level}
- Health conditions: {', '.join(personal_info.health_conditions) or 'None'}

Requirements to parse:
{chr(10).join(f'- {r}' for r in requirements)}

For each requirement:
- Extract the target value (e.g., "8 hours" -> 8.0)
- Determine the unit (hours, minutes, times, etc.)
- Assign priority based on importance for health and the user's profile
- Provide a clear name and description
"""

    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": ParsedRequirements,
        },
    )

    return response.parsed.requirements


def generate_protocol(
    client: genai.Client,
    requirements: list[Requirement],
    personal_info: PersonalInfo,
    goals: list[Goal],
    previous_protocol: Optional[DailyProtocol] = None,
    previous_scores: Optional[list[AdherenceScore]] = None,
    knowledge_summary: str = "",
) -> DailyProtocol:
    """Generate a complete daily protocol using Gemini."""
    goals_text = "\n".join(f"- {g.name} (weight: {g.weight}): {g.description}" for g in goals)
    requirements_text = "\n".join(
        f"- {r.name}: {r.target_value} {r.unit} (priority: {r.priority})"
        for r in requirements
    )

    prompt = f"""Create a comprehensive daily protocol for a person with the following profile:

Personal Information:
- Age: {personal_info.age}
- Weight: {personal_info.weight_lbs} lbs
- Height: {personal_info.height_in} inches
- Sex: {personal_info.sex}
- Genetic background: {personal_info.genetic_background}
- Fitness level: {personal_info.fitness_level}
- Health conditions: {', '.join(personal_info.health_conditions) or 'None'}
- Dietary restrictions: {', '.join(personal_info.dietary_restrictions) or 'None'}

Goals (prioritize by weight):
{goals_text}

Requirements to satisfy:
{requirements_text}

Generate a COMPLETE protocol including:

1. DAILY SCHEDULE: Time-blocked activities from wake to sleep
   - Include wake_time and sleep_time
   - Include all activities with start/end times

2. DIET PLAN: Complete nutrition plan
   - Calculate appropriate daily calories based on goals and stats
   - Set macro targets (protein, carbs, fat in grams)
   - Plan 3-5 meals with specific foods, timing, and macros
   - Include hydration target in oz
   - Add relevant dietary notes

3. SUPPLEMENTATION PLAN: Evidence-based supplements
   - Include supplements appropriate for the person's goals
   - Specify dosage, timing, and purpose for each
   - Consider any health conditions or restrictions
   - Add general notes about supplement timing/interactions

4. TRAINING PROGRAM: Weekly workout plan
   - Design program matching fitness level and goals
   - Include specific exercises with sets/reps or duration
   - Specify rest periods and progression notes
   - Include warmup and cooldown for each workout
   - Plan rest days appropriately

"""

    if previous_protocol and previous_scores:
        low_scores = [s for s in previous_scores if s.adherence_percent < 100]
        low_scores_text = "\n".join(
            f"- {s.requirement_name}: {s.adherence_percent:.1f}% adherence. Suggestion: {s.suggestions}"
            for s in low_scores
        )

        prompt += f"""
Previous protocol had these issues that need improvement:
{low_scores_text}

Previous schedule:
{chr(10).join(f'- {b.start_time}-{b.end_time}: {b.activity}' for b in previous_protocol.schedule.schedule)}

Please generate an improved protocol that better addresses the low-scoring requirements.
Focus especially on requirements with low adherence percentages.
"""
    else:
        prompt += """
Ensure all requirements are satisfied while maintaining a healthy balance.
Use realistic time allocations and consider transitions between activities.
Make the protocol practical and sustainable for long-term adherence.
"""

    # Add knowledge summary if available
    if knowledge_summary:
        prompt += f"""

RESEARCH-BACKED KNOWLEDGE:
{knowledge_summary}

Use this evidence-based knowledge to inform your recommendations.
"""

    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": DailyProtocol,
        },
    )

    return response.parsed


def get_protocol_summary(protocol: DailyProtocol) -> str:
    """Generate a text summary of the protocol for evaluation prompts."""
    schedule_text = "\n".join(
        f"- {b.start_time}-{b.end_time}: {b.activity} (satisfies: {b.requirement_satisfied or 'N/A'})"
        for b in protocol.schedule.schedule
    )

    diet_summary = f"""
- Daily calories: {protocol.diet.daily_calories}
- Protein: {protocol.diet.protein_target_g}g, Carbs: {protocol.diet.carbs_target_g}g, Fat: {protocol.diet.fat_target_g}g
- Meals: {len(protocol.diet.meals)}
- Hydration: {protocol.diet.hydration_oz} oz
"""

    training_summary = f"""
- Program: {protocol.training.program_name}
- Days per week: {protocol.training.days_per_week}
- Workouts: {len(protocol.training.workouts)}
- Exercises: {sum(len(w.exercises) for w in protocol.training.workouts)} total
"""

    supplements_summary = f"""
- Supplements: {', '.join(s.name for s in protocol.supplementation.supplements)}
"""

    return f"""Daily Schedule (wake: {protocol.schedule.wake_time}, sleep: {protocol.schedule.sleep_time}):
{schedule_text}

Diet Plan:
{diet_summary}

Training Program:
{training_summary}

Supplementation:
{supplements_summary}"""


def evaluate_requirements(
    client: genai.Client,
    protocol: DailyProtocol,
    requirements: list[Requirement],
) -> tuple[list[AdherenceScore], bool]:
    """Evaluate how well the protocol meets requirements. Returns scores and whether all are met."""
    protocol_summary = get_protocol_summary(protocol)

    requirements_text = "\n".join(
        f"- {r.name}: {r.target_value} {r.unit} (priority: {r.priority}) - {r.description}"
        for r in requirements
    )

    prompt = f"""Evaluate how well this daily protocol meets each requirement.

{protocol_summary}

Requirements to evaluate:
{requirements_text}

For each requirement:
1. Determine the target value from the requirement
2. Calculate the achieved value based on the protocol (schedule, diet, training, supplements)
3. Calculate adherence percentage (achieved / target * 100, capped at 100%)
4. If adherence is below 100%, provide specific actionable suggestions to meet the requirement

Be strict: requirements must be FULLY met (100%) to count as satisfied.
Calculate overall_adherence as the simple average of all requirement adherence percentages.
"""

    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": AdherenceEvaluation,
        },
    )

    evaluation = response.parsed
    all_met = all(s.adherence_percent >= 100 for s in evaluation.scores)
    return evaluation.scores, all_met


def evaluate_goals(
    client: genai.Client,
    protocol: DailyProtocol,
    goals: list[Goal],
    personal_info: PersonalInfo,
) -> tuple[list[GoalScore], float]:
    """Evaluate how well the protocol optimizes for goals. Returns scores and weighted score."""
    protocol_summary = get_protocol_summary(protocol)

    goals_text = "\n".join(
        f"- {g.name} (weight: {g.weight}): {g.description}"
        for g in goals
    )

    prompt = f"""Evaluate how well this daily protocol optimizes for the user's goals.

User Profile:
- Age: {personal_info.age}
- Weight: {personal_info.weight_lbs} lbs
- Height: {personal_info.height_in} inches
- Sex: {personal_info.sex}
- Fitness level: {personal_info.fitness_level}

{protocol_summary}

Goals to evaluate (with weights that sum to 1.0):
{goals_text}

For each goal:
1. Score how well the protocol supports this goal (0-100 scale)
   - 0-30: Poor support for this goal
   - 31-60: Moderate support
   - 61-80: Good support
   - 81-100: Excellent/optimal support
2. Provide reasoning for the score
3. Suggest specific improvements to better achieve this goal

Calculate weighted_score as: sum(goal_score * goal_weight) for all goals.
Provide an overall_assessment summarizing the protocol's goal optimization.
"""

    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": GoalEvaluation,
        },
    )

    evaluation = response.parsed
    return evaluation.scores, evaluation.weighted_score


def critique_protocol(
    client: genai.Client,
    protocol: DailyProtocol,
    personal_info: PersonalInfo,
    goals: list[Goal],
    requirements: list[Requirement],
) -> CritiqueEvaluation:
    """Generate devil's advocate criticism of the protocol."""
    protocol_summary = get_protocol_summary(protocol)

    goals_text = "\n".join(f"- {g.name}: {g.description}" for g in goals)
    requirements_text = "\n".join(f"- {r.name}: {r.target_value} {r.unit}" for r in requirements)

    diet_details = f"""
Meals: {len(protocol.diet.meals)} per day
Calories: {protocol.diet.daily_calories}
Protein: {protocol.diet.protein_target_g}g | Carbs: {protocol.diet.carbs_target_g}g | Fat: {protocol.diet.fat_target_g}g
Meal breakdown:
{chr(10).join(f'  - {m.time} {m.name}: {m.calories}kcal, {m.protein_g}g P' for m in protocol.diet.meals)}
"""

    training_details = f"""
Program: {protocol.training.program_name}
Frequency: {protocol.training.days_per_week} days/week
Workouts:
{chr(10).join(f'  - {w.day}: {w.name} ({w.duration_min}min, {len(w.exercises)} exercises)' for w in protocol.training.workouts)}
"""

    supplement_details = f"""
Supplements:
{chr(10).join(f'  - {s.name}: {s.dosage} at {s.timing}' for s in protocol.supplementation.supplements)}
"""

    prompt = f"""You are a skeptical expert reviewer with access to current research. Critically analyze
this health/fitness protocol as a devil's advocate. Your job is to find weaknesses, potential problems,
and areas that might fail.

IMPORTANT: Use Google Search to verify claims and find current evidence. Look up:
- Whether the supplements listed are safe and effective (check for recalls, interactions, recent studies)
- Whether the training approach is supported by current sports science
- Whether the diet recommendations align with current nutritional research
- Any safety concerns specific to this person's health conditions

Be constructive but rigorous. Consider:
1. SUSTAINABILITY - Can this actually be maintained long-term? Is it too complex or demanding?
2. SCIENTIFIC BASIS - Search for evidence. Are the recommendations supported by current research?
3. PRACTICALITY - Does this fit real life? Consider work, social life, travel, unexpected events
4. SAFETY - Search for risks. Overtraining? Nutrient deficiencies? Supplement interactions or recalls?
5. INDIVIDUALIZATION - Does this truly fit this specific person's profile and health conditions?
6. RECOVERY - Is there adequate rest? Risk of burnout?
7. COST/ACCESSIBILITY - Are the foods/supplements accessible and affordable?
8. PROGRESSION - Is there a clear path forward? How to adapt over time?

User Profile:
- Age: {personal_info.age}, Sex: {personal_info.sex}
- Weight: {personal_info.weight_lbs} lbs, Height: {personal_info.height_in} inches
- Fitness level: {personal_info.fitness_level}
- Health conditions: {', '.join(personal_info.health_conditions) or 'None'}
- Dietary restrictions: {', '.join(personal_info.dietary_restrictions) or 'None'}

Goals: {goals_text}
Requirements: {requirements_text}

PROTOCOL TO CRITIQUE:

Schedule:
{protocol_summary}

Diet Details:
{diet_details}

Training Details:
{training_details}

Supplements:
{supplement_details}

Provide 4-8 critiques covering different categories. Be specific and actionable.
Base your critiques on current evidence where possible.
Rate overall_viability_score (0-100) based on likelihood of long-term success.
Identify the 2-3 strongest and weakest aspects.
"""

    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=prompt,
        config={
            "tools": [{"google_search": {}}],
            "response_mime_type": "application/json",
            "response_schema": CritiqueEvaluation,
        },
    )

    return response.parsed


def refine_with_criticism(
    client: genai.Client,
    protocol: DailyProtocol,
    critiques: list[Critique],
    requirements: list[Requirement],
    personal_info: PersonalInfo,
    goals: list[Goal],
) -> DailyProtocol:
    """Refine the protocol based on devil's advocate criticism."""
    goals_text = "\n".join(f"- {g.name} (weight: {g.weight}): {g.description}" for g in goals)
    requirements_text = "\n".join(
        f"- {r.name}: {r.target_value} {r.unit}"
        for r in requirements
    )

    # Focus on moderate and major critiques
    important_critiques = [c for c in critiques if c.severity in ("moderate", "major")]
    critiques_text = "\n".join(
        f"- [{c.severity.upper()}] {c.category}: {c.criticism}\n  Suggestion: {c.suggestion}"
        for c in important_critiques
    )

    prompt = f"""Refine this protocol to address the critical feedback while maintaining all requirements.

CRITICAL FEEDBACK TO ADDRESS:
{critiques_text}

Requirements (MUST maintain 100%):
{requirements_text}

Goals:
{goals_text}

Personal Info:
- Age: {personal_info.age}, Sex: {personal_info.sex}
- Weight: {personal_info.weight_lbs} lbs, Height: {personal_info.height_in} inches
- Fitness level: {personal_info.fitness_level}
- Health conditions: {', '.join(personal_info.health_conditions) or 'None'}
- Dietary restrictions: {', '.join(personal_info.dietary_restrictions) or 'None'}

Current Schedule:
{chr(10).join(f'- {b.start_time}-{b.end_time}: {b.activity}' for b in protocol.schedule.schedule)}

Generate an improved protocol that:
1. Addresses the moderate and major critiques
2. Maintains ALL requirements at 100%
3. Improves sustainability and practicality
4. Keeps the strong aspects of the current protocol
"""

    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": DailyProtocol,
        },
    )

    return response.parsed


def improve_protocol_for_criticisms(
    client: genai.Client,
    protocol: DailyProtocol,
    criticisms: list[StoredCriticism],
    requirements: list[Requirement],
    personal_info: PersonalInfo,
    goals: list[Goal],
    knowledge_summary: str = "",
) -> DailyProtocol:
    """Generate improved protocol addressing specific stored criticisms."""
    goals_text = "\n".join(f"- {g.name} (weight: {g.weight}): {g.description}" for g in goals)
    requirements_text = "\n".join(
        f"- {r.name}: {r.target_value} {r.unit} (priority: {r.priority})"
        for r in requirements
    )

    # Format criticisms with their full details
    criticisms_text = "\n".join(
        f"- [{c.severity.upper()}] {c.category}: {c.criticism}\n  Suggestion: {c.suggestion}"
        for c in criticisms
    )

    prompt = f"""Improve this protocol to specifically address the following criticisms.

CRITICISMS TO ADDRESS (in order of priority):
{criticisms_text}

Personal Information:
- Age: {personal_info.age}
- Weight: {personal_info.weight_lbs} lbs
- Height: {personal_info.height_in} inches
- Sex: {personal_info.sex}
- Genetic background: {personal_info.genetic_background}
- Fitness level: {personal_info.fitness_level}
- Health conditions: {', '.join(personal_info.health_conditions) or 'None'}
- Dietary restrictions: {', '.join(personal_info.dietary_restrictions) or 'None'}

Requirements (MUST all be met at 100%):
{requirements_text}

Goals:
{goals_text}

Current Protocol Schedule:
{chr(10).join(f'- {b.start_time}-{b.end_time}: {b.activity}' for b in protocol.schedule.schedule)}

Current Diet:
- Calories: {protocol.diet.daily_calories}
- Protein: {protocol.diet.protein_target_g}g, Carbs: {protocol.diet.carbs_target_g}g, Fat: {protocol.diet.fat_target_g}g
- Meals: {len(protocol.diet.meals)}

Current Training:
- Program: {protocol.training.program_name}
- Days: {protocol.training.days_per_week}/week
- Workouts: {len(protocol.training.workouts)}

Current Supplements:
{chr(10).join(f'- {s.name}: {s.dosage}' for s in protocol.supplementation.supplements)}
"""

    if knowledge_summary:
        prompt += f"""

RESEARCH-BACKED KNOWLEDGE (use this to inform improvements):
{knowledge_summary}
"""

    prompt += """

Generate an improved protocol that:
1. DIRECTLY addresses each criticism listed above
2. Maintains ALL requirements at 100%
3. Preserves the strong aspects of the current protocol
4. Incorporates research-backed knowledge where applicable
5. Remains practical and sustainable for long-term adherence

Focus your changes on the areas criticized. Don't make unnecessary changes to working parts.
"""

    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": DailyProtocol,
        },
    )

    return response.parsed


def evaluate_criticism_resolution(
    client: genai.Client,
    protocol: DailyProtocol,
    criticisms: list[StoredCriticism],
    personal_info: PersonalInfo,
) -> CriticismResolutionEvaluation:
    """Evaluate how well the protocol addresses each criticism (0-1 scale)."""
    protocol_summary = get_protocol_summary(protocol)

    criticisms_text = "\n".join(
        f"- ID: {c.id}\n  Category: {c.category}\n  Criticism: {c.criticism}\n  Previous score: {c.resolution_score:.2f}"
        for c in criticisms
    )

    prompt = f"""Evaluate how well this protocol addresses each criticism on a 0-1 scale.

PROTOCOL:
{protocol_summary}

Diet: {protocol.diet.daily_calories} cal, {protocol.diet.protein_target_g}g protein
Training: {protocol.training.program_name}, {protocol.training.days_per_week} days/week
Supplements: {', '.join(s.name for s in protocol.supplementation.supplements)}

USER CONTEXT:
- Age: {personal_info.age}, Sex: {personal_info.sex}
- Fitness level: {personal_info.fitness_level}
- Health conditions: {', '.join(personal_info.health_conditions) or 'None'}

CRITICISMS TO EVALUATE:
{criticisms_text}

For each criticism, provide:
1. criticism_id: The ID from above
2. score: 0.0 = not addressed at all, 0.5 = partially addressed, 1.0 = fully resolved
3. reasoning: Brief explanation of why you gave this score

Also identify:
- detected_tradeoffs: Cases where fixing one criticism made another worse
- stuck_criticisms: IDs of criticisms that seem impossible to resolve given the constraints

Be honest and critical. A score of 1.0 means the criticism is completely resolved.
"""

    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": CriticismResolutionEvaluation,
        },
    )

    return response.parsed
