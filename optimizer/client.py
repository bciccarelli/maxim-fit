"""Gemini client initialization."""

import os

from google import genai


def get_gemini_client() -> genai.Client:
    """Initialize and return Gemini client."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set")
    return genai.Client(api_key=api_key)
