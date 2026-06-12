"""RAG Engine - chunking, embedding, vector search, hybrid query."""

import hashlib
import json
import logging
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from langchain_text_splitters import RecursiveCharacterTextSplitter

from core.config import get_settings
from core.llm import get_llm_client

logger = logging.getLogger(__name__)


@dataclass
class RAGChunk:
    text: str
    source_file: str
    chunk_index: int


@dataclass
class RAGSource:
    file: str
    chunk_index: int
    score: float
    text: str


@dataclass
class RAGResult:
    answer: str
    sources: list[dict] = field(default_factory=list)


@dataclass
class HybridResult:
    answer: str
    wiki_sources: list[str] = field(default_factory=list)
    rag_sources: list[dict] = field(default_factory=list)


RAG_SYSTEM_PROMPT = """\
You answer questions based on retrieved document chunks.
Use ONLY the provided chunks. Cite sources by filename.
If chunks do not contain enough information, say so clearly.

Context:
{context}"""

HYBRID_SYSTEM_PROMPT = """\
You answer questions using BOTH wiki knowledge AND raw document passages.

Wiki knowledge (structured, curated):
{wiki_answer}

Raw passages (direct from documents):
{rag_context}

Synthesize a comprehensive answer. Prefer wiki for factual claims,
use raw passages for details the wiki may have missed."""


