"""Research functions with Google Search grounding."""

from datetime import datetime

from google import genai

from .models import (
    Goal,
    GroundedResearchResult,
    PersonalInfo,
    Requirement,
    ResearchFinding,
    Source,
    SourceType,
    StoredCriticism,
)
from .knowledge_base import KnowledgeBaseManager


def research_with_google_search(
    client: genai.Client,
    query: str,
    context: str,
    kb_manager: KnowledgeBaseManager,
    max_retries: int = 3,
) -> list[ResearchFinding]:
    """
    Research using Gemini with Google Search grounding.
    Checks cache first, stores new findings. Retries on failure.
    """
    # Check existing knowledge first
    existing = kb_manager.query_research([query], limit=3)
    high_confidence = [f for f in existing if f.confidence == "high"]
    if high_confidence:
        # Update use count
        for f in high_confidence:
            f.use_count += 1
            f.last_used = datetime.now().isoformat()
        return high_confidence

    prompt = f"""Research the following topic and provide evidence-backed findings.

TOPIC: {query}

CONTEXT: {context}

Provide 2-3 key findings with confidence levels based on the strength of evidence.
For each finding, note the sources you found.

Return a JSON object with:
- findings: array of objects with topic, finding, confidence (high/medium/low), and sources
- search_queries_used: array of search queries you would use
"""

    result = None
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model="gemini-3-flash-preview",
                contents=prompt,
                config={
                    "tools": [{"google_search": {}}],
                    "response_mime_type": "application/json",
                    "response_json_schema": GroundedResearchResult.model_json_schema(),
                },
            )

            # Check for empty response
            if not response.text:
                print(f"      [!] Empty response, retry {attempt + 1}/{max_retries}...")
                continue

            result = GroundedResearchResult.model_validate_json(response.text)

            # Check if we actually got findings
            if not result.findings:
                print(f"      [!] No findings in response, retry {attempt + 1}/{max_retries}...")
                continue

            break
        except Exception as e:
            print(f"      [!] Research failed (attempt {attempt + 1}/{max_retries}): {e}")
            if attempt == max_retries - 1:
                return existing

    if result is None or not result.findings:
        return existing

    new_findings = []
    now = datetime.now().isoformat()

    for finding_item in result.findings:
        sources = []
        for src in finding_item.sources:
            sources.append(Source(
                type=SourceType.GOOGLE_SEARCH,
                url=src.url,
                title=src.title,
                snippet=src.snippet,
                retrieved_at=now,
                search_query=query,
            ))

        # If no sources provided, add a Gemini reasoning source
        if not sources:
            sources.append(Source(
                type=SourceType.GEMINI_REASONING,
                retrieved_at=now,
                search_query=query,
            ))

        is_new = kb_manager.add_research_finding(
            topic=finding_item.topic or query,
            finding=finding_item.finding or "",
            confidence=finding_item.confidence,
            sources=sources,
            applicable_to=[query],
        )

        if is_new:
            new_findings.append(kb_manager.kb.research_findings[-1])

    return new_findings if new_findings else existing


def gather_research_for_optimization(
    client: genai.Client,
    goals: list[Goal],
    requirements: list[Requirement],
    personal_info: PersonalInfo,
    kb_manager: KnowledgeBaseManager,
) -> str:
    """Gather research for all relevant topics, return summary for prompts."""
    # Build research topics from goals and requirements
    topics = []

    # Goal-based topics
    for goal in goals:
        topics.append(f"{goal.name} optimization for {personal_info.fitness_level}")
        topics.append(f"{goal.name} evidence-based strategies")

    # Requirement-based topics
    for req in requirements:
        if req.priority == "high":
            topics.append(f"{req.name} best practices")

    # Personal context topics
    if personal_info.health_conditions:
        for condition in personal_info.health_conditions[:2]:
            topics.append(f"exercise with {condition}")

    # Research each topic (limited to avoid too many API calls)
    print("  Gathering research with Google Search grounding...")
    findings_before = len(kb_manager.kb.research_findings)

    for topic in topics[:5]:  # Limit to 5 topics
        print(f"    Researching: {topic[:50]}...")
        findings = research_with_google_search(
            client,
            topic,
            f"For a {personal_info.age}-year-old {personal_info.sex} "
            f"at {personal_info.fitness_level} fitness level",
            kb_manager,
        )
        if findings:
            print(f"      Found {len(findings)} findings")

    findings_after = len(kb_manager.kb.research_findings)
    new_findings = findings_after - findings_before

    # Save knowledge base after gathering research
    if new_findings > 0:
        kb_manager.save()
        print(f"  Added {new_findings} new research findings (total: {findings_after})")

    # Return summary
    goal_names = [g.name for g in goals]
    req_names = [r.name for r in requirements]
    summary = kb_manager.get_knowledge_summary(goal_names, req_names)

    if summary:
        print(f"  Knowledge summary ready ({findings_after} total findings)")
    else:
        if findings_after > 0:
            print(f"  {findings_after} findings cached, but none matched current goals/requirements")
        else:
            print("  No research findings available")

    return summary


def research_criticism(
    client: genai.Client,
    criticism: StoredCriticism,
    kb_manager: KnowledgeBaseManager,
    personal_info: PersonalInfo,
) -> list[ResearchFinding]:
    """Research a specific criticism to find solutions."""
    # Build a targeted query based on the criticism
    query = f"how to address {criticism.category}: {criticism.criticism[:100]}"
    context = (
        f"For a {personal_info.age}-year-old {personal_info.sex}, "
        f"{personal_info.fitness_level} fitness level. "
        f"Looking for evidence-based solutions."
    )

    print(f"    Researching: {criticism.category}...")
    findings = research_with_google_search(client, query, context, kb_manager)

    if findings:
        print(f"      Found {len(findings)} findings")
        kb_manager.save()

    return findings
