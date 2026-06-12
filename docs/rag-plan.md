# LLM Wiki - RAG Integration Technical Execution Plan

> Version: 1.0 | Date: 2026-06-12

---

## 1. Current State

| Query Type | Source | Mechanism | Latency | Coverage |
|---|---|---|---|---|
| Wiki Query | wiki/ pages | Top-15 pages into LLM | Low | Ingested only |
| RAG (new) | raw/ docs | Vector similarity | Medium | All documents |

### Gap

- raw/ documents are NOT queryable until ingest completes
- Ingest is LLM-intensive, not suitable for every document
- RAG enables immediate query against all raw/ documents

### Architecture

    raw/ documents
      +--[Ingest]--> wiki/ pages --[Wiki Query]--> answer
      +--[Chunk+Embed]--> ChromaDB --[RAG Query]--> answer
      +--[Hybrid]--> Wiki + RAG --> LLM fusion --> best

---

## 2. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Splitter | LangChain RecursiveCharacterTextSplitter | Paragraph+sentence aware |
| Embedding | Reuse LLM API /embeddings | Zero new credentials |
| Vector DB | ChromaDB (SQLite) | Python-native, no server |
| LLM | Reuse core/llm.py | Dual-model routing |

### New Files

- core/rag.py - RAG engine: chunk, embed, index, search, hybrid
- api/rag.py - REST endpoints: /api/rag/*
- rag_index/ - ChromaDB persistent store (.gitignore)

---

## 3. API Design

| Method | Path | Body | Response |
|---|---|---|---|
| POST | /api/rag/index | {folder, force} | {status, doc_count, chunk_count} |
| POST | /api/rag/query | {question, top_k} | {answer, sources[{file,chunk,score,text}]} |
| GET | /api/rag/status | - | {doc_count, chunk_count, last_indexed} |
| POST | /api/rag/query/hybrid | {question, top_k} | {answer, wiki_sources, rag_sources} |
| POST | /api/rag/query/stream | {question, top_k} | SSE streaming response |

### Data Flow: Indexing

1. Scan raw/*.md files
2. RecursiveCharacterTextSplitter(chunk_size=500, overlap=50) -> chunks[]
3. POST {LLM_API_BASE}/embeddings -> vectors[]
4. ChromaDB.add(documents=chunks, embeddings=vectors, metadatas=[{file,idx}])

### Data Flow: Query

1. Embed question -> query_vector
2. ChromaDB.query(query_vector, n_results=top_k) -> relevant chunks
3. Format: RAG_SYSTEM_PROMPT + chunks + question
4. LLM -> answer with source citations

---

## 4. Configuration

### New Settings (core/config.py)

| Setting | Default | Description |
|---|---|---|
| rag_enabled | True | Enable/disable RAG |
| rag_chunk_size | 500 | Token count per chunk |
| rag_chunk_overlap | 50 | Token overlap between chunks |
| rag_top_k | 5 | Number of chunks to retrieve |
| rag_embedding_model | (empty) | Model for embeddings; empty=auto-detect |
| rag_persist_dir | ./rag_index | ChromaDB storage path |

### Dependencies

Add to pyproject.toml: chromadb >= 0.5.0, langchain-text-splitters >= 0.3.0
Add to .gitignore: rag_index/


---

## 5. Core Module Design (core/rag.py)

### RAGEngine Class

- __init__(settings): Init ChromaDB client, text splitter, embedding cache
- index_documents(folder, force) -> {doc_count, chunk_count}: Scan, chunk, embed, store
- query(question, top_k) -> RAGResult: Embed question, search, LLM answer
- hybrid_query(question, top_k) -> HybridResult: Wiki+RAG fusion
- get_status() -> {doc_count, chunk_count, last_indexed}
- _chunk_document(text, filename) -> list of {text, metadata}
- _embed_texts(texts) -> list of vectors
- _get_embedding_model() -> str: Detect from LLM API

### Prompt Templates

RAG_SYSTEM: Answer based ONLY on retrieved chunks. Cite file names.
HYBRID_SYSTEM: Synthesize wiki knowledge + raw passages.

---

## 6. Frontend Integration

### QueryPage Mode Toggle

Segmented control: [Wiki] [RAG] [Hybrid]
- Wiki: POST /api/wiki/query (existing)
- RAG: POST /api/rag/query/stream (SSE streaming)
- Hybrid: POST /api/rag/query/hybrid

### RAG Source Cards

Below the answer, show expandable source cards with:
- File name + chunk index
- Relevance score badge (0.0-1.0)
- Preview of chunk text (first 200 chars)

### New API Client Methods (api/client.ts)

- ragIndex(folder?, force?) -> Promise<{status, doc_count, chunk_count}>
- ragQuery(question, top_k?) -> Promise<{answer, sources[]}>
- ragQueryStream(question, top_k?) -> SSE Response
- ragStatus() -> Promise<{doc_count, chunk_count, last_indexed}>
- ragHybridQuery(question, top_k?) -> Promise<{answer, wiki_sources, rag_sources}>

---

## 7. Implementation Checklist

### Phase 1: Core Engine
- [ ] Add chromadb + langchain-text-splitters to pyproject.toml
- [ ] Add rag_* settings to core/config.py
- [ ] Add rag_index/ to .gitignore
- [ ] Create core/rag.py with RAGEngine class
- [ ] Implement _chunk_document(text, filename)
- [ ] Implement _embed_texts(texts)
- [ ] Implement index_documents(folder, force)
- [ ] Implement query(question, top_k)
- [ ] Implement hybrid_query(question, top_k)
- [ ] Implement get_status()

### Phase 2: API
- [ ] Create api/rag.py with FastAPI router
- [ ] POST /api/rag/index
- [ ] POST /api/rag/query
- [ ] POST /api/rag/query/stream (SSE)
- [ ] POST /api/rag/query/hybrid
- [ ] GET /api/rag/status
- [ ] Register router in app/main.py

### Phase 3: Frontend
- [ ] Add mode toggle to QueryPage (Wiki/RAG/Hybrid)
- [ ] Add rag methods to api/client.ts
- [ ] Create RAGSourceCard component
- [ ] SSE streaming for RAG queries
- [ ] Build + test

### Phase 4: Testing
- [ ] Unit test chunking
- [ ] Unit test embedding (mocked)
- [ ] Integration test index+query
- [ ] Integration test hybrid query
- [ ] Frontend test mode toggle

---

## 8. Risks and Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Embedding API unsupported | Medium | Auto-detect from LLM base_url: DeepSeek supports standard /embeddings |
| ChromaDB on Windows | Low | v0.5+ has full Windows SQLite support |
| Large indexing time | Medium | Incremental by file hash, show progress in UI |
| Token overflow in hybrid | Low | Truncate wiki+rag context to fit max_tokens |
| Cost (embedding API calls) | Medium | Cache embeddings by file hash, only re-embed new/changed files |

---

## 9. Migration Path

1. Install dependencies: pip install chromadb langchain-text-splitters
2. Add config settings
3. Create core/rag.py
4. Create api/rag.py + register routes
5. Run POST /api/rag/index to build initial index
6. Test RAG query endpoint
7. Add frontend toggle
8. Existing Wiki query continues working unchanged