class RAGEngine:
    """Manages document chunking, embedding, and vector search."""

    def __init__(self):
        self._settings = get_settings()
        self._collection = None
        self._embedding_model = None
        self._hash_cache: dict[str, str] = {}
        self._load_hash_cache()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    @property
    def settings(self):
        return get_settings()

    def get_status(self) -> dict:
        col = self._get_collection()
        count = col.count() if col else 0
        meta = col.metadata if col else {}
        return {
            "enabled": self.settings.rag_enabled,
            "chunk_count": count,
            "last_indexed": meta.get("last_indexed", ""),
            "persist_dir": self.settings.rag_persist_dir,
        }

    def index_documents(self, folder: str = "", force: bool = False) -> dict:
        """Scan raw/ documents, chunk, embed, and store in ChromaDB.

        Args:
            folder: Relative subfolder within raw/. Empty = all.
            force: If True, delete existing index and rebuild.
        """
        t0 = time.time()
        raw_root = self.settings.raw_root
        scan_dir = raw_root / folder if folder else raw_root

        if not scan_dir.exists():
            return {"status": "error", "error": f"Directory not found: {scan_dir}"}

        col = self._get_or_create_collection(reset=force)

        # Collect files
        files = list(scan_dir.rglob("*.md")) + list(scan_dir.rglob("*.txt"))
        if not files:
            return {"status": "empty", "doc_count": 0, "chunk_count": 0}

        # Chunk all files
        all_chunks: list[RAGChunk] = []
        file_hashes: dict[str, str] = {}
        new_docs = 0
        skipped_docs = 0

        for fp in files:
            rel = str(fp.relative_to(raw_root))
            text = fp.read_text(encoding="utf-8", errors="replace")
            fhash = hashlib.sha256(text.encode()).hexdigest()

            # Skip unchanged files
            if not force and rel in self._hash_cache and self._hash_cache[rel] == fhash:
                skipped_docs += 1
                continue

            new_docs += 1
            file_hashes[rel] = fhash
            chunks = self._chunk_document(text, rel)
            all_chunks.extend(chunks)

        if not all_chunks:
            return {
                "status": "up_to_date",
                "doc_count": len(file_hashes),
                "chunk_count": col.count(),
                "new_docs": new_docs,
                "skipped_docs": skipped_docs,
            }

        # Embed
        texts = [c.text for c in all_chunks]
        metadatas = [{"file": c.source_file, "chunk_idx": c.chunk_index} for c in all_chunks]
        ids = [f"{c.source_file}:{c.chunk_index}" for c in all_chunks]

        embeddings = self._embed_texts(texts)

        # Store
        col.add(ids=ids, embeddings=embeddings, documents=texts, metadatas=metadatas)
        col.modify(metadata={"last_indexed": time.strftime("%Y-%m-%d %H:%M:%S")})

        # Update hash cache
        self._hash_cache.update(file_hashes)
        self._save_hash_cache()

        elapsed = round(time.time() - t0, 1)
        logger.info("RAG index done: %d new docs, %d chunks, %d skipped, %.1fs",
                     new_docs, len(all_chunks), skipped_docs, elapsed)

        return {
            "status": "indexed",
            "doc_count": len(file_hashes),
            "chunk_count": len(all_chunks),
            "new_docs": new_docs,
            "skipped_docs": skipped_docs,
            "elapsed_seconds": elapsed,
        }

    def query(self, question: str, top_k: int | None = None) -> RAGResult:
        """RAG query: embed question, search, prompt LLM."""
        top_k = top_k or self.settings.rag_top_k
        col = self._get_collection()
        if not col or col.count() == 0:
            return RAGResult(answer="RAG index is empty. Build it first via /api/rag/index.", sources=[])

        # Embed question
        q_embedding = self._embed_texts([question])[0]

        # Search
        results = col.query(query_embeddings=[q_embedding], n_results=min(top_k, col.count()))

        chunks_texts = results.get("documents", [[]])[0] or []
        metadatas = results.get("metadatas", [[]])[0] or []
        distances = results.get("distances", [[]])[0] or []

        sources = []
        context_parts = []
        for i, (text, meta, dist) in enumerate(zip(chunks_texts, metadatas, distances)):
            score = round(1.0 / (1.0 + dist), 4) if dist else 0.0
            sources.append({
                "file": meta.get("file", "?"),
                "chunk_index": meta.get("chunk_idx", i),
                "score": score,
                "text": text[:300],
            })
            context_parts.append(f"[Source: {meta.get('file', '?')}]\n{text}")

        # Format prompt
        context = "\n\n---\n\n".join(context_parts)
        system = RAG_SYSTEM_PROMPT.format(context=context)

        # LLM
        client = get_llm_client()
        try:
            answer = client.chat_completion(
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": question},
                ],
                task="query",
            )
        except Exception as e:
            return RAGResult(answer=f"RAG query failed: {e}", sources=sources)

        return RAGResult(answer=answer, sources=sources)

    def hybrid_query(self, question: str, top_k: int | None = None) -> HybridResult:
        """Query both Wiki and RAG, then fuse results through LLM."""
        top_k = top_k or self.settings.rag_top_k

        # Wiki query
        wiki_answer = ""
        wiki_sources: list[str] = []
        try:
            from api.wiki import query_wiki
            wiki_result = query_wiki(question)
            wiki_answer = wiki_result.answer
            wiki_sources = wiki_result.sources
        except Exception as e:
            logger.warning("Wiki query failed in hybrid: %s", e)

        # RAG query
        rag_result = self.query(question, top_k)
        rag_chunks = []
        for s in rag_result.sources:
            rag_chunks.append(f"[{s['file']}]\n{s['text']}")
        rag_context = "\n\n---\n\n".join(rag_chunks)

        # Hybrid fusion
        if not wiki_answer and not rag_context:
            return HybridResult(answer="No results from either Wiki or RAG.", wiki_sources=wiki_sources, rag_sources=rag_result.sources)

        system = HYBRID_SYSTEM_PROMPT.format(wiki_answer=wiki_answer or "(no wiki results)", rag_context=rag_context or "(no rag results)")

        client = get_llm_client()
        try:
            answer = client.chat_completion(
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": question},
                ],
                task="query",
            )
        except Exception as e:
            answer = f"Hybrid query failed: {e}"

        return HybridResult(answer=answer, wiki_sources=wiki_sources, rag_sources=rag_result.sources)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _chunk_document(self, text: str, filename: str) -> list[RAGChunk]:
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.settings.rag_chunk_size,
            chunk_overlap=self.settings.rag_chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""],
        )
        chunks = splitter.split_text(text)
        return [RAGChunk(text=c, source_file=filename, chunk_index=i) for i, c in enumerate(chunks)]

    def _embed_texts(self, texts: list[str]) -> list[list[float]]:
        client = get_llm_client()
        model = self._get_embedding_model()

        # Use OpenAI-compatible embeddings endpoint
        openai_client = client.primary if client.primary else client.small
        try:
            resp = openai_client.embeddings.create(model=model, input=texts)
            return [d.embedding for d in resp.data]
        except Exception as e:
            logger.error("Embedding failed with model %s: %s", model, e)
            raise

    def _get_embedding_model(self) -> str:
        if self._embedding_model:
            return self._embedding_model
        configured = self.settings.rag_embedding_model
        if configured:
            self._embedding_model = configured
            return configured
        # Auto-detect: use small model if it looks like an embedding model, else default
        small = self.settings.llm_small_model
        if small and "embed" in small.lower():
            self._embedding_model = small
        else:
            self._embedding_model = "text-embedding-3-small"
        return self._embedding_model

    def _get_or_create_collection(self, reset: bool = False):
        import chromadb
        client = chromadb.PersistentClient(path=self.settings.rag_persist_dir)
        name = "rag_documents"
        if reset:
            try:
                client.delete_collection(name)
            except Exception:
                pass
        self._collection = client.get_or_create_collection(name=name)
        return self._collection

    def _get_collection(self):
        if self._collection:
            return self._collection
        try:
            import chromadb
            client = chromadb.PersistentClient(path=self.settings.rag_persist_dir)
            self._collection = client.get_collection("rag_documents")
            return self._collection
        except Exception:
            return None

    def _load_hash_cache(self):
        cache_path = Path(self.settings.rag_persist_dir) / "hash_cache.json"
        if cache_path.exists():
            try:
                self._hash_cache = json.loads(cache_path.read_text())
            except Exception:
                pass

    def _save_hash_cache(self):
        cache_dir = Path(self.settings.rag_persist_dir)
        cache_dir.mkdir(parents=True, exist_ok=True)
        cache_path = cache_dir / "hash_cache.json"
        cache_path.write_text(json.dumps(self._hash_cache))
