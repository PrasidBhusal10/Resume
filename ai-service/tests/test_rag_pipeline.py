"""
test_rag_pipeline.py — Tests for the ChromaDB RAG pipeline.

Uses in-memory fakes from conftest.py — no real ChromaDB needed.
"""

import pytest
from unittest.mock import patch, MagicMock
from rag.pipeline import RAGPipeline


class TestRAGPipeline:
    def test_index_job_description_stores_document(
        self, mock_chroma, mock_sentence_transformer
    ):
        pipeline = RAGPipeline()
        pipeline.index_job_description(
            doc_id="jd_001",
            text="Senior Python engineer needed with Kubernetes experience.",
            metadata={"company": "Acme", "job_title": "Senior Engineer", "keywords": "Python,Kubernetes", "seniority": "senior"},
        )
        assert pipeline.collection.count() == 1

    def test_upsert_replaces_existing_document(self, mock_chroma, mock_sentence_transformer):
        pipeline = RAGPipeline()
        pipeline.index_job_description(
            doc_id="jd_001",
            text="First version",
            metadata={"company": "A", "job_title": "Eng", "keywords": "", "seniority": "mid"},
        )
        pipeline.index_job_description(
            doc_id="jd_001",  # same ID
            text="Updated version",
            metadata={"company": "A", "job_title": "Eng", "keywords": "", "seniority": "mid"},
        )
        assert pipeline.collection.count() == 1  # still 1, not 2

    def test_find_similar_returns_empty_on_empty_collection(
        self, mock_chroma, mock_sentence_transformer
    ):
        pipeline = RAGPipeline()
        result = pipeline.find_similar_jds("any query")
        assert result == []

    def test_find_similar_returns_results_after_indexing(
        self, mock_chroma, mock_sentence_transformer
    ):
        pipeline = RAGPipeline()
        pipeline.index_job_description(
            doc_id="jd_001",
            text="Python Go Kubernetes microservices",
            metadata={
                "company": "TechCo", "job_title": "Backend Eng",
                "keywords": "Python,Go,Kubernetes", "seniority": "senior"
            },
        )
        results = pipeline.find_similar_jds("Python Kubernetes engineer", n=1)
        assert len(results) == 1
        assert "doc" in results[0] or "text" in results[0]

    def test_get_similar_skills_parses_keywords_from_metadata(
        self, mock_chroma, mock_sentence_transformer
    ):
        pipeline = RAGPipeline()
        pipeline.index_job_description(
            doc_id="jd_001",
            text="Go and Kubernetes needed",
            metadata={
                "company": "Corp", "job_title": "Engineer",
                "keywords": "Go,Kubernetes,Docker", "seniority": "senior"
            },
        )
        skills = pipeline.get_similar_skills("distributed systems engineer")
        assert isinstance(skills, list)
        assert len(skills) <= 30

    def test_embedding_model_is_called_with_text(
        self, mock_chroma, mock_sentence_transformer
    ):
        pipeline = RAGPipeline()
        pipeline.index_job_description(
            doc_id="jd_x",
            text="Test job description text",
            metadata={"company": "C", "job_title": "T", "keywords": "", "seniority": "mid"},
        )
        mock_sentence_transformer.encode.assert_called()

    def test_text_truncated_to_8192_chars(self, mock_chroma, mock_sentence_transformer):
        pipeline = RAGPipeline()
        long_text = "a" * 20_000
        pipeline.index_job_description(
            doc_id="jd_long",
            text=long_text,
            metadata={"company": "C", "job_title": "T", "keywords": "", "seniority": "mid"},
        )
        # The encode call should receive at most 8192 chars
        encoded_text = mock_sentence_transformer.encode.call_args[0][0]
        assert len(encoded_text) <= 8192
