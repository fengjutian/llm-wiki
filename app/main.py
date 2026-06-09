"""LLM Wiki – FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from core.config import get_settings
from core.git import open_wiki_repo, commit
from core.graph_engine import get_graph, invalidate_graph_cache
from core.wiki_io import _wiki_root, _raw_root

from api.wiki import ingest_source, query_wiki, lint_wiki, IngestResult, QueryResult, LintReport
from api.entity import router as entity_router
from api.graph import router as graph_router
from api.impact import router as impact_router
from api.webhook import router as webhook_router
from api.branch import router as branch_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Templates & statics
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown."""
    settings = get_settings()
    # ensure directories exist
    settings.wiki_root.mkdir(parents=True, exist_ok=True)
    settings.raw_root.mkdir(parents=True, exist_ok=True)
    # init git
    try:
        repo = open_wiki_repo()
        logger.info("Wiki repo ready at %s", settings.wiki_root)
    except Exception as exc:
        logger.warning("Git init skipped: %s", exc)
    # warm graph cache
    try:
        get_graph(force_rebuild=True)
        logger.info("Graph cache warmed")
    except Exception as exc:
        logger.warning("Graph init skipped: %s", exc)

    yield
    logger.info("Shutting down")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="LLM Wiki",
    description="A tool that lets LLMs build and maintain a personal knowledge wiki.",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files & templates (created lazily if missing)
_static_dir = BASE_DIR / "static"
_static_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(_static_dir)), name="static")


# ---------------------------------------------------------------------------
# API Routers
# ---------------------------------------------------------------------------

from api.wiki import _collect_existing_pages  # noqa: E402

# -- Wiki core endpoints (registered directly for flexibility) ---------------


@app.post("/api/wiki/ingest")
async def api_ingest(request: Request):
    """Ingest a source document into the wiki."""
    body = await request.json()
    source_path = body.get("source_path", "")
    dry_run = body.get("dry_run", False)

    result = ingest_source(source_path, dry_run=dry_run)
    return {
        "source_path": result.source_path,
        "status": result.status,
        "new_pages": result.new_pages,
        "updated_pages": result.updated_pages,
        "contradictions": result.contradictions,
        "dry_run": result.dry_run,
        "errors": result.errors,
    }


@app.post("/api/wiki/ingest/batch")
async def api_ingest_batch(request: Request):
    """Batch ingest all pending sources in raw/."""
    from core.wiki_io import scan_sources

    sources = scan_sources()
    results = []
    for src in sources:
        if src.status == "pending":
            result = ingest_source(src.path)
            results.append({
                "source": src.path,
                "status": result.status,
                "new_pages": len(result.new_pages),
                "updated_pages": len(result.updated_pages),
                "errors": result.errors,
            })
    return {"processed": len(results), "results": results}


@app.post("/api/wiki/query")
async def api_query(request: Request):
    """Query the wiki."""
    body = await request.json()
    question = body.get("question", "")
    write_back = body.get("write_back", False)

    result = query_wiki(question, write_back=write_back)
    return {
        "question": result.question,
        "answer": result.answer,
        "sources": result.sources,
        "written_back": result.written_back,
    }


@app.post("/api/wiki/lint")
async def api_lint(request: Request):
    """Run a health check on the wiki."""
    body = await request.json() if await request.body() else {}
    auto_fix = body.get("auto_fix", False)

    report = lint_wiki(auto_fix=auto_fix)
    return {
        "health_score": report.health_score,
        "issues": [
            {
                "severity": i.severity,
                "type": i.type,
                "description": i.description,
                "affected_pages": i.affected_pages,
                "suggestion": i.suggestion,
                "auto_fixable": i.auto_fixable,
            }
            for i in report.issues
        ],
        "stats": report.stats,
        "summary": report.summary,
    }


@app.get("/api/wiki/pages")
async def api_list_pages():
    """List all wiki pages."""
    from core.wiki_io import list_pages, read_page

    titles = list_pages()
    pages = []
    for t in titles:
        p = read_page(t)
        if p:
            pages.append(
                {
                    "title": p.title,
                    "page_type": p.frontmatter.get("page_type", ""),
                    "status": p.frontmatter.get("status", ""),
                    "summary": p.frontmatter.get("summary", ""),
                    "updated_at": p.frontmatter.get("updated_at", ""),
                }
            )
    return {"pages": pages, "count": len(pages)}


@app.get("/api/wiki/pages/{name:path}")
async def api_get_page(name: str):
    """Get a wiki page by title."""
    from core.wiki_io import read_page

    page = read_page(name)
    if page is None:
        return JSONResponse({"error": "not found"}, status_code=404)
    return {
        "title": page.title,
        "content": page.content,
        "frontmatter": page.frontmatter,
    }


