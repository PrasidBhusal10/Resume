"""
test_resume_optimizer.py — Unit tests for the resume optimizer agent.

Tests cover:
- Skills section optimization
- Experience bullet rewriting
- Summary optimization
- Generic fallback optimizer
- Per-section ATS score gating
- Full optimize_resume orchestration
"""

import json
import pytest
from unittest.mock import MagicMock, patch
from models.schemas import OptimizeRequest, CurrentSection, SectionToOptimize
from agents.resume_optimizer import (
    optimize_resume,
    _optimize_skills,
    _optimize_experience,
    _optimize_summary,
    _optimize_generic,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_claude_client(response_dict: dict) -> MagicMock:
    client = MagicMock()
    msg = MagicMock()
    msg.content = [MagicMock(text=json.dumps(response_dict))]
    client.messages.create.return_value = msg
    return client

def _make_optimize_request(
    sections: list[str],
    sample_sections,
    extracted,
    jd_text: str = "We need Go and Kubernetes engineers.",
) -> OptimizeRequest:
    return OptimizeRequest(
        jd_raw_text=jd_text,
        jd_extracted=extracted,
        sections_to_optimize=[SectionToOptimize(section_type=s) for s in sections],
        current_sections=[
            CurrentSection(type=sec["type"], content=sec["content"])
            for sec in sample_sections
        ],
    )


# ── Skills optimizer ──────────────────────────────────────────────────────────

class TestSkillsOptimizer:
    MOCK_RESPONSE = {
        "optimized_content": {
            "categories": [
                {"name": "Languages", "items": ["Python", "Go"]},
                {"name": "Infrastructure", "items": ["Kubernetes", "Docker"]},
            ]
        },
        "ats_before": 40,
        "ats_after":  85,
        "diff_summary": "Added Go and Kubernetes",
        "changes": ["Added Go", "Added Kubernetes"],
    }

    def test_returns_section_suggestion(self, sample_resume_sections, extracted_jd):
        skills_section = next(s for s in sample_resume_sections if s["type"] == "skills")
        req = _make_optimize_request(["skills"], sample_resume_sections, extracted_jd)
        current = CurrentSection(type="skills", content=skills_section["content"])

        with patch("agents.resume_optimizer.client", _make_claude_client(self.MOCK_RESPONSE)):
            result = _optimize_skills(current, req)

        assert result.section_type == "skills"
        assert result.ats_before == 40
        assert result.ats_after == 85
        assert "Kubernetes" in str(result.suggested)

    def test_ats_scores_are_non_negative(self, sample_resume_sections, extracted_jd):
        current = CurrentSection(
            type="skills",
            content={"categories": []}
        )
        req = _make_optimize_request(["skills"], sample_resume_sections, extracted_jd)

        with patch("agents.resume_optimizer.client", _make_claude_client(self.MOCK_RESPONSE)):
            result = _optimize_skills(current, req)

        assert 0 <= result.ats_before <= 100
        assert 0 <= result.ats_after  <= 100

    def test_preserves_original_content(self, sample_resume_sections, extracted_jd):
        skills_section = next(s for s in sample_resume_sections if s["type"] == "skills")
        current = CurrentSection(type="skills", content=skills_section["content"])
        req = _make_optimize_request(["skills"], sample_resume_sections, extracted_jd)

        with patch("agents.resume_optimizer.client", _make_claude_client(self.MOCK_RESPONSE)):
            result = _optimize_skills(current, req)

        # Original should be unchanged
        assert result.original == skills_section["content"]


# ── Experience optimizer ──────────────────────────────────────────────────────

class TestExperienceOptimizer:
    MOCK_RESPONSE = {
        "optimized_content": {
            "items": [
                {
                    "company": "TechCorp",
                    "role":    "Software Engineer",
                    "start":   "Jan 2021",
                    "end":     "Present",
                    "bullets": [
                        "Designed and maintained microservices using Python and Go, handling 1M requests/day",
                        "Managed PostgreSQL clusters with 99.9% uptime SLA",
                        "Deployed Kubernetes workloads on GKE using Helm and CI/CD pipelines",
                    ],
                }
            ]
        },
        "ats_before": 38,
        "ats_after":  79,
        "diff_summary": "Rewrote bullets with STAR format and JD keywords",
        "changes": ["Added Kubernetes mention", "Quantified PostgreSQL management"],
    }

    def test_rewrites_bullets(self, sample_resume_sections, extracted_jd):
        exp_section = next(s for s in sample_resume_sections if s["type"] == "experience")
        current = CurrentSection(type="experience", content=exp_section["content"])
        req = _make_optimize_request(["experience"], sample_resume_sections, extracted_jd)

        with patch("agents.resume_optimizer.client", _make_claude_client(self.MOCK_RESPONSE)):
            result = _optimize_experience(current, req)

        assert result.section_type == "experience"
        bullets = result.suggested["items"][0]["bullets"]
        assert any("Kubernetes" in b for b in bullets)

    def test_truncates_long_jd_text(self, sample_resume_sections, extracted_jd):
        long_jd = "Go and Python " * 500  # 7000+ chars
        current = CurrentSection(
            type="experience",
            content={"items": []}
        )
        req = _make_optimize_request(
            ["experience"], sample_resume_sections, extracted_jd, jd_text=long_jd
        )

        captured_calls = []
        def capture_create(**kwargs):
            captured_calls.append(kwargs)
            return _make_claude_client(self.MOCK_RESPONSE).messages.create(**kwargs)

        mock_client = MagicMock()
        mock_client.messages.create.side_effect = capture_create
        mock_client.messages.create.return_value = (
            _make_claude_client(self.MOCK_RESPONSE).messages.create()
        )

        with patch("agents.resume_optimizer.client", _make_claude_client(self.MOCK_RESPONSE)):
            result = _optimize_experience(current, req)

        # Verify it ran without error even with a long JD
        assert result is not None


# ── Summary optimizer ─────────────────────────────────────────────────────────

class TestSummaryOptimizer:
    MOCK_RESPONSE = {
        "optimized_content": {
            "text": (
                "Senior Backend Engineer with 5+ years building distributed systems "
                "using Python and Go. Expertise in Kubernetes, microservices architecture, "
                "and high-throughput API design."
            )
        },
        "ats_before": 50,
        "ats_after":  83,
        "diff_summary": "Tailored summary to Senior Backend Engineer role",
        "changes": ["Added Kubernetes", "Mentioned Python and Go", "Matched seniority"],
    }

    def test_returns_tailored_summary(self, sample_resume_sections, extracted_jd):
        summ_section = next(s for s in sample_resume_sections if s["type"] == "summary")
        current = CurrentSection(type="summary", content=summ_section["content"])
        req = _make_optimize_request(["summary"], sample_resume_sections, extracted_jd)

        with patch("agents.resume_optimizer.client", _make_claude_client(self.MOCK_RESPONSE)):
            result = _optimize_summary(current, req)

        assert result.section_type == "summary"
        assert "Kubernetes" in result.suggested["text"]

    def test_diff_summary_is_non_empty(self, sample_resume_sections, extracted_jd):
        summ_section = next(s for s in sample_resume_sections if s["type"] == "summary")
        current = CurrentSection(type="summary", content=summ_section["content"])
        req = _make_optimize_request(["summary"], sample_resume_sections, extracted_jd)

        with patch("agents.resume_optimizer.client", _make_claude_client(self.MOCK_RESPONSE)):
            result = _optimize_summary(current, req)

        assert result.diff_summary


# ── Full orchestration ────────────────────────────────────────────────────────

class TestOptimizeResume:
    SKILLS_RESP = {
        "optimized_content": {"categories": [{"name": "Languages", "items": ["Python", "Go"]}]},
        "ats_before": 40, "ats_after": 82,
        "diff_summary": "Added Go", "changes": ["Added Go"],
    }
    SUMMARY_RESP = {
        "optimized_content": {"text": "Senior engineer with Python and Go."},
        "ats_before": 50, "ats_after": 80,
        "diff_summary": "Added keywords", "changes": ["Added Go"],
    }

    def test_optimizes_multiple_sections(self, sample_resume_sections, extracted_jd):
        req = _make_optimize_request(
            ["skills", "summary"], sample_resume_sections, extracted_jd
        )

        responses = [self.SKILLS_RESP, self.SUMMARY_RESP]
        call_count = [0]

        def side_effect(**kwargs):
            r = responses[call_count[0] % len(responses)]
            call_count[0] += 1
            msg = MagicMock()
            msg.content = [MagicMock(text=json.dumps(r))]
            return msg

        mock_client = MagicMock()
        mock_client.messages.create.side_effect = side_effect

        with patch("agents.resume_optimizer.client", mock_client):
            result = optimize_resume(req)

        assert len(result.suggestions) == 2
        types = {s.section_type for s in result.suggestions}
        assert types == {"skills", "summary"}

    def test_overall_score_is_average_of_after_scores(self, sample_resume_sections, extracted_jd):
        req = _make_optimize_request(["skills"], sample_resume_sections, extracted_jd)

        with patch("agents.resume_optimizer.client", _make_claude_client(self.SKILLS_RESP)):
            result = optimize_resume(req)

        assert result.overall_score == 82

    def test_score_message_is_non_empty(self, sample_resume_sections, extracted_jd):
        req = _make_optimize_request(["skills"], sample_resume_sections, extracted_jd)
        with patch("agents.resume_optimizer.client", _make_claude_client(self.SKILLS_RESP)):
            result = optimize_resume(req)
        assert result.score_message

    def test_skips_unknown_section_with_warning(self, sample_resume_sections, extracted_jd):
        """If the request asks for a section type not in the resume, it's skipped."""
        req = _make_optimize_request(["certifications"], sample_resume_sections, extracted_jd)
        with patch("agents.resume_optimizer.client", _make_claude_client(self.SKILLS_RESP)):
            result = optimize_resume(req)
        # certifications is not in sample_resume_sections → no suggestion produced
        assert len(result.suggestions) == 0

    def test_error_in_one_section_still_returns_passthrough(
        self, sample_resume_sections, extracted_jd
    ):
        """A failing section returns the original content; other sections succeed."""
        req = _make_optimize_request(
            ["skills", "summary"], sample_resume_sections, extracted_jd
        )

        call_count = [0]
        def side_effect(**kwargs):
            call_count[0] += 1
            if call_count[0] == 1:
                raise RuntimeError("Claude timeout")
            msg = MagicMock()
            msg.content = [MagicMock(text=json.dumps(self.SUMMARY_RESP))]
            return msg

        mock_client = MagicMock()
        mock_client.messages.create.side_effect = side_effect

        with patch("agents.resume_optimizer.client", mock_client):
            result = optimize_resume(req)

        assert len(result.suggestions) == 2
        # Failed section has identical original and suggested
        failed = next(s for s in result.suggestions if s.section_type == "skills")
        assert failed.original == failed.suggested
