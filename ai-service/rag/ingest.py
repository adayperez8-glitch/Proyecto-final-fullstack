"""Indexa los documentos de dominio (rag/docs/*.md) en ChromaDB.

Uso:  python -m rag.ingest        (desde la carpeta ai-service)
Re-ejecutar es seguro: borra el índice anterior y lo reconstruye.
"""
import glob
import os
import shutil

from langchain_core.documents import Document

from config import settings
from rag.store import get_vectorstore

HERE = os.path.dirname(__file__)
DOCS_DIR = os.path.join(HERE, "docs")
CHUNK_SIZE = 700
CHUNK_OVERLAP = 100


def _title_of(text: str, fallback: str) -> str:
    for line in text.splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return fallback


def _chunk(text: str) -> list[str]:
    """Trocea por párrafos agrupando hasta ~CHUNK_SIZE caracteres (con solape)."""
    paras = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: list[str] = []
    buf = ""
    for p in paras:
        if buf and len(buf) + len(p) + 2 > CHUNK_SIZE:
            chunks.append(buf)
            buf = buf[-CHUNK_OVERLAP:] + "\n\n" + p
        else:
            buf = f"{buf}\n\n{p}" if buf else p
    if buf:
        chunks.append(buf)
    return chunks


def load_documents() -> list[Document]:
    docs: list[Document] = []
    for path in sorted(glob.glob(os.path.join(DOCS_DIR, "*.md"))):
        with open(path, encoding="utf-8") as f:
            text = f.read()
        fname = os.path.basename(path)
        title = _title_of(text, fname)
        for chunk in _chunk(text):
            docs.append(
                Document(page_content=chunk, metadata={"title": title, "source": fname})
            )
    return docs


def main() -> None:
    # Borra el índice anterior para evitar duplicados.
    persist_dir = os.path.abspath(os.path.join(HERE, "..", settings.chroma_dir))
    if os.path.isdir(persist_dir):
        shutil.rmtree(persist_dir)

    docs = load_documents()
    n_files = len({d.metadata["source"] for d in docs})
    if n_files < 5:
        raise SystemExit(f"[!] Solo hay {n_files} documentos; el requisito pide al menos 5.")

    vs = get_vectorstore()
    vs.add_documents(docs)
    modo = "Gemini" if settings.has_ai else "FAKE (sin clave)"
    print(f"[OK] Indexados {len(docs)} fragmentos de {n_files} documentos. Embeddings: {modo}")


if __name__ == "__main__":
    main()
