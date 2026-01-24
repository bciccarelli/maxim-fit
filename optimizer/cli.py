"""Command-line interface for the protocol optimizer."""

import argparse
from pathlib import Path

from .knowledge_base import KnowledgeBaseManager, get_default_kb_path
from .client import get_gemini_client
from .config import load_or_create_config
from .optimizer import (
    optimize_protocol,
    CriticismManager,
    clear_saved_protocol,
    CRITICISM_PATH,
    SAVED_PROTOCOL_PATH,
)
from .display import display_final_protocol, save_protocol_to_markdown


def main():
    """Main entry point for the optimizer CLI."""
    parser = argparse.ArgumentParser(description="Daily Protocol Optimizer with Gemini")
    parser.add_argument(
        "--edit-config",
        action="store_true",
        help="Edit existing configuration",
    )
    parser.add_argument(
        "--output", "-o",
        type=str,
        default="optimized_protocol.md",
        help="Output markdown file path (default: optimized_protocol.md)",
    )
    parser.add_argument(
        "--show-knowledge",
        action="store_true",
        help="Display knowledge base statistics and exit",
    )
    parser.add_argument(
        "--clear-knowledge",
        action="store_true",
        help="Clear all knowledge base data and exit",
    )
    parser.add_argument(
        "--show-criticisms",
        action="store_true",
        help="Display current criticisms and their status",
    )
    parser.add_argument(
        "--clear-criticisms",
        action="store_true",
        help="Clear criticism history and exit",
    )
    parser.add_argument(
        "--clear-protocol",
        action="store_true",
        help="Clear saved protocol (force regenerate on next run)",
    )
    args = parser.parse_args()

    kb_path = get_default_kb_path()

    # Handle knowledge base commands
    if args.show_knowledge:
        kb_manager = KnowledgeBaseManager()
        stats = kb_manager.get_stats()
        print("\n" + "=" * 60)
        print("Knowledge Base Statistics")
        print("=" * 60)
        print(f"  Total optimizations: {stats['total_optimizations']}")
        print(f"  Research findings:   {stats['research_findings']}")
        print(f"  Optimization insights: {stats['optimization_insights']}")
        print(f"  Constraint patterns: {stats['constraint_patterns']}")
        print(f"  Goal insights:       {stats['goal_insights']}")
        print(f"  Critique insights:   {stats['critique_insights']}")
        print(f"\n  Created: {stats['created_at']}")
        print(f"  Last updated: {stats['last_updated']}")
        print(f"\n  File: {kb_path}")
        return

    if args.clear_knowledge:
        kb_manager = KnowledgeBaseManager()
        kb_manager.clear()
        print("\nKnowledge base cleared.")
        return

    # Handle criticism commands
    if args.show_criticisms:
        criticism_manager = CriticismManager()
        stats = criticism_manager.get_stats()

        print("\n" + "=" * 60)
        print("Criticism Store Statistics")
        print("=" * 60)
        print(f"  Total criticisms:    {stats['total']}")
        print(f"  Resolved (>=0.8):    {stats['resolved']}")
        print(f"  Unresolved:          {stats['unresolved']}")
        print(f"  Avg resolution:      {stats['avg_resolution']:.2f}")
        print(f"  Oscillating:         {stats['oscillating']}")
        print(f"  Stuck:               {stats['stuck']}")
        print(f"  Iterations tracked:  {stats['iterations_tracked']}")

        if stats['by_severity']:
            print("\n  By severity:")
            for severity, count in stats['by_severity'].items():
                print(f"    {severity}: {count}")

        if criticism_manager.store.criticisms:
            print("\n  Current criticisms:")
            for crit in criticism_manager.store.criticisms:
                # Resolution indicator: ✓ (>=0.8), △ (0.4-0.8), ○ (<0.4)
                if crit.resolution_score >= 0.8:
                    status = "✓"
                elif crit.resolution_score >= 0.4:
                    status = "△"
                else:
                    status = "○"
                research = "R" if crit.research_done else " "
                print(f"    [{status}][{research}] [{crit.severity}] {crit.category} ({crit.resolution_score:.2f}): {crit.criticism[:40]}...")

                # Show resolution history if exists
                if crit.resolution_history:
                    history = " → ".join(f"{e.score:.2f}" for e in crit.resolution_history[-4:])
                    print(f"           History: {history}")

        if criticism_manager.store.goal_adherence_history:
            print("\n  Goal adherence history:")
            for entry in criticism_manager.store.goal_adherence_history:
                scores_str = ", ".join(
                    f"{s['goal']}: {s['score']:.0f}"
                    for s in entry['scores']
                )
                print(f"    Iteration {entry['iteration']}: {scores_str}")

        print(f"\n  File: {CRITICISM_PATH}")
        return

    if args.clear_criticisms:
        criticism_manager = CriticismManager()
        criticism_manager.clear()
        print("\nCriticism history cleared.")
        return

    if args.clear_protocol:
        if clear_saved_protocol():
            print(f"\nSaved protocol cleared: {SAVED_PROTOCOL_PATH}")
        else:
            print("\nNo saved protocol found.")
        return

    try:
        # Load or create configuration
        config = load_or_create_config(edit_mode=args.edit_config)

        if args.edit_config:
            print("\nConfiguration updated. Run without --edit-config to optimize.")
            return

        # Initialize Gemini client
        client = get_gemini_client()

        # Initialize knowledge base
        kb_manager = KnowledgeBaseManager()

        # Run optimization
        result = optimize_protocol(client, config, kb_manager=kb_manager)

        # Display results
        display_final_protocol(result)

        # Save to markdown
        output_path = Path(__file__).parent.parent / args.output
        save_protocol_to_markdown(result, config, output_path)
        print(f"\nProtocol saved to: {output_path}")

    except KeyboardInterrupt:
        print("\n\nOptimization cancelled.")
    except ValueError as e:
        print(f"\nError: {e}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
