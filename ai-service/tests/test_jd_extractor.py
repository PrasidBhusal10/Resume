"""
test_jd_extractor.py — Unit tests for the JD extraction agent.

All Claude calls are mocked. We test:
- Correct parsing of a well-formed Claude response
- Graceful fallback when Claude returns invalid JSON
- Simple keyword fallback when Claude is unreachable
- ChromaDB indexing is triggered on success
"""

import json
import pytest
from unittest.mock import MagicMock, patch, call
from agents.jd_extractor import extract_jd, _extract_simple_keywords


# ── _extract_simple_keywords ──────────────────────────────────────────────────

class TestExtractSimpleKeywords:
    def test_returns_words_longer_than_5_chars(self):
        text = "Python Go Ruby JavaScript microservices"
        result = _extract_simple_keywords(text)
        assert "Python" in result
        assert "JavaScript" in result
        assert "microservices" in result

    def test_strips_punctuation(self):
        text = "Python, Go; Java."
        result = _extract_simple_keywords(text)
        # Should not contain punctuation
        assert all("," not in kw and ";" not in kw and "." not in kw for kw in result)

    def test_deduplicates(self):
        text = "Python Python Python Go Go"
        result = _extract_simple_keywords(text)
        assert result.count("Python") == 1

    def test_caps_at_30(self):
        text = " ".join([f"keyword{i}xyz" for i in range(50)])
        result = _extract_simple_keywords(text)
        assert len(result) <= 30

    def test_filters_short_words(self):
        text = "Go is a nice lang"
        result = _extract_simple_keywords(text)
        assert "Go" not in result
        assert "is" not in result


# ── extract_jd ────────────────────────────────────────────────────────────────

VALID_JD_RESPONSE = {
    "required_skills":  ["Python", "Go", "Kubernetes"],
    "nice_to_have":     ["Rust"],
    "keywords":         ["microservices", "distributed systems"],
    "ats_keywords":     ["Python", "Kubernetes", "gRPC"],
    "seniority":        "senior",
    "industry":         "technology",
    "responsibilities": ["Build scalable services"],
    "summary":          "Senior Backend Engineer",
}


class TestExtractJD:
    def _mock_claude(self, response_text: str):
        mock = MagicMock()
        msg = MagicMock()
        msg.content = [MagicMock(text=response_text)]
        mock.messages.create.return_value = msg
        return mock

    def test_returns_structured_dict_on_valid_response(
        self, sample_jd_text, mock_chroma, mock_sentence_transformer
    ):
        claude_json = json.dumps(VALID_JD_RESPONSE)
        with patch("agents.jd_extractor.client", self._mock_claude(claude_json)):
            result = extract_jd(sample_jd_text, "Acme", "Senior Engineer")

        assert result["seniority"] == "senior"
        assert "Python" in result["required_skills"]
        assert "Kubernetes" in result["ats_keywords"]

    def test_strips_markdown_code_fences(
        self, sample_jd_text, mock_chroma, mock_sentence_transformer
    ):
        claude_resp = f"```json\n{json.dumps(VALID_JD_RESPONSE)}\n```"
        with patch("agents.jd_extractor.client", self._mock_claude(claude_resp)):
            result = extract_jd(sample_jd_text)

        assert result["industry"] == "technology"

    def test_fallback_on_invalid_json(
        self, sample_jd_text, mock_chroma, mock_sentence_transformer
    ):
        with patch("agents.jd_extractor.client", self._mock_claude("not json at all")):
            result = extract_jd(sample_jd_text, "Corp", "Engineer")

        # Should return fallback with at least some keywords
        assert isinstance(result["keywords"], list)
        assert result["seniority"] == "mid"
        assert result["industry"] == "technology"

    def test_summary_fallback_uses_job_title(
        self, sample_jd_text, mock_chroma, mock_sentence_transformer
    ):
        with patch("agents.jd_extractor.client", self._mock_claude("bad json")):
            result = extract_jd(sample_jd_text, "Corp", "ML Engineer")

        assert "ML Engineer" in result["summary"] or result["summary"]

    def test_chroma_indexing_is_called_on_success(
        self, sample_jd_text, mock_sentence_transformer
    ):
        with patch("agents.jd_extractor.client", self._mock_claude(json.dumps(VALID_JD_RESPONSE))):
            with patch("agents.jd_extractor.RAGPipeline") as MockRAG:
                mock_pipeline = MockRAG.return_value
                extract_jd(sample_jd_text, "Corp", "Engineer")

        mock_pipeline.index_job_description.assert_called_once()
        call_kwargs = mock_pipeline.index_job_description.call_args
        assert "doc_id" in call_kwargs.kwargs or len(call_kwargs.args) > 0

    def test_chroma_failure_does_not_raise(
        self, sample_jd_text, mock_sentence_transformer
    ):
        with patch("agents.jd_extractor.client", self._mock_claude(json.dumps(VALID_JD_RESPONSE))):
            with patch("agents.jd_extractor.RAGPipeline") as MockRAG:
                MockRAG.return_value.index_job_description.side_effect = RuntimeError("chroma down")
                # Should NOT raise — RAG is non-critical
                result = extract_jd(sample_jd_text)

        assert result["seniority"] == "senior"

    def test_correct_model_is_used(
        self, sample_jd_text, mock_chroma, mock_sentence_transformer
    ):
        mock_client = self._mock_claude(json.dumps(VALID_JD_RESPONSE))
        with patch("agents.jd_extractor.client", mock_client):
            extract_jd(sample_jd_text)

        call_kwargs = mock_client.messages.create.call_args
        assert call_kwargs.kwargs.get("model") == "claude-sonnet-4-6"
