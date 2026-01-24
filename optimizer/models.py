"""Pydantic models for the protocol optimizer."""

from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel, Field


# =============================================================================
# User Configuration Models
# =============================================================================

class PersonalInfo(BaseModel):
    age: int
    weight_lbs: float
    height_in: float
    sex: Literal["male", "female", "other"]
    genetic_background: str
    health_conditions: list[str]
    fitness_level: Literal["beginner", "intermediate", "advanced"]
    dietary_restrictions: list[str]


class Goal(BaseModel):
    name: str
    weight: float  # 0.0-1.0, all goals should sum to 1.0
    description: str


class UserConfig(BaseModel):
    personal_info: PersonalInfo
    goals: list[Goal]
    requirements: list[str]  # Natural language requirements
    iterations: int = 3  # Number of optimization iterations


class Requirement(BaseModel):
    name: str
    description: str
    target_value: Optional[float] = None
    unit: str  # e.g., "hours", "times", "minutes"
    priority: Literal["high", "medium", "low"]


class ParsedRequirements(BaseModel):
    requirements: list[Requirement]


# =============================================================================
# Schedule Models
# =============================================================================

class TimeBlock(BaseModel):
    start_time: str  # HH:MM format
    end_time: str
    activity: str
    requirement_satisfied: Optional[str] = None


class DailySchedule(BaseModel):
    wake_time: str
    sleep_time: str
    schedule: list[TimeBlock]


# =============================================================================
# Diet Models
# =============================================================================

class Meal(BaseModel):
    name: str  # e.g., "Breakfast", "Lunch", "Dinner", "Snack"
    time: str  # HH:MM format
    foods: list[str]
    calories: int
    protein_g: float
    carbs_g: float
    fat_g: float
    notes: Optional[str] = None


class DietPlan(BaseModel):
    daily_calories: int
    protein_target_g: float
    carbs_target_g: float
    fat_target_g: float
    meals: list[Meal]
    hydration_oz: float
    dietary_notes: list[str]


# =============================================================================
# Supplementation Models
# =============================================================================

class Supplement(BaseModel):
    name: str
    dosage: str
    timing: str  # e.g., "Morning with breakfast", "30 min before workout"
    purpose: str
    notes: Optional[str] = None


class SupplementationPlan(BaseModel):
    supplements: list[Supplement]
    general_notes: list[str]


# =============================================================================
# Training Models
# =============================================================================

class Exercise(BaseModel):
    name: str
    sets: Optional[int] = None
    reps: Optional[str] = None  # e.g., "8-12" or "to failure"
    duration_min: Optional[int] = None
    rest_sec: Optional[int] = None
    notes: Optional[str] = None


class Workout(BaseModel):
    name: str  # e.g., "Upper Body Strength", "HIIT Cardio"
    day: str  # e.g., "Monday", "Day 1"
    duration_min: int
    exercises: list[Exercise]
    warmup: str
    cooldown: str


class TrainingProgram(BaseModel):
    program_name: str
    days_per_week: int
    workouts: list[Workout]
    rest_days: list[str]
    progression_notes: str
    general_notes: list[str]


# =============================================================================
# Protocol Model
# =============================================================================

class DailyProtocol(BaseModel):
    schedule: DailySchedule
    diet: DietPlan
    supplementation: SupplementationPlan
    training: TrainingProgram


# =============================================================================
# Evaluation Models
# =============================================================================

class AdherenceScore(BaseModel):
    requirement_name: str
    target: float
    achieved: float
    adherence_percent: float
    suggestions: str


class AdherenceEvaluation(BaseModel):
    scores: list[AdherenceScore]
    overall_adherence: float


class GoalScore(BaseModel):
    goal_name: str
    score: float  # 0-100 scale
    reasoning: str
    suggestions: str


class GoalEvaluation(BaseModel):
    scores: list[GoalScore]
    weighted_score: float  # Weighted by goal weights
    overall_assessment: str


class Critique(BaseModel):
    category: str  # e.g., "Sustainability", "Scientific Basis", "Practicality"
    criticism: str
    severity: Literal["minor", "moderate", "major"]
    suggestion: str


class CritiqueEvaluation(BaseModel):
    critiques: list[Critique]
    overall_viability_score: float  # 0-100, how likely to succeed long-term
    strongest_aspects: list[str]
    weakest_aspects: list[str]
    devil_advocate_summary: str


class ScoreAdjustment(BaseModel):
    item_name: str  # requirement or goal name
    original_score: float
    adjusted_score: float
    reasoning: str
    is_accurate: bool


