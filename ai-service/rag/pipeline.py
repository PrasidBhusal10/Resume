"""
RAG Pipeline — indexes job descriptions in ChromaDB using sentence-transformers
embeddings for fast similarity search. Used to find similar past JDs and
improve optimization quality over time.
"""

import os
import logging
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

_model: "SentenceTransformer | None" = None
_client: "chromadb.HttpClient | None" = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        # all-MiniLM-L6-v2: fast, small, excellent for semantic search
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def _get_chroma() -> chromadb.HttpClient:
    global _client
    if _client is None:
        host = os.getenv("CHROMA_HOST", "localhost")
        port = int(os.getenv("CHROMA_PORT", "8000"))
        _client = chromadb.HttpClient(host=host, port=port)
    return _client


class RAGPipeline:
    COLLECTION_NAME = "job_descriptions"

    def __init__(self):
        self.client = _get_chroma()
        self.model  = _get_model()
        self.collection = self.client.get_or_create_collection(
            name=self.COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )

    def index_job_description(self, doc_id: str, text: str, metadata: dict) -> None:
        """Embed and store a JD in ChromaDB."""
        embedding = self.model.encode(text[:8192]).tolist()
        self.collection.upsert(
            ids=[doc_id],
            embeddings=[embedding],
            documents=[text[:8192]],
            metadatas=[metadata],
        )
        logger.info(f"Indexed JD {doc_id} in ChromaDB")

    def find_similar_jds(self, query_text: str, n: int = 3) -> list[dict]:
        """
        Find the top-n most similar job descriptions from the vector store.
        Returns list of {id, text, metadata, distance}.
        """
        if self.collection.count() == 0:
            return []

        embedding = self.model.encode(query_text[:8192]).tolist()
        results = self.collection.query(
            query_embeddings=[embedding],
            n_results=min(n, self.collection.count()),
            include=["documents", "metadatas", "distances"],
        )

        output = []
        for i, doc_id in enumerate(results["ids"][0]):
            output.append({
                "id":       doc_id,
                "text":     results["documents"][0][i],
                "metadata": results["metadatas"][0][i],
                "distance": results["distances"][0][i],
            })
        return output

    def get_similar_skills(self, jd_text: str) -> list[str]:
        """
        Retrieve keywords from similar past JDs to augment the optimizer.
        """
        similar = self.find_similar_jds(jd_text, n=5)
        keywords: set[str] = set()
        for jd in similar:
            kw_str = jd["metadata"].get("keywords", "")
            for kw in kw_str.split(","):
                kw = kw.strip()
                if kw:
                    keywords.add(kw)
        return list(keywords)[:30]
