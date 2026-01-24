"""Knowledge base management for optimization insights."""

import hashlib
import json
from datetime import datetime
from pathlib import Path
from typing import Literal, Optional

from .models import (
    ConstraintPattern,
    CritiqueInsight,
    GoalInsight,
    KnowledgeBaseData,
    OptimizationInsight,
    ResearchFinding,
    Source,
)


def get_default_kb_path() -> Path:
    """Get the default knowledge base path."""
    return Path(__file__).parent.parent / "knowledge_base.json"


class KnowledgeBaseManager:
    """Manages persistent storage and retrieval of optimization knowledge."""

    def __init__(self, filepath: Optional[Path] = None):
        self.filepath = filepath or get_default_kb_path()
        self.kb = self._load_or_create()

    def _load_or_create(self) -> KnowledgeBaseData:
        """Load existing knowledge base or create new one."""
        if self.filepath.exists():
            try:
                with open(self.filepath) as f:
                    data = json.load(f)
                return KnowledgeBaseData(**data)
            except (json.JSONDecodeError, ValueError) as e:
                print(f"  [!] Knowledge base corrupted, creating new: {e}")
        now = datetime.now().isoformat()
        return KnowledgeBaseData(created_at=now, last_updated=now)

    def save(self) -> None:
        """Persist knowledge base to disk."""
        self.kb.last_updated = datetime.now().isoformat()
        with open(self.filepath, "w") as f:
            json.dump(self.kb.model_dump(), f, indent=2)

    def _generate_id(self, content: str) -> str:
        """Generate MD5 hash ID for deduplication."""
        return hashlib.md5(content.encode()).hexdigest()[:12]

    # -------------------------------------------------------------------------
    # Query Methods
    # -------------------------------------------------------------------------

    def query_research(self, topics: list[str], limit: int = 5) -> list[ResearchFinding]:
        """Query research findings by topic keywords."""
        results = []
        for finding in self.kb.research_findings:
            topic_lower = finding.topic.lower()
            for topic in topics:
                if topic.lower() in topic_lower or topic_lower in topic.lower():
                    results.append(finding)
                    break
        # Sort by use_count and confidence
        confidence_order = {"high": 3, "medium": 2, "low": 1}
        results.sort(
            key=lambda f: (confidence_order.get(f.confidence, 0), f.use_count),
            reverse=True
        )
        return results[:limit]

    def query_optimization_insights(
        self, strategies: Optional[list[str]] = None
    ) -> list[OptimizationInsight]:
        """Query optimization insights, optionally filtered by strategy."""
        if strategies is None:
            return self.kb.optimization_insights[-10:]  # Last 10
        return [
            i for i in self.kb.optimization_insights
            if i.strategy in strategies
        ][-10:]

    def query_constraint_patterns(
        self, requirement_names: list[str]
    ) -> list[ConstraintPattern]:
        """Query constraint patterns involving given requirements."""
        results = []
        for pattern in self.kb.constraint_patterns:
            if (pattern.requirement_a in requirement_names or
                pattern.requirement_b in requirement_names):
                results.append(pattern)
        return results

    def query_goal_insights(self, goal_name: str) -> list[GoalInsight]:
        """Query insights for a specific goal."""
        return [i for i in self.kb.goal_insights if i.goal_name == goal_name]

    def get_knowledge_summary(
        self, goals: list[str], requirements: list[str]
    ) -> str:
        """Generate a summary of relevant knowledge for prompts."""
        sections = []

        # Research findings
        all_topics = goals + requirements
        findings = self.query_research(all_topics, limit=8)
        if findings:
            sections.append("RESEARCH FINDINGS:")
            for f in findings:
                source_info = ""
                if f.sources:
                    source_info = f" (source: {f.sources[0].title or 'research'})"
                sections.append(
                    f"  - [{f.confidence.upper()}] {f.topic}: {f.finding}{source_info}"
                )

        # Optimization insights (what worked/didn't work)
        insights = self.query_optimization_insights()
        winners = [i for i in insights if i.outcome == "won"][-3:]
        if winners:
            sections.append("\nPROVEN STRATEGIES:")
            for i in winners:
                sections.append(f"  - {i.strategy}: {i.reason}")

        # Constraint patterns
        patterns = self.query_constraint_patterns(requirements)
        if patterns:
            sections.append("\nKNOWN CONSTRAINT PATTERNS:")
            for p in patterns:
                status = "resolved" if p.success else "unresolved"
                sections.append(
                    f"  - {p.requirement_a} vs {p.requirement_b} ({p.conflict_type}): "
                    f"{p.resolution_applied} [{status}]"
                )

        # Goal insights
        for goal in goals:
            goal_insights = self.query_goal_insights(goal)
            if goal_insights:
                best = max(goal_insights, key=lambda g: g.optimal_score_achieved)
                sections.append(f"\nBEST APPROACH FOR {goal.upper()}:")
                sections.append(f"  - Elements: {', '.join(best.supporting_elements[:5])}")
                sections.append(f"  - Best score achieved: {best.optimal_score_achieved:.1f}")

        if not sections:
            return ""

        return "\n".join(sections)

    # -------------------------------------------------------------------------
    # Add Methods
    # -------------------------------------------------------------------------

    def add_research_finding(
        self,
        topic: str,
        finding: str,
        confidence: Literal["high", "medium", "low"],
        sources: list[Source],
        applicable_to: list[str],
    ) -> bool:
        """Add research finding. Returns False if duplicate."""
        content_hash = self._generate_id(f"{topic}:{finding}")

        # Check for duplicates
        for existing in self.kb.research_findings:
            if existing.id == content_hash:
                # Update use count and last_used
                existing.use_count += 1
                existing.last_used = datetime.now().isoformat()
                return False  # Duplicate

        now = datetime.now().isoformat()
        self.kb.research_findings.append(ResearchFinding(
            id=content_hash,
            topic=topic,
            finding=finding,
            confidence=confidence,
            sources=sources,
            applicable_to=applicable_to,
            created_at=now,
            last_used=now,
            use_count=1,
        ))
        return True

    def add_optimization_insight(
        self,
        strategy: str,
        outcome: Literal["won", "eliminated"],
        reason: str,
        context: dict,
        requirements_involved: list[str],
        goals_involved: list[str],
        score_delta: float,
    ) -> None:
        """Record outcome from tournament selection."""
        content_hash = self._generate_id(f"{strategy}:{outcome}:{reason[:50]}")
        self.kb.optimization_insights.append(OptimizationInsight(
            id=content_hash,
            strategy=strategy,
            outcome=outcome,
            reason=reason,
            context=context,
            requirements_involved=requirements_involved,
            goals_involved=goals_involved,
            score_delta=score_delta,
            created_at=datetime.now().isoformat(),
        ))

    def add_constraint_pattern(
        self,
        conflict_type: Literal["time", "incompatible", "resource"],
        requirement_a: str,
        requirement_b: str,
        resolution_applied: str,
        success: bool,
        impact_on_goals: str,
    ) -> None:
        """Record a constraint pattern and its resolution."""
        content_hash = self._generate_id(
            f"{requirement_a}:{requirement_b}:{conflict_type}"
        )
        self.kb.constraint_patterns.append(ConstraintPattern(
            id=content_hash,
            conflict_type=conflict_type,
            requirement_a=requirement_a,
            requirement_b=requirement_b,
            resolution_applied=resolution_applied,
            success=success,
            impact_on_goals=impact_on_goals,
            created_at=datetime.now().isoformat(),
        ))

    def add_goal_insight(
        self,
        goal_name: str,
        supporting_elements: list[str],
        optimal_score_achieved: float,
        context: dict,
    ) -> None:
        """Record insight about achieving a goal."""
        content_hash = self._generate_id(
            f"{goal_name}:{optimal_score_achieved}:{','.join(supporting_elements[:3])}"
        )
        self.kb.goal_insights.append(GoalInsight(
            id=content_hash,
            goal_name=goal_name,
            supporting_elements=supporting_elements,
            optimal_score_achieved=optimal_score_achieved,
            context=context,
            created_at=datetime.now().isoformat(),
        ))

    def add_critique_insight(
        self,
        critique_category: str,
        original_issue: str,
        refinement_applied: str,
        improvement_achieved: float,
    ) -> None:
        """Record insight from critique refinement."""
        content_hash = self._generate_id(
            f"{critique_category}:{original_issue[:30]}"
        )
        self.kb.critique_insights.append(CritiqueInsight(
            id=content_hash,
            critique_category=critique_category,
            original_issue=original_issue,
            refinement_applied=refinement_applied,
            improvement_achieved=improvement_achieved,
            created_at=datetime.now().isoformat(),
        ))

    def record_optimization_complete(self, success: bool) -> None:
        """Record that an optimization run completed."""
        self.kb.total_optimizations += 1
        self.save()

    def get_stats(self) -> dict:
        """Get knowledge base statistics."""
        return {
            "total_optimizations": self.kb.total_optimizations,
            "research_findings": len(self.kb.research_findings),
            "optimization_insights": len(self.kb.optimization_insights),
            "constraint_patterns": len(self.kb.constraint_patterns),
            "goal_insights": len(self.kb.goal_insights),
            "critique_insights": len(self.kb.critique_insights),
            "created_at": self.kb.created_at,
            "last_updated": self.kb.last_updated,
        }

    def clear(self) -> None:
        """Clear all knowledge base data."""
        if self.filepath.exists():
            self.filepath.unlink()
        now = datetime.now().isoformat()
        self.kb = KnowledgeBaseData(created_at=now, last_updated=now)
