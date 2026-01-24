"""Protocol optimizer package."""

from .models import (
    UserConfig,
    PersonalInfo,
    Goal,
    Requirement,
    DailyProtocol,
    OptimizationResult,
)
from .knowledge_base import KnowledgeBaseManager
from .client import get_gemini_client
from .config import load_config, save_config, load_or_create_config
from .optimizer import optimize_protocol
from .display import display_final_protocol, save_protocol_to_markdown

__all__ = [
    # Models
    "UserConfig",
    "PersonalInfo",
    "Goal",
    "Requirement",
    "DailyProtocol",
    "OptimizationResult",
    # Knowledge base
    "KnowledgeBaseManager",
    # Client
    "get_gemini_client",
    # Config
    "load_config",
    "save_config",
    "load_or_create_config",
    # Optimizer
    "optimize_protocol",
    # Display
    "display_final_protocol",
    "save_protocol_to_markdown",
]
