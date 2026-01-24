"""Main optimization function with critique-driven iteration."""

import hashlib
import json
from datetime import datetime
from pathlib import Path
from typing import Optional

from google import genai

from .models import (
    Critique,
    CriticismResolutionScore,
    CriticismStore,
    DailyProtocol,
    GoalScore,
    OptimizationResult,
    ResolutionEntry,
    StoredCriticism,
    UserConfig,
)
from .knowledge_base import KnowledgeBaseManager
from .research import gather_research_for_optimization, research_criticism
from .generation import (
    critique_protocol,
    evaluate_criticism_resolution,
    evaluate_goals,
    evaluate_requirements,
    generate_protocol,
    improve_protocol_for_criticisms,
    parse_requirements,
)
from .display import save_protocol_to_markdown


# =============================================================================
# File Paths
# =============================================================================

CRITICISM_PATH = Path(__file__).parent.parent / "criticisms.json"
SAVED_PROTOCOL_PATH = Path(__file__).parent.parent / "saved_protocol.json"


# =============================================================================
# Protocol Save/Load
# =============================================================================

def get_protocol_hash(protocol: DailyProtocol) -> str:
    """Generate a hash of protocol content for tracking."""
    content = protocol.model_dump_json()
    return hashlib.md5(content.encode()).hexdigest()[:12]


def save_protocol(protocol: DailyProtocol) -> None:
    """Save protocol to file for reuse."""
    with open(SAVED_PROTOCOL_PATH, "w") as f:
        json.dump(protocol.model_dump(), f, indent=2)


def load_saved_protocol() -> Optional[DailyProtocol]:
    """Load previously saved protocol if exists."""
    if SAVED_PROTOCOL_PATH.exists():
        with open(SAVED_PROTOCOL_PATH) as f:
            return DailyProtocol(**json.load(f))
    return None


def clear_saved_protocol() -> bool:
    """Clear saved protocol file. Returns True if file existed."""
    if SAVED_PROTOCOL_PATH.exists():
        SAVED_PROTOCOL_PATH.unlink()
        return True
    return False


# =============================================================================
# Criticism Manager
# =============================================================================

