"""Display and save functions for protocol output."""

from datetime import datetime
from pathlib import Path

from .models import OptimizationResult, UserConfig


def display_final_protocol(result: OptimizationResult) -> None:
    """Display the final optimized protocol."""
    protocol = result.protocol

    print("\n" + "=" * 60)
    print("FINAL OPTIMIZED PROTOCOL")
    print("=" * 60)

    # Daily Schedule
    print(f"\nWake time: {protocol.schedule.wake_time}")
    print(f"Sleep time: {protocol.schedule.sleep_time}")

    print("\n--- Daily Schedule ---")
    for block in protocol.schedule.schedule:
        req_info = f" [{block.requirement_satisfied}]" if block.requirement_satisfied else ""
        print(f"{block.start_time} - {block.end_time}: {block.activity}{req_info}")

    # Diet Plan
    print("\n--- Diet Plan ---")
    print(f"Daily Calories: {protocol.diet.daily_calories} kcal")
    print(f"Macros: {protocol.diet.protein_target_g}g protein | {protocol.diet.carbs_target_g}g carbs | {protocol.diet.fat_target_g}g fat")
    print(f"Hydration: {protocol.diet.hydration_oz} oz water")
    print("\nMeals:")
    for meal in protocol.diet.meals:
        print(f"  {meal.time} - {meal.name} ({meal.calories} kcal)")
        print(f"    Foods: {', '.join(meal.foods)}")
        print(f"    Macros: {meal.protein_g}g P | {meal.carbs_g}g C | {meal.fat_g}g F")
        if meal.notes:
            print(f"    Note: {meal.notes}")
    if protocol.diet.dietary_notes:
        print("\nDietary Notes:")
        for note in protocol.diet.dietary_notes:
            print(f"  - {note}")

    # Supplementation Plan
    print("\n--- Supplementation Plan ---")
    for supp in protocol.supplementation.supplements:
        print(f"  {supp.name}")
        print(f"    Dosage: {supp.dosage}")
        print(f"    Timing: {supp.timing}")
        print(f"    Purpose: {supp.purpose}")
        if supp.notes:
            print(f"    Note: {supp.notes}")
    if protocol.supplementation.general_notes:
        print("\nGeneral Notes:")
        for note in protocol.supplementation.general_notes:
            print(f"  - {note}")

    # Training Program
    print("\n--- Training Program ---")
    print(f"Program: {protocol.training.program_name}")
    print(f"Frequency: {protocol.training.days_per_week} days/week")
    print(f"Rest Days: {', '.join(protocol.training.rest_days)}")
    print(f"\nProgression: {protocol.training.progression_notes}")

    for workout in protocol.training.workouts:
        print(f"\n  {workout.day}: {workout.name} ({workout.duration_min} min)")
        print(f"    Warmup: {workout.warmup}")
        print("    Exercises:")
        for ex in workout.exercises:
            if ex.sets and ex.reps:
                print(f"      - {ex.name}: {ex.sets} x {ex.reps}", end="")
            elif ex.duration_min:
                print(f"      - {ex.name}: {ex.duration_min} min", end="")
            else:
                print(f"      - {ex.name}", end="")
            if ex.rest_sec:
                print(f" (rest: {ex.rest_sec}s)", end="")
            if ex.notes:
                print(f" [{ex.notes}]", end="")
            print()
        print(f"    Cooldown: {workout.cooldown}")

    if protocol.training.general_notes:
        print("\nTraining Notes:")
        for note in protocol.training.general_notes:
            print(f"  - {note}")

    # Requirements Status
    print("\n--- Requirements Status ---")
    all_met = result.requirements_met
    status_icon = "ALL MET" if all_met else "NOT ALL MET"
    print(f"Status: {status_icon}\n")
    for score in result.requirement_scores:
        bar_length = int(score.adherence_percent / 5)
        bar = "=" * bar_length + "-" * (20 - bar_length)
        status = "MET" if score.adherence_percent >= 100 else "NOT MET"
        print(f"{score.requirement_name}: [{status}]")
        print(f"  [{bar}] {score.adherence_percent:.1f}%")
        print(f"  Target: {score.target} | Achieved: {score.achieved}")
        if score.adherence_percent < 100 and score.suggestions:
            print(f"  Suggestion: {score.suggestions}")

    # Goal Optimization Scores
    print("\n--- Goal Optimization ---")
    print(f"Weighted Goal Score: {result.weighted_goal_score:.1f}/100\n")
    for score in result.goal_scores:
        bar_length = int(score.score / 5)
        bar = "=" * bar_length + "-" * (20 - bar_length)
        print(f"{score.goal_name}:")
        print(f"  [{bar}] {score.score:.1f}/100")
        print(f"  {score.reasoning}")
        if score.suggestions:
            print(f"  Suggestion: {score.suggestions}")

    # Devil's Advocate Critiques
    print("\n--- Devil's Advocate Analysis ---")
    print(f"Viability Score: {result.viability_score:.1f}/100\n")

    if result.critiques:
        for critique in result.critiques:
            severity_marker = {"major": "[!!!]", "moderate": "[!!]", "minor": "[!]"}[critique.severity]
            print(f"{severity_marker} {critique.category}")
            print(f"  Issue: {critique.criticism}")
            print(f"  Suggestion: {critique.suggestion}")
            print()

    print(f"\n--- Summary ---")
    print(f"Requirements: {'All Met' if result.requirements_met else 'Some Unmet'}")
    print(f"Goal Score: {result.weighted_goal_score:.1f}/100")
    print(f"Viability Score: {result.viability_score:.1f}/100")
    print(f"Optimization completed in {result.iteration} iterations")


