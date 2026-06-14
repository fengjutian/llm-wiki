"""RAG API endpoints - index, query, hybrid, status."""
import asyncio, json, logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from core.config import get_settings
from core.llm import get_llm_client
from api.wiki import query_wiki
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/rag", tags=["rag"])
class IndexRequest(BaseModel):
    folder: str = ""
    force: bool = False
class QueryRequest(BaseModel):
    question: str
    top_k: int = 5

def _get_engine():
    from core.rag import get_rag_engine
    return get_rag_engine()

@router.get("/status")
async def rag_status():
    try:
        return _get_engine().get_status()
    except ImportError:
        return {"error": "RAG not available - install chromadb"}

@router.post("/index")
async def rag_index(req: IndexRequest):
    try:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            None, _get_engine().index_documents, req.folder, req.force
        )
    except ImportError:
        return {"error": "RAG not available"}

@router.post("/query")
async def rag_query(req: QueryRequest):
    if not req.question.strip():
        return {"answer": "", "sources": []}
    try:
        result = _get_engine().query(req.question, req.top_k)
        return {"answer": result.answer, "sources": result.sources}
    except ImportError:
        return {"answer": "RAG not available - install chromadb", "sources": []}

@router.post("/query/stream")
async def rag_query_stream(req: QueryRequest):
    if not req.question.strip():
        return {"answer": ""}
    engine = _get_engine()
    async def gen():
        for chunk in engine.query_stream(req.question, req.top_k):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"
    return StreamingResponse(gen(), media_type="text/event-stream")

@router.post("/query/hybrid")
async def rag_hybrid_query(req: QueryRequest):
    if not req.question.strip():
        return {"answer": "", "wiki_sources": [], "rag_sources": []}
    result = _get_engine().hybrid_query(req.question, req.top_k)
    return {
        "answer": result.answer,
        "wiki_sources": result.wiki_sources,
        "rag_sources": result.rag_sources,
    }