class CriticismManager:
    """Manages persistent criticism storage."""

    def __init__(self):
        self.store = self._load_or_create()

    def _load_or_create(self) -> CriticismStore:
        """Load existing store or create new one."""
        if CRITICISM_PATH.exists():
            with open(CRITICISM_PATH) as f:
                data = json.load(f)
                return CriticismStore(**data)
        return CriticismStore(
            created_at=datetime.now().isoformat(),
            last_updated=datetime.now().isoformat(),
            protocol_hash="",
        )

    def save(self) -> None:
        """Save store to file."""
        self.store.last_updated = datetime.now().isoformat()
        with open(CRITICISM_PATH, "w") as f:
            json.dump(self.store.model_dump(), f, indent=2)

    def clear(self) -> None:
        """Clear all criticisms."""
        self.store = CriticismStore(
            created_at=datetime.now().isoformat(),
            last_updated=datetime.now().isoformat(),
            protocol_hash="",
        )
        if CRITICISM_PATH.exists():
            CRITICISM_PATH.unlink()

    def set_protocol_hash(self, protocol_hash: str) -> None:
        """Update the protocol hash we're tracking criticisms for."""
        # Just update the hash - don't clear history
        # Criticism history is valuable for detecting oscillation and persistent issues
        self.store.protocol_hash = protocol_hash

    def add_criticisms(self, critiques: list[Critique], iteration: int) -> int:
        """Add new criticisms from critique evaluation. Returns count added."""
        added = 0
        for c in critiques:
            # Create unique ID based on content
            content_hash = hashlib.md5(
                f"{c.category}:{c.criticism}".encode()
            ).hexdigest()[:8]

            # Check for duplicates
            exists = any(
                crit.id.endswith(content_hash)
                for crit in self.store.criticisms
            )
            if exists:
                continue

            self.store.criticisms.append(StoredCriticism(
                id=f"crit_{iteration}_{content_hash}",
                category=c.category,
                criticism=c.criticism,
                severity=c.severity,
                suggestion=c.suggestion,
                iteration_added=iteration,
            ))
            added += 1
        return added

    def get_unresolved(self, threshold: float = 0.8, limit: int = 3) -> list[StoredCriticism]:
        """Get criticisms below resolution threshold, prioritized by severity and low score."""
        unresolved = [c for c in self.store.criticisms if c.resolution_score < threshold]

        # Sort by: severity (major first), then resolution score (lowest first)
        severity_order = {"major": 0, "moderate": 1, "minor": 2}
        unresolved.sort(key=lambda c: (severity_order.get(c.severity, 3), c.resolution_score))

        return unresolved[:limit]

    def update_resolution(
        self,
        criticism_id: str,
        score: float,
        reasoning: str,
        iteration: int,
    ) -> None:
        """Update resolution score for a criticism and track history."""
        for crit in self.store.criticisms:
            if crit.id == criticism_id:
                crit.resolution_score = score
                crit.resolution_history.append(ResolutionEntry(
                    iteration=iteration,
                    score=score,
                    reasoning=reasoning,
                ))
                break

    def detect_oscillation(self, criticism_id: str, window: int = 4) -> bool:
        """Detect if a criticism is oscillating (not converging)."""
        for crit in self.store.criticisms:
            if crit.id == criticism_id and len(crit.resolution_history) >= window:
                recent = [e.score for e in crit.resolution_history[-window:]]
                # Check if alternating up/down
                deltas = [recent[i+1] - recent[i] for i in range(len(recent)-1)]
                sign_changes = sum(1 for i in range(len(deltas)-1) if deltas[i] * deltas[i+1] < 0)
                return sign_changes >= 2  # At least 2 direction changes = oscillation
        return False

    def detect_stuck(self, criticism_id: str, min_attempts: int = 3, threshold: float = 0.1) -> bool:
        """Detect if a criticism is stuck (not improving despite attempts)."""
        for crit in self.store.criticisms:
            if crit.id == criticism_id and len(crit.resolution_history) >= min_attempts:
                scores = [e.score for e in crit.resolution_history[-min_attempts:]]
                total_improvement = scores[-1] - scores[0]
                return total_improvement < threshold
        return False

    def get_problematic_criticisms(self) -> dict:
        """Identify criticisms that are oscillating or stuck."""
        problems = {"oscillating": [], "stuck": []}
        for crit in self.store.criticisms:
            if self.detect_oscillation(crit.id):
                problems["oscillating"].append(crit)
            elif self.detect_stuck(crit.id):
                problems["stuck"].append(crit)
        return problems

    def mark_researched(self, criticism_id: str) -> None:
        """Mark a criticism as having been researched."""
        for crit in self.store.criticisms:
            if crit.id == criticism_id:
                crit.research_done = True
                break

    def record_goal_adherence(self, iteration: int, scores: list[GoalScore]) -> None:
        """Track goal adherence over time."""
        self.store.goal_adherence_history.append({
            "iteration": iteration,
            "timestamp": datetime.now().isoformat(),
            "scores": [
                {"goal": s.goal_name, "score": s.score}
                for s in scores
            ],
        })

    def get_stats(self) -> dict:
        """Get statistics about stored criticisms."""
        total = len(self.store.criticisms)
        resolved = sum(1 for c in self.store.criticisms if c.resolution_score >= 0.8)
        by_severity = {}
        for c in self.store.criticisms:
            by_severity[c.severity] = by_severity.get(c.severity, 0) + 1

        # Calculate average resolution
        avg_resolution = 0.0
        if total > 0:
            avg_resolution = sum(c.resolution_score for c in self.store.criticisms) / total

        problems = self.get_problematic_criticisms()

        return {
            "total": total,
            "resolved": resolved,
            "unresolved": total - resolved,
            "avg_resolution": avg_resolution,
            "by_severity": by_severity,
            "oscillating": len(problems["oscillating"]),
            "stuck": len(problems["stuck"]),
            "iterations_tracked": len(self.store.goal_adherence_history),
        }


# =============================================================================
# Iteration Result Saving
# =============================================================================

def save_iteration_result(
    protocol: DailyProtocol,
    config: UserConfig,
    iteration: int,
    goal_scores: list[GoalScore],
    weighted_score: float,
) -> Path:
    """Save current iteration to markdown file."""
    output_path = Path(__file__).parent.parent / f"optimized_protocol_iteration_{iteration}.md"

    # Create a temporary OptimizationResult for the save function
    temp_result = OptimizationResult(
        protocol=protocol,
        requirement_scores=[],
        goal_scores=goal_scores,
        critiques=[],
        requirements_met=True,
        weighted_goal_score=weighted_score,
        viability_score=0.0,
        iteration=iteration,
    )

    save_protocol_to_markdown(temp_result, config, output_path)
    print(f"  Saved: {output_path.name}")
    return output_path


