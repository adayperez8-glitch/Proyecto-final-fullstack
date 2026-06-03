"""Fábrica del vector store (ChromaDB) y de los embeddings.

Si hay GOOGLE_API_KEY usa los embeddings de Gemini; si no, usa unos embeddings
'fake' deterministas para poder probar el flujo de RAG sin clave ni coste.
"""
import hashlib
import os

from langchain_chroma import Chroma
from langchain_core.embeddings import Embeddings

from config import settings


class FakeDeterministicEmbeddings(Embeddings):
    """Embeddings de juguete (sin red): vector derivado del hash del texto.
    No tienen significado semántico real, pero permiten ejercitar todo el
    pipeline de Chroma en modo desarrollo/demo sin clave."""

    dim = 256

    def _vector(self, text: str) -> list[float]:
        out: list[float] = []
        i = 0
        while len(out) < self.dim:
            h = hashlib.sha256(f"{i}:{text}".encode()).digest()
            out.extend(b / 255.0 for b in h)
            i += 1
        return out[: self.dim]

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [self._vector(t) for t in texts]

    def embed_query(self, text: str) -> list[float]:
        return self._vector(text)


def get_embeddings() -> Embeddings:
    if settings.has_ai:
        from langchain_google_genai import GoogleGenerativeAIEmbeddings

        return GoogleGenerativeAIEmbeddings(
            model=settings.embedding_model,
            google_api_key=settings.google_api_key,
        )
    return FakeDeterministicEmbeddings()


def get_vectorstore() -> Chroma:
    here = os.path.dirname(__file__)
    persist_dir = os.path.join(here, "..", settings.chroma_dir)
    return Chroma(
        collection_name=settings.chroma_collection,
        embedding_function=get_embeddings(),
        persist_directory=os.path.abspath(persist_dir),
    )
