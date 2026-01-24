"""Configuration management for the protocol optimizer."""

import json
from pathlib import Path
from typing import Optional

from .models import Goal, PersonalInfo, UserConfig


def get_default_config_path() -> Path:
    """Get the default configuration path."""
    return Path(__file__).parent.parent / "user_profile.json"


def load_config(filepath: Optional[Path] = None) -> Optional[UserConfig]:
    """Load user configuration from file."""
    config_path = filepath or get_default_config_path()
    if config_path.exists():
        with open(config_path) as f:
            data = json.load(f)
        return UserConfig(**data)
    return None


def save_config(config: UserConfig, filepath: Optional[Path] = None) -> None:
    """Save user configuration to file."""
    config_path = filepath or get_default_config_path()
    with open(config_path, "w") as f:
        json.dump(config.model_dump(), f, indent=2)
    print(f"\nConfiguration saved to {config_path}")


def setup_wizard() -> UserConfig:
    """Interactive setup wizard for creating user configuration."""
    print("\n" + "=" * 60)
    print("Welcome to the Daily Protocol Optimizer Setup Wizard")
    print("=" * 60)

    # Personal Info
    print("\n--- Personal Information ---")
    age = int(input("Age: "))
    weight_lbs = float(input("Weight (lbs): "))
    height_in = float(input("Height (inches): "))

    print("Sex (male/female/other): ", end="")
    sex = input().strip().lower()
    while sex not in ("male", "female", "other"):
        print("Please enter 'male', 'female', or 'other': ", end="")
        sex = input().strip().lower()

    genetic_background = input("Genetic background (e.g., European, Asian, African): ")

    print("Health conditions (comma-separated, or press Enter for none): ", end="")
    health_input = input().strip()
    health_conditions = [h.strip() for h in health_input.split(",") if h.strip()] if health_input else []

    print("Fitness level (beginner/intermediate/advanced): ", end="")
    fitness_level = input().strip().lower()
    while fitness_level not in ("beginner", "intermediate", "advanced"):
        print("Please enter 'beginner', 'intermediate', or 'advanced': ", end="")
        fitness_level = input().strip().lower()

    print("Dietary restrictions (comma-separated, or press Enter for none): ", end="")
    diet_input = input().strip()
    dietary_restrictions = [d.strip() for d in diet_input.split(",") if d.strip()] if diet_input else []

    personal_info = PersonalInfo(
        age=age,
        weight_lbs=weight_lbs,
        height_in=height_in,
        sex=sex,
        genetic_background=genetic_background,
        health_conditions=health_conditions,
        fitness_level=fitness_level,
        dietary_restrictions=dietary_restrictions,
    )

    # Goals
    print("\n--- Goals ---")
    print("Enter your goals with weights (weights should sum to 1.0)")
    print("Example: mental_clarity, 0.6, Focus and cognitive performance")
    print("Enter an empty line when done.\n")

    goals = []
    total_weight = 0.0
    while True:
        print(f"Goal {len(goals) + 1} (name, weight, description) or empty to finish: ", end="")
        goal_input = input().strip()
        if not goal_input:
            if not goals:
                print("You must enter at least one goal.")
                continue
            if abs(total_weight - 1.0) > 0.01:
                print(f"Warning: Total weight is {total_weight:.2f}, should be 1.0")
                print("Continue anyway? (y/n): ", end="")
                if input().strip().lower() != "y":
                    continue
            break

        parts = [p.strip() for p in goal_input.split(",", 2)]
        if len(parts) != 3:
            print("Please enter: name, weight, description")
            continue

        try:
            name, weight, description = parts
            weight = float(weight)
            goals.append(Goal(name=name, weight=weight, description=description))
            total_weight += weight
            print(f"  Added goal '{name}' (weight: {weight})")
        except ValueError as e:
            print(f"Invalid input: {e}")

    # Requirements
    print("\n--- Requirements ---")
    print("Enter your daily requirements in natural language.")
    print("Examples: '8 hours of sleep', '1 hour of exercise', '30 minutes meditation'")
    print("Enter an empty line when done.\n")

    requirements = []
    while True:
        print(f"Requirement {len(requirements) + 1} (or empty to finish): ", end="")
        req_input = input().strip()
        if not req_input:
            if not requirements:
                print("You must enter at least one requirement.")
                continue
            break
        requirements.append(req_input)
        print(f"  Added: '{req_input}'")

    config = UserConfig(
        personal_info=personal_info,
        goals=goals,
        requirements=requirements,
    )

    save_config(config)
    return config


def edit_config(config: UserConfig) -> UserConfig:
    """Edit existing configuration."""
    print("\n" + "=" * 60)
    print("Edit Configuration")
    print("=" * 60)
    print("\nWhat would you like to edit?")
    print("1. Personal Information")
    print("2. Goals")
    print("3. Requirements")
    print("4. View current config")
    print("5. Exit without changes")

    choice = input("\nChoice (1-5): ").strip()

    if choice == "1":
        print("\nRe-entering personal information...")
        print("\n--- Personal Information ---")
        age = int(input(f"Age [{config.personal_info.age}]: ") or config.personal_info.age)
        weight_lbs = float(input(f"Weight (lbs) [{config.personal_info.weight_lbs}]: ") or config.personal_info.weight_lbs)
        height_in = float(input(f"Height (inches) [{config.personal_info.height_in}]: ") or config.personal_info.height_in)

        print(f"Sex [{config.personal_info.sex}] (male/female/other): ", end="")
        sex = input().strip().lower() or config.personal_info.sex

        genetic_background = input(f"Genetic background [{config.personal_info.genetic_background}]: ") or config.personal_info.genetic_background

        print(f"Health conditions [{', '.join(config.personal_info.health_conditions)}]: ", end="")
        health_input = input().strip()
        health_conditions = [h.strip() for h in health_input.split(",") if h.strip()] if health_input else config.personal_info.health_conditions

        print(f"Fitness level [{config.personal_info.fitness_level}]: ", end="")
        fitness_level = input().strip().lower() or config.personal_info.fitness_level

        print(f"Dietary restrictions [{', '.join(config.personal_info.dietary_restrictions)}]: ", end="")
        diet_input = input().strip()
        dietary_restrictions = [d.strip() for d in diet_input.split(",") if d.strip()] if diet_input else config.personal_info.dietary_restrictions

        config.personal_info = PersonalInfo(
            age=age,
            weight_lbs=weight_lbs,
            height_in=height_in,
            sex=sex,
            genetic_background=genetic_background,
            health_conditions=health_conditions,
            fitness_level=fitness_level,
            dietary_restrictions=dietary_restrictions,
        )

    elif choice == "2":
        print("\nCurrent goals:")
        for g in config.goals:
            print(f"  - {g.name}: {g.weight} ({g.description})")
        print("\nRe-enter all goals:")

        goals = []
        total_weight = 0.0
        while True:
            print(f"Goal {len(goals) + 1} (name, weight, description) or empty to finish: ", end="")
            goal_input = input().strip()
            if not goal_input:
                if goals:
                    break
                print("You must enter at least one goal.")
                continue

            parts = [p.strip() for p in goal_input.split(",", 2)]
            if len(parts) != 3:
                print("Please enter: name, weight, description")
                continue

            try:
                name, weight, description = parts
                weight = float(weight)
                goals.append(Goal(name=name, weight=weight, description=description))
                total_weight += weight
            except ValueError as e:
                print(f"Invalid input: {e}")

        config.goals = goals

    elif choice == "3":
        print("\nCurrent requirements:")
        for r in config.requirements:
            print(f"  - {r}")
        print("\nRe-enter all requirements:")

        requirements = []
        while True:
            print(f"Requirement {len(requirements) + 1} (or empty to finish): ", end="")
            req_input = input().strip()
            if not req_input:
                if requirements:
                    break
                print("You must enter at least one requirement.")
                continue
            requirements.append(req_input)

        config.requirements = requirements

    elif choice == "4":
        print("\nCurrent configuration:")
        print(json.dumps(config.model_dump(), indent=2))
        return edit_config(config)

    elif choice == "5":
        return config

    save_config(config)
    return config


def load_or_create_config(edit_mode: bool = False) -> UserConfig:
    """Load existing config or create new one via setup wizard."""
    config = load_config()
    config_path = get_default_config_path()

    if config is None:
        print("No configuration found. Starting setup wizard...")
        return setup_wizard()

    if edit_mode:
        return edit_config(config)

    print(f"Loaded configuration from {config_path}")
    return config
