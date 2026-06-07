"""
test_api_endpoints.py — FastAPI endpoint integration tests.

Uses the `client` fixture from conftest.py (httpx.AsyncClient wired directly
to the FastAPI ASGI app). All AI/Claude calls are mocked to avoid network hits.
"""

import json
import pytest
import pytest_asyncio
from unittest.mock import MagicMock, patch


# ── Helpers ───────────────────────────────────────────────────────────────────

VALID_JD_PAYLOAD = {
    "raw_text": (
        "Senior Backend Engineer\n\n"
        "Requirements:\n"
        "• 5+ years Python or Go\n"
        "• Kubernetes, Docker, CI/CD\n"
        "• PostgreSQL, Redis, gRPC\n"
        "• Experience designing microservices at scale\n"
        "• Strong systems design fundamentals"
    ),
    "company": "Acme Corp",
    "job_title": "Senior Backend Engineer",
}

VALID_JD_RESPONSE = {
    "required_skills":  ["Python", "Go", "Kubernetes"],
    "nice_to_have":     ["Rust"],
    "keywords":         ["microservices", "distributed"],
    "ats_keywords":     ["Python", "Kubernetes", "gRPC"],
    "seniority":        "senior",
    "industry":         "technology",
    "responsibilities": ["Build backend services"],
    "summary":          "Senior Backend Engineer",
}

VALID_OPTIMIZE_PAYLOAD = {
    "jd_raw_text": "Python Go Kubernetes microservices",
    "jd_extracted": {
        "required_skills":  ["Python", "Go", "Kubernetes"],
        "nice_to_have":     [],
        "keywords":         ["microservices"],
        "ats_keywords":     ["Python", "Kubernetes"],
        "seniority":        "senior",
        "industry":         "technology",
        "responsibilities": [],
        "summary":          "Senior Backend Eng",
    },
    "sections_to_optimize": [{"section_type": "skills"}],
    "current_sections": [
        {
            "type": "skills",
            "content": {
                "categories": [{"name": "Languages", "items": ["Python"]}]
            },
        }
    ],
}

SKILLS_OPTIMIZE_RESPONSE = {
    "optimized_content": {
        "categories": [{"name": "Languages", "items": ["Python", "Go"]}]
    },
    "ats_before": 45,
    "ats_after":  87,
    "diff_summary": "Added Go",
    "changes": ["Added Go"],
}


def _make_claude_mock(response_dict: dict):
    mock = MagicMock()
    msg = MagicMock()
    msg.content = [MagicMock(text=json.dumps(response_dict))]
    mock.messages.create.return_value = msg
    return mock


# ── Health check ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health_returns_ok(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["service"] == "resume-ai"


# ── POST /api/extract-jd ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_extract_jd_valid_request(client):
    with patch("agents.jd_extractor.client", _make_claude_mock(VALID_JD_RESPONSE)):
        resp = await client.post("/api/extract-jd", json=VALID_JD_PAYLOAD)
    assert resp.status_code == 200
    body = resp.json()
    assert body["seniority"] == "senior"
    assert "Python" in body["required_skills"]