class ScoreVerification(BaseModel):
    adjustments: list[ScoreAdjustment]
    overall_accuracy: Literal["accurate", "slightly_optimistic", "overly_optimistic", "slightly_pessimistic", "overly_pessimistic"]
    verification_notes: str
    recommended_action: Literal["accept", "adjust_and_continue", "regenerate"]


# =============================================================================
# Criticism Storage Models
# =============================================================================

class ResolutionEntry(BaseModel):
    """A single resolution measurement."""
    iteration: int
    score: float  # 0.0 = unresolved, 1.0 = fully resolved
    reasoning: str


class StoredCriticism(BaseModel):
    """A criticism with tracking info."""
    id: str
    category: str
    criticism: str
    severity: Literal["minor", "moderate", "major"]
    suggestion: str
    resolution_score: float = 0.0  # Current resolution (0-1)
    resolution_history: list[ResolutionEntry] = []  # Track trajectory
    research_done: bool = False
    iteration_added: int


class CriticismResolutionScore(BaseModel):
    """Score for how well a criticism was addressed."""
    criticism_id: str
    score: float  # 0.0 = not addressed, 1.0 = fully resolved
    reasoning: str


class CriticismResolutionEvaluation(BaseModel):
    """Evaluation of how well criticisms were addressed."""
    scores: list[CriticismResolutionScore]
    overall_improvement: float  # Average improvement across all criticisms
    detected_tradeoffs: list[str]  # e.g., "Fixing X made Y worse"
    stuck_criticisms: list[str]  # IDs of criticisms that aren't improving


class CriticismStore(BaseModel):
    """Persistent criticism storage."""
    version: str = "1.0"
    created_at: str
    last_updated: str
    protocol_hash: str  # Track which protocol these apply to
    criticisms: list[StoredCriticism] = []
    goal_adherence_history: list[dict] = []  # {iteration, scores}


# =============================================================================
# Optimization Result Model
# =============================================================================

class OptimizationResult(BaseModel):
    protocol: DailyProtocol
    requirement_scores: list[AdherenceScore]
    goal_scores: list[GoalScore]
    critiques: list[Critique]
    requirements_met: bool
    weighted_goal_score: float
    viability_score: float
    iteration: int


# =============================================================================
# Knowledge Base Models
# =============================================================================

class SourceType(str, Enum):
    GOOGLE_SEARCH = "google_search"
    GEMINI_REASONING = "gemini_reasoning"
    OPTIMIZATION_RESULT = "optimization_result"


class Source(BaseModel):
    type: SourceType
    url: Optional[str] = None
    title: Optional[str] = None
    snippet: Optional[str] = None
    retrieved_at: str
    search_query: Optional[str] = None


class ResearchFinding(BaseModel):
    id: str
    topic: str
    finding: str
    confidence: Literal["high", "medium", "low"]
    sources: list[Source]
    applicable_to: list[str]
    created_at: str
    last_used: str
    use_count: int = 0


class OptimizationInsight(BaseModel):
    id: str
    strategy: str
    outcome: Literal["won", "eliminated"]
    reason: str
    context: dict
    requirements_involved: list[str]
    goals_involved: list[str]
    score_delta: float
    created_at: str


class ConstraintPattern(BaseModel):
    id: str
    conflict_type: Literal["time", "incompatible", "resource"]
    requirement_a: str
    requirement_b: str
    resolution_applied: str
    success: bool
    impact_on_goals: str
    created_at: str


class GoalInsight(BaseModel):
    id: str
    goal_name: str
    supporting_elements: list[str]
    optimal_score_achieved: float
    context: dict
    created_at: str


class CritiqueInsight(BaseModel):
    id: str
    critique_category: str
    original_issue: str
    refinement_applied: str
    improvement_achieved: float
    created_at: str


class KnowledgeBaseData(BaseModel):
    version: str = "1.0"
    created_at: str
    last_updated: str
    research_findings: list[ResearchFinding] = []
    optimization_insights: list[OptimizationInsight] = []
    constraint_patterns: list[ConstraintPattern] = []
    goal_insights: list[GoalInsight] = []
    critique_insights: list[CritiqueInsight] = []
    total_optimizations: int = 0


class ResearchSourceItem(BaseModel):
    """A source from Google Search grounding."""
    url: Optional[str] = None
    title: Optional[str] = None
    snippet: Optional[str] = None


class ResearchFindingItem(BaseModel):
    """A single research finding from Gemini."""
    topic: str
    finding: str
    confidence: Literal["high", "medium", "low"] = "medium"
    sources: list[ResearchSourceItem] = []


class GroundedResearchResult(BaseModel):
    """Schema for Gemini structured output with grounding."""
    findings: list[ResearchFindingItem]
    search_queries_used: list[str] = []
