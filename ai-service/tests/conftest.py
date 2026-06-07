"""
conftest.py — Shared fixtures for all pytest tests.

Key design decisions:
- Claude API calls are always mocked (no real API key needed in CI).
- ChromaDB is replaced with an in-memory stub.
- The FastAPI app is tested via httpx.AsyncClient (no real server).
"""

import json
import pytest
import pytest_asyncio
from unittest.mock import MagicMock, AsyncMock, patch
from httpx import AsyncClient, ASGITransport


# ── Sample data ───────────────────────────────────────────────────────────────

@pytest.fixture
def sample_jd_text():
    return """
    Senior Software Engineer — Backend

    Requirements:
    • 5+ years Python or Go
    • Kubernetes, Docker, CI/CD
    • PostgreSQL, Redis
    • REST API design, gRPC
    • Experience with microservices
    """

@pytest.fixture
def sample_resume_sections():
    return [
        {
            "type": "skills",
            "content": {
                "categories": [
                    {"name": "Languages", "items": ["Python", "JavaScript"]},
                    {"name": "Databases", "items": ["MySQL"]},
                ]
            },
        },
        {
            "type": "experience",
            "content": {
                "items": [
                    {
                        "company":  "TechCorp",
                        "role":     "Software Engineer",
                        "start":    "Jan 2021",
                        "end":      "Present",
                        "bullets":  [
                            "Built REST APIs serving 1M requests/day",
                            "Managed MySQL databases",
                        ],
                    }
                ]
            },
        },
        {
            "type": "summary",
            "content": {"text": "Software engineer with 5 years of experience."},
        },
    ]

@pytest.fixture
def extracted_jd():
    return {
        "required_skills":  ["Python", "Go", "Kubernetes", "Docker", "PostgreSQL"],
        "nice_to_have":     ["Rust", "Kafka"],
        "keywords":         ["microservices", "distributed systems", "CI/CD"],
        "ats_keywords":     ["Python", "Go", "Kubernetes", "Docker", "gRPC", "REST API"],
        "seniority":        "senior",
        "industry":         "technology",
        "responsibilities": ["Design backend services", "Maintain infrastructure"],
        "summary":          "Senior Backend Engineer for infrastructure team",
    }

# ── Claude mock factory ───────────────────────────────────────────────────────

def make_claude_response(content: str):
    """Create a minimal Anthropic SDK response mock."""
    msg = MagicMock()
    msg.content = [MagicMock(text=content)]
    return msg

@pytest.fixture
def mock_claude():
    """Patch anthropic.Anthropic so no network calls are made."""
    with patch("anthropic.Anthropic") as MockClient:
        instance = MockClient.return_value
        instance.messages.create = MagicMock()
        yield instance

# ── ChromaDB stub ─────────────────────────────────────────────────────────────

class _FakeCollection:
    def __init__(self):
        self._docs: dict = {}

    def upsert(self, ids, embeddings, documents, metadatas):
        for i, doc_id in enumerate(ids):
            self._docs[doc_id] = {"doc": documents[i], "meta": metadatas[i]}

    def query(self, query_embeddings, n_results, include):
        docs = list(self._docs.values())[:n_results]
        return {
            "ids":       [[d for d in self._docs.keys()][:n_results]],
            "documents": [[d["doc"] for d in docs]],
            "metadatas": [[d["meta"] for d in docs]],
            "distances": [[0.1] * len(docs)],
        }

    def count(self):
        return len(self._docs)

    def get_or_create_collection(self, name, metadata=None):
        return self

class _FakeChromaClient:
    def __init__(self):
        self._col = _FakeCollection()

    def get_or_create_collection(self, name, metadata=None):
        return self._col

@pytest.fixture
def mock_chroma():
    import rag.pipeline as _pipeline
    original_client = _pipeline._client
    _pipeline._client = None  # force _get_chroma() to call the mock
    try:
        with patch("chromadb.HttpClient", return_value=_FakeChromaClient()):
            yield
    finally:
        _pipeline._client = original_client

@pytest.fixture
def mock_sentence_transformer():
    import rag.pipeline as _pipeline
    original_model = _pipeline._model
    _pipeline._model = None  # force _get_model() to call the mock
    try:
        # Must patch the name as it's bound in rag.pipeline, not via sentence_transformers
        with patch("rag.pipeline.SentenceTransformer") as Mock:
            instance = Mock.return_value
            import numpy as np
            instance.encode = MagicMock(return_value=np.array([0.1] * 384))
            yield instance
    finally:
        _pipeline._model = original_model

# ── FastAPI test client ───────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def client(mock_chroma, mock_sentence_transformer):
    """Async HTTP client wired directly to the FastAPI app (no real server)."""
    from main import app
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac
