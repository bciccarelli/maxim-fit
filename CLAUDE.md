# Claude Code Notes

## Mission

Generate a personalized, evidence-based daily health protocol that the user will actually follow. The protocol must satisfy hard requirements (sleep hours, workout frequency, etc.) while optimizing for weighted goals (muscle gain, longevity, etc.). Success is measured by long-term adherence—a perfect protocol nobody follows is worthless.

## Gemini API

- **Model for grounding + structured output**: `gemini-3-flash-preview` is the only model compatible with both Google Search grounding and structured output. Do not change this model name.

## Project Structure

- `optimizer/` - Main package with modular code
- `routine_optimizer.py` - Entry point (imports from optimizer package)
- `user_profile.json` - User configuration
- `knowledge_base.json` - Persistent research findings and optimization insights