@pytest.mark.asyncio
async def test_extract_jd_too_short_returns_400(client):
    resp = await client.post("/api/extract-jd", json={
        "raw_text": "Short",
        "company":  "Acme",
        "job_title": "Eng",
    })
    assert resp.status_code == 400
    assert "too short" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_extract_jd_missing_raw_text_returns_422(client):
    resp = await client.post("/api/extract-jd", json={"company": "Acme"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_extract_jd_optional_fields_default_to_none(client):
    payload = {"raw_text": VALID_JD_PAYLOAD["raw_text"]}  # no company/job_title
    with patch("agents.jd_extractor.client", _make_claude_mock(VALID_JD_RESPONSE)):
        resp = await client.post("/api/extract-jd", json=payload)
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_extract_jd_returns_all_required_fields(client):
    with patch("agents.jd_extractor.client", _make_claude_mock(VALID_JD_RESPONSE)):
        resp = await client.post("/api/extract-jd", json=VALID_JD_PAYLOAD)
    body = resp.json()
    required = {"required_skills", "nice_to_have", "keywords", "ats_keywords",
                "seniority", "industry", "responsibilities", "summary"}
    assert required.issubset(body.keys())


@pytest.mark.asyncio
async def test_extract_jd_fallback_on_bad_claude_json(client):
    """Even when Claude returns garbled JSON, we should get a 200 with fallback data."""
    with patch("agents.jd_extractor.client", _make_claude_mock.__func__ if False else
               _make_claude_mock({"not": "valid schema"})):
        mock = MagicMock()
        msg = MagicMock()
        msg.content = [MagicMock(text="this is not json at all")]
        mock.messages.create.return_value = msg
        with patch("agents.jd_extractor.client", mock):
            resp = await client.post("/api/extract-jd", json=VALID_JD_PAYLOAD)
    assert resp.status_code == 200
    body = resp.json()
    assert isinstance(body["keywords"], list)


# ── POST /api/optimize ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_optimize_valid_request(client):
    with patch("agents.resume_optimizer.client", _make_claude_mock(SKILLS_OPTIMIZE_RESPONSE)):
        resp = await client.post("/api/optimize", json=VALID_OPTIMIZE_PAYLOAD)
    assert resp.status_code == 200
    body = resp.json()
    assert "suggestions" in body
    assert len(body["suggestions"]) == 1
    assert body["suggestions"][0]["section_type"] == "skills"


@pytest.mark.asyncio
async def test_optimize_returns_ats_scores(client):
    with patch("agents.resume_optimizer.client", _make_claude_mock(SKILLS_OPTIMIZE_RESPONSE)):
        resp = await client.post("/api/optimize", json=VALID_OPTIMIZE_PAYLOAD)
    body = resp.json()
    s = body["suggestions"][0]
    assert 0 <= s["ats_before"] <= 100
    assert 0 <= s["ats_after"]  <= 100
    assert s["ats_after"] >= s["ats_before"]


@pytest.mark.asyncio
async def test_optimize_empty_sections_to_optimize_returns_400(client):
    payload = {**VALID_OPTIMIZE_PAYLOAD, "sections_to_optimize": []}
    resp = await client.post("/api/optimize", json=payload)
    assert resp.status_code == 400
    assert "section" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_optimize_missing_current_sections_returns_400(client):
    payload = {**VALID_OPTIMIZE_PAYLOAD, "current_sections": []}
    resp = await client.post("/api/optimize", json=payload)
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_optimize_missing_body_fields_returns_422(client):
    resp = await client.post("/api/optimize", json={"jd_raw_text": "only this"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_optimize_overall_score_in_response(client):
    with patch("agents.resume_optimizer.client", _make_claude_mock(SKILLS_OPTIMIZE_RESPONSE)):
        resp = await client.post("/api/optimize", json=VALID_OPTIMIZE_PAYLOAD)
    body = resp.json()
    assert "overall_score" in body
    assert isinstance(body["overall_score"], (int, float))
    assert 0 <= body["overall_score"] <= 100


@pytest.mark.asyncio
async def test_optimize_score_message_is_string(client):
    with patch("agents.resume_optimizer.client", _make_claude_mock(SKILLS_OPTIMIZE_RESPONSE)):
        resp = await client.post("/api/optimize", json=VALID_OPTIMIZE_PAYLOAD)
    body = resp.json()
    assert isinstance(body["score_message"], str)
    assert len(body["score_message"]) > 0


# ── OpenAPI schema ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_openapi_schema_reachable(client):
    resp = await client.get("/openapi.json")
    assert resp.status_code == 200
    schema = resp.json()
    assert "/api/extract-jd" in schema["paths"]
    assert "/api/optimize"   in schema["paths"]
    assert "/health"          in schema["paths"]


@pytest.mark.asyncio
async def test_docs_endpoint_reachable(client):
    resp = await client.get("/docs")
    assert resp.status_code == 200