# =============================================================================
# Main Optimization Function
# =============================================================================

def optimize_protocol(
    client: genai.Client,
    config: UserConfig,
    kb_manager: Optional[KnowledgeBaseManager] = None,
) -> OptimizationResult:
    """Critique-driven optimization with persistent criticism tracking."""

    iterations = config.iterations
    kb_manager = kb_manager or KnowledgeBaseManager()
    criticism_manager = CriticismManager()

    print("\n" + "=" * 60)
    print("Starting Protocol Optimization")
    print("=" * 60)
    print(f"Iterations: {iterations} | Critique-Driven | Grounded Research")

    # Show knowledge base stats
    kb_stats = kb_manager.get_stats()
    if kb_stats["total_optimizations"] > 0:
        print(f"\nKnowledge Base: {kb_stats['research_findings']} findings, "
              f"{kb_stats['optimization_insights']} insights from "
              f"{kb_stats['total_optimizations']} prior runs")

    # Parse requirements
    print("\nParsing requirements...")
    requirements = parse_requirements(client, config.requirements, config.personal_info)
    print(f"Parsed {len(requirements)} requirements:")
    for r in requirements:
        print(f"  - {r.name}: {r.target_value} {r.unit} (priority: {r.priority})")

    # =========================================================================
    # Step 1: Load or generate protocol
    # =========================================================================
    print("\n" + "-" * 60)
    print("Step 1: Protocol Initialization")
    print("-" * 60)

    protocol = load_saved_protocol()
    if protocol is None:
        print("\nGenerating initial protocol...")

        # Gather research first
        print("  Gathering evidence-backed research...")
        knowledge_summary = gather_research_for_optimization(
            client, config.goals, requirements, config.personal_info, kb_manager
        )

        protocol = generate_protocol(
            client, requirements, config.personal_info, config.goals,
            knowledge_summary=knowledge_summary
        )
        save_protocol(protocol)
        print("  Initial protocol generated and saved")
    else:
        print("\nLoaded saved protocol from saved_protocol.json")
        # Still gather research for context
        knowledge_summary = kb_manager.get_knowledge_summary(
            [g.name for g in config.goals],
            [r.name for r in requirements]
        )

    # Set protocol hash for criticism tracking
    protocol_hash = get_protocol_hash(protocol)
    criticism_manager.set_protocol_hash(protocol_hash)

    # =========================================================================
    # Step 2: Initial critique and goal adherence
    # =========================================================================
    print("\n" + "-" * 60)
    print("Step 2: Initial Critique")
    print("-" * 60)

    print("\nCritiquing protocol...")
    critique_eval = critique_protocol(
        client, protocol, config.personal_info, config.goals, requirements
    )
    goal_scores, weighted_score = evaluate_goals(
        client, protocol, config.goals, config.personal_info
    )

    new_criticisms = criticism_manager.add_criticisms(critique_eval.critiques, iteration=0)
    criticism_manager.record_goal_adherence(0, goal_scores)
    criticism_manager.save()

    print(f"  Goal adherence: {weighted_score:.1f}%")
    print(f"  Viability score: {critique_eval.overall_viability_score:.1f}/100")
    print(f"  Criticisms found: {len(critique_eval.critiques)} ({new_criticisms} new)")

    if critique_eval.weakest_aspects:
        print(f"  Weakest aspects: {', '.join(critique_eval.weakest_aspects[:2])}")

    # =========================================================================
    # Step 3: Iteration loop
    # =========================================================================
    print("\n" + "-" * 60)
    print(f"Step 3: Optimization Iterations ({iterations})")
    print("-" * 60)

    for i in range(1, iterations + 1):
        print(f"\n--- Iteration {i}/{iterations} ---")

        # Get top unresolved criticisms (below 0.8 resolution)
        top_criticisms = criticism_manager.get_unresolved(threshold=0.8, limit=3)
        if not top_criticisms:
            print("  All criticisms resolved (>= 0.8) - optimization complete")
            break

        print(f"  Targeting {len(top_criticisms)} criticisms:")
        for crit in top_criticisms:
            print(f"    [{crit.severity}] {crit.category} (res: {crit.resolution_score:.2f}): {crit.criticism[:40]}...")

        # Check for problematic criticisms
        problems = criticism_manager.get_problematic_criticisms()
        if problems["oscillating"]:
            print(f"\n  ⚠ Oscillating criticisms detected ({len(problems['oscillating'])}):")
            for crit in problems["oscillating"][:2]:
                print(f"    - {crit.category}: may indicate conflicting requirements")
        if problems["stuck"]:
            print(f"\n  ⚠ Stuck criticisms detected ({len(problems['stuck'])}):")
            for crit in problems["stuck"][:2]:
                print(f"    - {crit.category}: may be a hard constraint")

        # Research criticisms that haven't been researched
        print("\n  Researching criticisms...")
        for crit in top_criticisms:
            if not crit.research_done:
                research_criticism(client, crit, kb_manager, config.personal_info)
                criticism_manager.mark_researched(crit.id)

        # Get updated knowledge summary
        knowledge = kb_manager.get_knowledge_summary(
            [g.name for g in config.goals],
            [r.name for r in requirements]
        )

        # Generate improved protocol
        print("  Improving protocol...")
        protocol = improve_protocol_for_criticisms(
            client, protocol, top_criticisms, requirements,
            config.personal_info, config.goals, knowledge
        )
        save_protocol(protocol)

        # Update protocol hash
        new_hash = get_protocol_hash(protocol)
        if new_hash != protocol_hash:
            protocol_hash = new_hash
            criticism_manager.set_protocol_hash(protocol_hash)

        # Evaluate resolution of ALL criticisms (not just targeted ones)
        print("  Evaluating resolution...")
        all_criticisms = criticism_manager.store.criticisms
        if all_criticisms:
            resolution_eval = evaluate_criticism_resolution(
                client, protocol, all_criticisms, config.personal_info
            )

            # Update resolution scores
            for score in resolution_eval.scores:
                criticism_manager.update_resolution(
                    score.criticism_id,
                    score.score,
                    score.reasoning,
                    iteration=i,
                )

            # Report tradeoffs
            if resolution_eval.detected_tradeoffs:
                print(f"  ⚠ Tradeoffs detected:")
                for tradeoff in resolution_eval.detected_tradeoffs[:2]:
                    print(f"    - {tradeoff}")

        # Re-critique to find new issues
        print("  Critiquing for new issues...")
        critique_eval = critique_protocol(
            client, protocol, config.personal_info, config.goals, requirements
        )
        goal_scores, weighted_score = evaluate_goals(
            client, protocol, config.goals, config.personal_info
        )

        new_criticisms = criticism_manager.add_criticisms(critique_eval.critiques, iteration=i)
        criticism_manager.record_goal_adherence(i, goal_scores)
        criticism_manager.save()

        # Summary
        stats = criticism_manager.get_stats()
        print(f"\n  Goal adherence: {weighted_score:.1f}%")
        print(f"  Viability: {critique_eval.overall_viability_score:.1f}/100")
        print(f"  Avg resolution: {stats['avg_resolution']:.2f} ({stats['resolved']}/{stats['total']} resolved)")
        print(f"  New criticisms: {new_criticisms}")

        # Save iteration
        save_iteration_result(protocol, config, i, goal_scores, weighted_score)

    # =========================================================================
    # Final evaluation
    # =========================================================================
    print("\n" + "-" * 60)
    print("Final Evaluation")
    print("-" * 60)

    req_scores, req_met = evaluate_requirements(client, protocol, requirements)

    # Record final stats
    kb_manager.record_optimization_complete(success=req_met and weighted_score >= 70)

    crit_stats = criticism_manager.get_stats()
    print(f"\n  Requirements met: {'Yes' if req_met else 'No'}")
    print(f"  Final goal adherence: {weighted_score:.1f}%")
    print(f"  Criticisms: {crit_stats['resolved']}/{crit_stats['total']} resolved (avg: {crit_stats['avg_resolution']:.2f})")
    if crit_stats['oscillating'] > 0 or crit_stats['stuck'] > 0:
        print(f"  ⚠ Problem criticisms: {crit_stats['oscillating']} oscillating, {crit_stats['stuck']} stuck")
    print(f"  Knowledge base: {len(kb_manager.kb.research_findings)} findings saved")

    return OptimizationResult(
        protocol=protocol,
        requirement_scores=req_scores,
        goal_scores=goal_scores,
        critiques=critique_eval.critiques,
        requirements_met=req_met,
        weighted_goal_score=weighted_score,
        viability_score=critique_eval.overall_viability_score,
        iteration=iterations,
    )