def save_protocol_to_markdown(result: OptimizationResult, config: UserConfig, filepath: Path) -> None:
    """Save the optimized protocol to a markdown file."""
    protocol = result.protocol

    lines = [
        f"# Optimized Daily Protocol",
        f"",
        f"*Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}*",
        f"",
        f"## Overview",
        f"",
        f"| Metric | Value |",
        f"|--------|-------|",
        f"| Requirements | {'All Met' if result.requirements_met else 'Some Unmet'} |",
        f"| Goal Score | {result.weighted_goal_score:.1f}/100 |",
        f"| Viability Score | {result.viability_score:.1f}/100 |",
        f"| Optimization Iterations | {result.iteration} |",
        f"",
    ]

    lines.extend([
        f"---",
        f"",
        f"## Daily Schedule",
        f"",
        f"**Wake Time:** {protocol.schedule.wake_time}  ",
        f"**Sleep Time:** {protocol.schedule.sleep_time}",
        f"",
        f"| Time | Activity |",
        f"|------|----------|",
    ])

    for block in protocol.schedule.schedule:
        lines.append(f"| {block.start_time} - {block.end_time} | {block.activity} |")

    lines.extend([
        f"",
        f"---",
        f"",
        f"## Diet Plan",
        f"",
        f"### Daily Targets",
        f"",
        f"| Nutrient | Target |",
        f"|----------|--------|",
        f"| Calories | {protocol.diet.daily_calories} kcal |",
        f"| Protein | {protocol.diet.protein_target_g}g |",
        f"| Carbohydrates | {protocol.diet.carbs_target_g}g |",
        f"| Fat | {protocol.diet.fat_target_g}g |",
        f"| Hydration | {protocol.diet.hydration_oz} oz |",
        f"",
        f"### Meals",
        f"",
    ])

    for meal in protocol.diet.meals:
        lines.extend([
            f"#### {meal.time} - {meal.name} ({meal.calories} kcal)",
            f"",
            f"**Foods:** {', '.join(meal.foods)}",
            f"",
            f"**Macros:** {meal.protein_g}g protein | {meal.carbs_g}g carbs | {meal.fat_g}g fat",
            f"",
        ])
        if meal.notes:
            lines.append(f"*Note: {meal.notes}*")
            lines.append(f"")

    if protocol.diet.dietary_notes:
        lines.extend([
            f"### Dietary Notes",
            f"",
        ])
        for note in protocol.diet.dietary_notes:
            lines.append(f"- {note}")
        lines.append(f"")

    lines.extend([
        f"---",
        f"",
        f"## Supplementation Plan",
        f"",
        f"| Supplement | Dosage | Timing | Purpose |",
        f"|------------|--------|--------|---------|",
    ])

    for supp in protocol.supplementation.supplements:
        lines.append(f"| {supp.name} | {supp.dosage} | {supp.timing} | {supp.purpose} |")

    if protocol.supplementation.general_notes:
        lines.extend([
            f"",
            f"### Notes",
            f"",
        ])
        for note in protocol.supplementation.general_notes:
            lines.append(f"- {note}")

    lines.extend([
        f"",
        f"---",
        f"",
        f"## Training Program",
        f"",
        f"**Program:** {protocol.training.program_name}  ",
        f"**Frequency:** {protocol.training.days_per_week} days/week  ",
        f"**Rest Days:** {', '.join(protocol.training.rest_days)}",
        f"",
        f"**Progression:** {protocol.training.progression_notes}",
        f"",
    ])

    for workout in protocol.training.workouts:
        lines.extend([
            f"### {workout.day}: {workout.name} ({workout.duration_min} min)",
            f"",
            f"**Warmup:** {workout.warmup}",
            f"",
            f"| Exercise | Sets x Reps | Rest | Notes |",
            f"|----------|-------------|------|-------|",
        ])

        for ex in workout.exercises:
            if ex.sets and ex.reps:
                sets_reps = f"{ex.sets} x {ex.reps}"
            elif ex.duration_min:
                sets_reps = f"{ex.duration_min} min"
            else:
                sets_reps = "-"
            rest = f"{ex.rest_sec}s" if ex.rest_sec else "-"
            notes = ex.notes or "-"
            lines.append(f"| {ex.name} | {sets_reps} | {rest} | {notes} |")

        lines.extend([
            f"",
            f"**Cooldown:** {workout.cooldown}",
            f"",
        ])

    if protocol.training.general_notes:
        lines.extend([
            f"### Training Notes",
            f"",
        ])
        for note in protocol.training.general_notes:
            lines.append(f"- {note}")
        lines.append(f"")

    lines.extend([
        f"---",
        f"",
        f"## Requirements Adherence",
        f"",
        f"| Requirement | Status | Adherence |",
        f"|-------------|--------|-----------|",
    ])

    for score in result.requirement_scores:
        status = "Met" if score.adherence_percent >= 100 else "Not Met"
        lines.append(f"| {score.requirement_name} | {status} | {score.adherence_percent:.1f}% |")

    lines.extend([
        f"",
        f"---",
        f"",
        f"## Goal Optimization",
        f"",
        f"**Weighted Goal Score:** {result.weighted_goal_score:.1f}/100",
        f"",
        f"| Goal | Score | Reasoning |",
        f"|------|-------|-----------|",
    ])

    for score in result.goal_scores:
        reasoning_short = score.reasoning[:80] + "..." if len(score.reasoning) > 80 else score.reasoning
        lines.append(f"| {score.goal_name} | {score.score:.1f}/100 | {reasoning_short} |")

    lines.extend([
        f"",
        f"---",
        f"",
        f"## Devil's Advocate Analysis",
        f"",
        f"**Viability Score:** {result.viability_score:.1f}/100",
        f"",
        f"### Critiques",
        f"",
    ])

    if result.critiques:
        for critique in result.critiques:
            severity_emoji = {"major": "!!!", "moderate": "!!", "minor": "!"}[critique.severity]
            lines.extend([
                f"#### [{severity_emoji}] {critique.category} ({critique.severity.title()})",
                f"",
                f"**Issue:** {critique.criticism}",
                f"",
                f"**Suggestion:** {critique.suggestion}",
                f"",
            ])
    else:
        lines.append("No significant critiques found.")
        lines.append("")

    lines.extend([
        f"---",
        f"",
        f"## User Profile",
        f"",
        f"| Attribute | Value |",
        f"|-----------|-------|",
        f"| Age | {config.personal_info.age} |",
        f"| Weight | {config.personal_info.weight_lbs} lbs |",
        f"| Height | {config.personal_info.height_in} inches |",
        f"| Sex | {config.personal_info.sex} |",
        f"| Fitness Level | {config.personal_info.fitness_level} |",
        f"| Health Conditions | {', '.join(config.personal_info.health_conditions) or 'None'} |",
        f"| Dietary Restrictions | {', '.join(config.personal_info.dietary_restrictions) or 'None'} |",
        f"",
        f"### Goals",
        f"",
    ])

    for goal in config.goals:
        lines.append(f"- **{goal.name}** ({goal.weight:.0%}): {goal.description}")

    lines.extend([
        f"",
        f"### Requirements",
        f"",
    ])

    for req in config.requirements:
        lines.append(f"- {req}")

    # Write to file
    with open(filepath, "w") as f:
        f.write("\n".join(lines))
