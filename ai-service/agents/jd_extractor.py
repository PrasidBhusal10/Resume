import json
import logging
from anthropic import Anthropic
from prompts.templates import JD_EXTRACTION_SYSTEM, JD_EXTRACTION_USER

logger = logging.getLogger(__name__)
client = Anthropic()


def extract_jd(raw_text: str, company: str = "", job_title: str = "") -> dict:
    prompt = JD_EXTRACTION_USER.format(raw_text=raw_text)

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            system=JD_EXTRACTION_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
        )

        raw = response.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        return json.loads(raw)

    except json.JSONDecodeError as e:
        logger.error(f"Claude returned invalid JSON: {e}")
        # Return a safe fallback
        return {
            "required_skills": [],
            "nice_to_have": [],
            "keywords": _extract_simple_keywords(raw_text),
            "ats_keywords": [],
            "seniority": "mid",
            "industry": "technology",
            "responsibilities": [],
            "summary": f"{job_title} position at {company}" if job_title else raw_text[:200],
        }
    except Exception as e:
        logger.error(f"JD extraction failed: {e}")
        raise


def _extract_simple_keywords(text: str) -> list[str]:
    """Cheap fallback: split on whitespace and return longer words."""
    words = text.split()
    return list({w.strip(".,;:()[]") for w in words if len(w) > 5})[:30]
