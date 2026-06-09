"""LLM Wiki 鈥?FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import aiofiles

from core.config import get_settings, load_user_config, save_user_config
from core.git import open_wiki_repo
from core.graph_engine import get_graph, invalidate_graph_cache

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    settings.wiki_root.mkdir(parents=True, exist_ok=True)
    settings.raw_root.mkdir(parents=True, exist_ok=True)
    try:
        open_wiki_repo()
        logger.info("Wiki repo ready at %s", settings.wiki_root)
    except Exception as exc:
        logger.warning("Git init skipped: %s", exc)
    try:
        get_graph(force_rebuild=True)
        logger.info("Graph cache warmed")
    except Exception as exc:
        logger.warning("Graph init skipped: %s", exc)
    yield
    logger.info("Shutting down")


app = FastAPI(title="LLM Wiki", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

_static_dir = BASE_DIR / "static"
_static_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(_static_dir)), name="static")


# ============================================================================
# Template helper (no request in context 鈥?avoids "unhashable type: dict")
# ============================================================================

def _render(template_name: str, context: dict | None = None) -> HTMLResponse:
    try:
        tmpl = templates.get_template(template_name)
        html = tmpl.render(*(context or {}).items() if context else {})
        # Actually, just render with context as kwargs
        html = tmpl.render(**(context or {}))
        return HTMLResponse(html)
    except Exception as e:
        logger.warning("Template '%s' failed: %s", template_name, e)
        return HTMLResponse(f"<h1>LLM Wiki</h1><p>Template error: {e}</p><p><a href='/docs'>API Docs</a></p>")


# ============================================================================
# API 鈥?Wiki core
# ============================================================================

from api.wiki import ingest_source, query_wiki, lint_wiki  # noqa: E402


@app.post("/api/wiki/ingest")
async def api_ingest(request: Request):
    body = await request.json()
    source_path = body.get("source_path", "")
    dry_run = body.get("dry_run", False)
    result = ingest_source(source_path, dry_run=dry_run)
    return {
        "source_path": result.source_path, "status": result.status,
        "new_pages": result.new_pages, "updated_pages": result.updated_pages,
        "contradictions": result.contradictions, "dry_run": result.dry_run, "errors": result.errors,
    }


@app.post("/api/wiki/ingest/batch")
async def api_ingest_batch(request: Request):
    """Batch ingest all pending sources in raw/, with optional exclude patterns.

    Body: { "exclude": ["*.tmp", ".gitkeep", "draft/*"], "dry_run": false }
    """
    from core.wiki_io import scan_sources
    body = await request.json() if await request.body() else {}
    exclude = body.get("exclude", [])
    dry_run = body.get("dry_run", False)

    sources = scan_sources(exclude_patterns=exclude)
    results = []
    for src in sources:
        r = ingest_source(src.path, dry_run=dry_run)
        results.append({
            "source": src.path, "status": r.status,
            "new_pages": len(r.new_pages), "updated_pages": len(r.updated_pages),
            "errors": r.errors,
        })
    return {"processed": len(results), "results": results}


@app.post("/api/wiki/ingest/folder")
async def api_ingest_folder(request: Request):
    """Ingest a specific sub-folder, with optional exclude patterns.

    Body: { "folder": "papers/", "exclude": ["*.tmp"], "dry_run": false }
    """
    from core.wiki_io import scan_sources
    body = await request.json() if await request.body() else {}
    folder = body.get("folder", "")
    exclude = body.get("exclude", [])
    dry_run = body.get("dry_run", False)

    sources = scan_sources(folder=folder, exclude_patterns=exclude)
    results = []
    for src in sources:
        r = ingest_source(src.path, dry_run=dry_run)
        results.append({
            "source": src.path, "status": r.status,
            "new_pages": len(r.new_pages), "updated_pages": len(r.updated_pages),
            "errors": r.errors,
        })
    return {"folder": folder, "processed": len(results), "results": results}


@app.post("/api/raw/upload")
async def api_upload_raw(file: UploadFile = File(...)):
    """Upload a file to the raw/ directory."""
    settings = get_settings()
    settings.raw_root.mkdir(parents=True, exist_ok=True)
    dest = settings.raw_root / file.filename
    content = await file.read()
    async with aiofiles.open(dest, "wb") as f:
        await f.write(content)
    logger.info("Uploaded raw file: %s (%d bytes)", file.filename, len(content))
    return {"filename": file.filename, "size": len(content), "status": "uploaded"}


@app.post("/api/wiki/query")
async def api_query(request: Request):
    body = await request.json()
    result = query_wiki(body.get("question", ""), write_back=body.get("write_back", False))
    return {"question": result.question, "answer": result.answer, "sources": result.sources, "written_back": result.written_back}


@app.post("/api/wiki/lint")
async def api_lint(request: Request):
    body = await request.json() if await request.body() else {}
    report = lint_wiki(auto_fix=body.get("auto_fix", False))
    return {
        "health_score": report.health_score,
        "issues": [{"severity": i.severity, "type": i.type, "description": i.description, "affected_pages": i.affected_pages, "suggestion": i.suggestion, "auto_fixable": i.auto_fixable} for i in report.issues],
        "stats": report.stats, "summary": report.summary,
    }


@app.get("/api/wiki/pages")
async def api_list_pages():
    from core.wiki_io import list_pages, read_page
    titles = list_pages()
    pages = []
    for t in titles:
        p = read_page(t)
        if p:
            pages.append({"title": p.title, "page_type": p.frontmatter.get("page_type", ""), "status": p.frontmatter.get("status", ""), "summary": p.frontmatter.get("summary", ""), "updated_at": p.frontmatter.get("updated_at", "")})
    return {"pages": pages, "count": len(pages)}


@app.get("/api/wiki/pages/{name:path}")
async def api_get_page(name: str):
    from core.wiki_io import read_page
    page = read_page(name)
    if page is None:
        return JSONResponse({"error": "not found"}, status_code=404)
    return {"title": page.title, "content": page.content, "frontmatter": page.frontmatter}


@app.put("/api/wiki/pages/{name:path}")
async def api_update_page(name: str, request: Request):
    from core.wiki_io import read_page, write_page, WikiPage, format_log_timestamp
    body = await request.json()
    page = read_page(name)
    if page is None:
        page = WikiPage(title=name, content=body.get("content", ""), frontmatter={"title": name, "page_type": "concept", "status": "draft", "created_at": format_log_timestamp()})
    page.content = body.get("content", page.content)
    page.frontmatter["updated_at"] = format_log_timestamp()
    write_page(page)
    invalidate_graph_cache()
    return {"title": name, "status": "updated"}


@app.delete("/api/wiki/pages/{name:path}")
async def api_delete_page(name: str):
    from core.wiki_io import delete_page
    if delete_page(name):
        invalidate_graph_cache()
        return {"title": name, "status": "deleted"}
    return JSONResponse({"error": "not found"}, status_code=404)


@app.get("/api/wiki/index")
async def api_get_index():
    from core.wiki_io import read_index
    return {"index": read_index()}


@app.get("/api/wiki/log")
async def api_get_log(last_n: int = 20):
    from core.wiki_io import read_log
    entries = read_log(last_n)
    return {"entries": [{"timestamp": e.timestamp, "operation": e.operation, "title": e.title, "branch": e.branch, "details": e.details} for e in entries]}


# ============================================================================
# Config API
# ============================================================================

@app.get("/api/config")
async def api_get_config():
    """Return current LLM configuration (API key masked)."""
    s = get_settings()
    user = load_user_config()
    return {
        "llm_api_base": s.llm_api_base,
        "llm_model": s.llm_model,
        "llm_api_key": s.llm_api_key[:8] + "***" if s.llm_api_key else "",
        "llm_small_model": s.llm_small_model or s.llm_model,
        "llm_small_api_base": s.resolved_small_api_base,
        "llm_max_tokens": s.llm_max_tokens,
        "llm_temperature": s.llm_temperature,
        "has_key": bool(s.llm_api_key),
        "has_small_key": bool(s.llm_small_api_key),
        "source": "settings.json" if user else "env / defaults",
    }


@app.post("/api/config")
async def api_save_config(request: Request):
    """Save LLM configuration. Clears settings cache so it takes effect immediately."""
    body = await request.json()
    save_user_config(body)
    logger.info("Configuration saved: model=%s base=%s", body.get("llm_model"), body.get("llm_api_base"))
    return {"status": "saved", "model": body.get("llm_model"), "base": body.get("llm_api_base")}


@app.get("/api/config/test")
async def api_test_connection():
    """Test LLM connectivity by sending a tiny chat completion request.

    Returns the model name, response preview, and latency.
    """
    import time
    from core.llm import get_llm_client

    settings = get_settings()
    if not settings.llm_api_key:
        return {"ok": False, "error": "API Key 鏈厤缃紝璇峰厛淇濆瓨閰嶇疆"}

    client = get_llm_client()
    t0 = time.time()
    try:
        reply = client.chat_completion(
            messages=[{"role": "user", "content": "Reply with exactly: OK"}],
            task="query",
            max_tokens=10,
            temperature=0,
        )
        elapsed = round((time.time() - t0) * 1000)
        return {
            "ok": True,
            "model": settings.llm_model,
            "base": settings.llm_api_base,
            "reply_preview": reply.strip()[:100],
            "latency_ms": elapsed,
        }
    except Exception as exc:
        elapsed = round((time.time() - t0) * 1000)
        return {
            "ok": False,
            "model": settings.llm_model,
            "base": settings.llm_api_base,
            "error": str(exc),
            "latency_ms": elapsed,
        }


# ============================================================================
# Sub-routers
# ============================================================================

from api.entity import router as entity_router  # noqa: E402
from api.graph import router as graph_router
from api.impact import router as impact_router
from api.branch import router as branch_router
from api.webhook import router as webhook_router

app.include_router(entity_router)
app.include_router(graph_router)
app.include_router(impact_router)
app.include_router(branch_router)
app.include_router(webhook_router)


# ============================================================================
# Frontend pages
# ============================================================================

@app.get("/", response_class=HTMLResponse)
async def page_home():
    return _render("index.html")


@app.get("/page/{name:path}", response_class=HTMLResponse)
async def page_view(name: str):
    from core.wiki_io import read_page as io_read_page
    page = io_read_page(name)
    try:
        return templates.TemplateResponse("page.html", {"page": page})
    except Exception as e:
        logger.warning("Template 'page.html' failed: %s", e)
        if page:
            return HTMLResponse(f"<h1>{page.title}</h1><pre>{page.content[:5000]}</pre>")
        return HTMLResponse(f"<h1>404</h1><p>Page '{name}' not found.</p>", status_code=404)


@app.get("/graph", response_class=HTMLResponse)
async def page_graph(request: Request):
    return _render("graph.html")


@app.get("/ingest", response_class=HTMLResponse)
async def page_ingest(request: Request):
    return _render("ingest.html")


@app.get("/query", response_class=HTMLResponse)
async def page_query(request: Request):
    return _render("query.html")


@app.get("/lint", response_class=HTMLResponse)
async def page_lint(request: Request):
    return _render("lint.html")


@app.get("/branches", response_class=HTMLResponse)
async def page_branches(request: Request):
    return _render("branches.html")


@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/config", response_class=HTMLResponse)
async def page_config(request: Request):
    return _render("config.html")