@app.put("/api/wiki/pages/{name:path}")
async def api_update_page(name: str, request: Request):
    """Update a wiki page."""
    from core.wiki_io import read_page, write_page, WikiPage, format_log_timestamp

    body = await request.json()
    page = read_page(name)
    if page is None:
        page = WikiPage(
            title=name,
            content=body.get("content", ""),
            frontmatter={
                "title": name,
                "page_type": "concept",
                "status": "draft",
                "created_at": format_log_timestamp(),
            },
        )
    page.content = body.get("content", page.content)
    page.frontmatter["updated_at"] = format_log_timestamp()
    write_page(page)
    invalidate_graph_cache()
    return {"title": name, "status": "updated"}


@app.delete("/api/wiki/pages/{name:path}")
async def api_delete_page(name: str):
    """Delete a wiki page."""
    from core.wiki_io import delete_page

    ok = delete_page(name)
    if ok:
        invalidate_graph_cache()
        return {"title": name, "status": "deleted"}
    return JSONResponse({"error": "not found"}, status_code=404)


@app.get("/api/wiki/index")
async def api_get_index():
    """Get the index.md content."""
    from core.wiki_io import read_index

    return {"index": read_index()}


@app.get("/api/wiki/log")
async def api_get_log(last_n: int = 20):
    """Get recent log entries."""
    from core.wiki_io import read_log

    entries = read_log(last_n)
    return {
        "entries": [
            {
                "timestamp": e.timestamp,
                "operation": e.operation,
                "title": e.title,
                "branch": e.branch,
                "details": e.details,
            }
            for e in entries
        ]
    }


# -- Sub-routers -------------------------------------------------------------

app.include_router(entity_router)
app.include_router(graph_router)
app.include_router(impact_router)
app.include_router(webhook_router)
app.include_router(branch_router)


# ---------------------------------------------------------------------------
# Frontend pages (Phase 5.5 – served when templates exist)
# ---------------------------------------------------------------------------


@app.get("/", response_class=HTMLResponse)
async def page_home(request: Request):
    """Wiki browser home page."""
    try:
        return templates.TemplateResponse("index.html", {"request": request})
    except Exception:
        return HTMLResponse("<h1>LLM Wiki</h1><p>API is running. Frontend templates not yet created.</p><p><a href='/docs'>API Docs</a></p>")


@app.get("/page/{name:path}", response_class=HTMLResponse)
async def page_view(request: Request, name: str):
    """View a single wiki page."""
    from core.wiki_io import read_page as io_read_page

    page = io_read_page(name)
    try:
        return templates.TemplateResponse("page.html", {"request": request, "page": page})
    except Exception:
        if page:
            return HTMLResponse(f"<h1>{page.title}</h1><pre>{page.content[:5000]}</pre>")
        return HTMLResponse(f"<h1>404</h1><p>Page '{name}' not found.</p>", status_code=404)


@app.get("/graph", response_class=HTMLResponse)
async def page_graph(request: Request):
    """Graph visualization page."""
    try:
        return templates.TemplateResponse("graph.html", {"request": request})
    except Exception:
        return HTMLResponse("<h1>Graph View</h1><p>Template not yet created.</p>")


@app.get("/ingest", response_class=HTMLResponse)
async def page_ingest(request: Request):
    """Ingest panel."""
    try:
        return templates.TemplateResponse("ingest.html", {"request": request})
    except Exception:
        return HTMLResponse("<h1>Ingest</h1><p>Template not yet created.</p>")


@app.get("/query", response_class=HTMLResponse)
async def page_query(request: Request):
    """Query chat page."""
    try:
        return templates.TemplateResponse("query.html", {"request": request})
    except Exception:
        return HTMLResponse("<h1>Query</h1><p>Template not yet created.</p>")


@app.get("/lint", response_class=HTMLResponse)
async def page_lint(request: Request):
    """Lint dashboard."""
    try:
        return templates.TemplateResponse("lint.html", {"request": request})
    except Exception:
        return HTMLResponse("<h1>Lint Dashboard</h1><p>Template not yet created.</p>")


@app.get("/branches", response_class=HTMLResponse)
async def page_branches(request: Request):
    """Branch management."""
    try:
        return templates.TemplateResponse("branches.html", {"request": request})
    except Exception:
        return HTMLResponse("<h1>Branches</h1><p>Template not yet created.</p>")


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------


@app.get("/health")
async def health():
    return {"status": "ok"}
