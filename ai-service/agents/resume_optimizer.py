"""
Resume Optimizer Agent — routes each section to a specialized Claude prompt,
then assembles the results into a structured OptimizeResponse.
"""

import json
import logging
from anthropic import Anthropic
from models.schemas import (
    OptimizeRequest, OptimizeResponse, SectionSuggestion, CurrentSection
)
from prompts.templates import (
    SKILLS_OPTIMIZATION_SYSTEM,  SKILLS_OPTIMIZATION_USER,
    EXPERIENCE_OPTIMIZATION_SYSTEM, EXPERIENCE_OPTIMIZATION_USER,
    SUMMARY_OPTIMIZATION_SYSTEM,  SUMMARY_OPTIMIZATION_USER,
)

logger = logging.getLogger(__name__)
client = Anthropic()

# Map section type → (system_prompt, user_prompt_template, required_keys)
SECTION_HANDLERS = {
    "skills":     (SKILLS_OPTIMIZATION_SYSTEM,     SKILLS_OPTIMIZATION_USER),
    "experience": (EXPERIENCE_OPTIMIZATION_SYSTEM, EXPERIENCE_OPTIMIZATION_USER),
    "summary":    (SUMMARY_OPTIMIZATION_SYSTEM,    SUMMARY_OPTIMIZATION_USER),
}


def _call_claude(system: str, user: str, max_tokens: int = 4096) -> dict:
    """Call Claude and parse JSON response."""
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    raw = response.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw)


def _optimize_skills(section: CurrentSection, req: OptimizeRequest) -> SectionSuggestion:
    extracted = req.jd_extracted
    user_prompt = SKILLS_OPTIMIZATION_USER.format(
        current_content=json.dumps(section.content, indent=2),
        jd_keywords=", ".join(extracted.get("keywords", [])),
        required_skills=", ".join(extracted.get("required_skills", [])),
    )
    result = _call_claude(SKILLS_OPTIMIZATION_SYSTEM, user_prompt)
    return SectionSuggestion(
        section_type="skills",
        original=section.content,
        suggested=result["optimized_content"],
        diff_summary=result.get("diff_summary", ""),
        ats_before=result.get("ats_before", 0),
        ats_after=result.get("ats_after", 0),
        changes=result.get("changes", []),
    )


def _optimize_experience(section: CurrentSection, req: OptimizeRequest) -> SectionSuggestion:
    extracted = req.jd_extracted
    user_prompt = EXPERIENCE_OPTIMIZATION_USER.format(
        current_content=json.dumps(section.content, indent=2),
        jd_raw_text=req.jd_raw_text[:3000],  # Trim to avoid token limits
        ats_keywords=", ".join(extracted.get("ats_keywords", [])[:20]),
    )
    result = _call_claude(EXPERIENCE_OPTIMIZATION_SYSTEM, user_prompt, max_tokens=6000)
    return SectionSuggestion(
        section_type="experience",
        original=section.content,
        suggested=result["optimized_content"],
        diff_summary=result.get("diff_summary", ""),
        ats_before=result.get("ats_before", 0),
        ats_after=result.get("ats_after", 0),
        changes=result.get("changes", []),
    )


def _optimize_summary(section: CurrentSection, req: OptimizeRequest) -> SectionSuggestion:
    extracted = req.jd_extracted
    # Find job title/company from first JD line if available
    lines = req.jd_raw_text.strip().splitlines()
    job_title = lines[0][:100] if lines else "the role"

    user_prompt = SUMMARY_OPTIMIZATION_USER.format(
        current_text=section.content.get("text", ""),
        job_title=job_title,
        company="",
        jd_summary=extracted.get("summary", req.jd_raw_text[:500]),
    )
    result = _call_claude(SUMMARY_OPTIMIZATION_SYSTEM, user_prompt)
    return SectionSuggestion(
        section_type="summary",
        original=section.content,
        suggested=result["optimized_content"],
        diff_summary=result.get("diff_summary", ""),
        ats_before=result.get("ats_before", 0),
        ats_after=result.get("ats_after", 0),
        changes=result.get("changes", []),
    )


def _optimize_generic(section: CurrentSection, req: OptimizeRequest) -> SectionSuggestion:
    """Fallback optimizer for unsupported section types."""
    system = "You are a resume optimization expert. Return optimized JSON matching input structure."
    user = (
        f"Optimize this resume section to match the job description.\n\n"
        f"Section type: {section.type}\n"
        f"Current content:\n{json.dumps(section.content, indent=2)}\n\n"
        f"Key JD keywords: {', '.join(req.jd_extracted.get('keywords', [])[:15])}\n\n"
        f"Return JSON:\n"
        f'{{"optimized_content": {{...}}, "ats_before": 0, "ats_after": 0, '
        f'"diff_summary": "...", "changes": []}}'
    )
    try:
        result = _call_claude(system, user)
        return SectionSuggestion(
            section_type=section.type,
            original=section.content,
            suggested=result.get("optimized_content", section.content),
            diff_summary=result.get("diff_summary", ""),
            ats_before=result.get("ats_before", 0),
            ats_after=result.get("ats_after", 0),
            changes=result.get("changes", []),
        )
    except Exception:
        return SectionSuggestion(
            section_type=section.type,
            original=section.content,
            suggested=section.content,
            diff_summary="No optimization performed",
            ats_before=50,
            ats_after=50,
            changes=[],
        )


OPTIMIZER_MAP = {
    "skills":     _optimize_skills,
    "experience": _optimize_experience,
    "summary":    _optimize_summary,
}


def optimize_resume(req: OptimizeRequest) -> OptimizeResponse:
    """
    Main entry point. Dispatches each requested section to its specialist,
    collects results, and calculates overall score.
    """
    # Build lookup from type → current section content
    section_map = {s.type: s for s in req.current_sections}

    suggestions: list[SectionSuggestion] = []
    total_before = total_after = 0

    for sec_req in req.sections_to_optimize:
        stype = sec_req.section_type
        current = section_map.get(stype)
        if not current:
            logger.warning(f"Section '{stype}' not found in resume, skipping")
            continue

        try:
            optimizer = OPTIMIZER_MAP.get(stype, _optimize_generic)
            suggestion = optimizer(current, req)
            suggestions.append(suggestion)
            total_before += suggestion.ats_before
            total_after  += suggestion.ats_after
        except Exception as e:
            logger.error(f"Failed to optimize section '{stype}': {e}")
            # Include passthrough so the UI still shows something
            suggestions.append(SectionSuggestion(
                section_type=stype,
                original=current.content,
                suggested=current.content,
                diff_summary="Optimization failed — original preserved",
                ats_before=50, ats_after=50, changes=[],
            ))

    n = len(suggestions) or 1
    overall_before = total_before // n
    overall_after  = total_after  // n

    score_message = (
        f"ATS match improved from {overall_before}% to {overall_after}%. "
        + ("Excellent match!" if overall_after >= 80
           else "Good progress!" if overall_after >= 60
           else "More tailoring recommended.")
    )

    return OptimizeResponse(
        suggestions=suggestions,
        overall_score=overall_after,
        score_message=score_message,
    )
