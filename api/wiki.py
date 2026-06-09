"""Wiki core operations – ingest, query, lint."""

import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

from core.config import get_settings
from core.llm import get_llm_client
from core.git import open_wiki_repo, commit, current_branch
from core.graph_engine import (
    get_graph,
    find_orphans,
    find_dead_links,
    graph_stats,
    hub_pages,
    invalidate_graph_cache,
)
from core.wiki_io import (
    WikiPage,
    Source,
    LogEntry,
    file_hash,
    read_page,
    write_page,
    delete_page,
    list_pages,
    scan_sources,
    read_source,
    read_index,
    update_index_entry,
    append_log,
    format_log_timestamp,
    page_exists,
    normalize_title,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------


@dataclass
class IngestResult:
    source_path: str
    source_hash: str
    status: str  # ingested | skipped | modified
    new_pages: list[str] = field(default_factory=list)
    updated_pages: list[str] = field(default_factory=list)
    contradictions: list[dict] = field(default_factory=list)
    dry_run: bool = False
    errors: list[str] = field(default_factory=list)


@dataclass
class QueryResult:
    question: str
    answer: str
    sources: list[str] = field(default_factory=list)  # [[page]] references
    written_back: bool = False


@dataclass
class LintIssue:
    severity: str  # critical | warning | info
    type: str
    description: str
    affected_pages: list[str] = field(default_factory=list)
    suggestion: str = ""
    auto_fixable: bool = False


@dataclass
class LintReport:
    health_score: str  # A-F
    issues: list[LintIssue] = field(default_factory=list)
    stats: dict = field(default_factory=dict)
    summary: str = ""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _collect_existing_pages() -> str:
    """Gather all existing wiki pages as a single string for LLM context."""
    titles = list_pages()
    if not titles:
        return "_(empty wiki)_"

    parts = []
    for title in titles:
        page = read_page(title)
        if page:
            # give more context per page so LLM can avoid duplicates
            parts.append(f"### {title}\n\n{page.content[:4000]}")
            if len(page.content) > 4000:
                parts[-1] += "\n\n_(truncated)_"
    # allow up to 50 pages of context
    full = "\n\n---\n\n".join(parts[:50])
    return full


def _get_ingested_hashes() -> dict[str, str]:
    """Read existing source hashes from index.md frontmatter or a sidecar file."""
    # For MVP, scan existing wiki source_summary pages for their source hash
    hashes: dict[str, str] = {}
    for title in list_pages():
        page = read_page(title)
        if page and page.frontmatter.get("page_type") == "source_summary":
            sources = page.frontmatter.get("sources", [])
            for s in sources:
                if isinstance(s, dict) and "file" in s and "hash" in s:
                    hashes[s["file"]] = s["hash"]
    return hashes


# ---------------------------------------------------------------------------
# Ingest
# ---------------------------------------------------------------------------


def ingest_source(
    source_path: str,
    *,
    dry_run: bool = False,
    interactive: bool = False,
) -> IngestResult:
    """Ingest a single source document into the wiki.

    Steps:
      1. Read source, compute hash
      2. Check dedup / modification
      3. Call LLM to extract and integrate knowledge
      4. Write new & updated pages
      5. Update index.md
      6. Append log.md
      7. Git commit
    """
    settings = get_settings()
    result = IngestResult(source_path=source_path, source_hash="", status="skipped", dry_run=dry_run)

    # 1. Read source
    content = read_source(source_path)
    if content is None:
        result.errors.append(f"Source not found: {source_path}")
        return result

    result.source_hash = file_hash(settings.raw_root / source_path)

    # 2. Dedup
    ingested = _get_ingested_hashes()
    status = "pending"
    if source_path in ingested:
        if ingested[source_path] == result.source_hash:
            result.status = "skipped"
            return result
        else:
            status = "modified"
    result.status = status

    # 3. Call LLM
    client = get_llm_client()
    existing = _collect_existing_pages()

    try:
        raw_json = client.ingest(
            source_content=content,
            source_name=source_path,
            existing_pages=existing,
        )
        parsed = json.loads(raw_json)
    except Exception as exc:
        result.errors.append(f"LLM call failed: {exc}")
        return result

    if dry_run:
        # return preview without writing
        result.new_pages = [p.get("title", "") for p in parsed.get("new_pages", [])]
        result.updated_pages = [p.get("title", "") for p in parsed.get("updated_pages", [])]
        result.contradictions = parsed.get("contradictions", [])
        return result

    # 4. Write new pages
    for p in parsed.get("new_pages", []):
        title = normalize_title(p.get("title", ""))
        if not title:
            continue
        fm = {
            "title": title,
            "page_type": p.get("page_type", "concept"),
            "status": "draft",
            "sources": [{"file": source_path, "hash": result.source_hash}],
            "summary": p.get("summary", ""),
            "created_at": format_log_timestamp(),
            "updated_at": format_log_timestamp(),
        }
        page = WikiPage(title=title, content=p.get("content", ""), frontmatter=fm)
        write_page(page)
        result.new_pages.append(title)

    # 5. Update existing pages
    for p in parsed.get("updated_pages", []):
        title = normalize_title(p.get("title", ""))
        if not title:
            continue
        existing_page = read_page(title)
        if existing_page:
            existing_page.content = p.get("new_content", existing_page.content)
            existing_page.frontmatter["updated_at"] = format_log_timestamp()
            # append source if not already tracked
            srcs = existing_page.frontmatter.get("sources", [])
            src_files = [s.get("file") for s in srcs if isinstance(s, dict)]
            if source_path not in src_files:
                srcs.append({"file": source_path, "hash": result.source_hash})
            existing_page.frontmatter["sources"] = srcs
            write_page(existing_page)
            result.updated_pages.append(title)

    # 6. Contradictions
    result.contradictions = parsed.get("contradictions", [])

    # 7. Update index
    for entry in parsed.get("index_entries", []):
        update_index_entry(
            title=entry.get("page", ""),
            summary=entry.get("summary", ""),
            category=entry.get("category", ""),
        )

    # 8. Log
    append_log(
        LogEntry(
            timestamp=format_log_timestamp(),
            operation="ingest",
            title=source_path,
            branch=settings.wiki_branch,
            details=f"Status: {status} | New: {len(result.new_pages)} | Updated: {len(result.updated_pages)} | Contradictions: {len(result.contradictions)}",
        )
    )

    # 9. Git commit
    if settings.git_auto_commit:
        try:
            repo = open_wiki_repo()
            commit(repo, f"ingest: {source_path}")
        except Exception as exc:
            logger.warning("Git commit failed: %s", exc)

    # 10. Invalidate graph cache
    invalidate_graph_cache()

    return result


# ---------------------------------------------------------------------------
# Query
# ---------------------------------------------------------------------------


def query_wiki(
    question: str,
    *,
    write_back: bool = False,
) -> QueryResult:
    """Query the wiki and return an answer with citations.

    Optionally write the Q&A result back as a new wiki page.
    """
    result = QueryResult(question=question, answer="")

    # 1. Read index → locate relevant pages
    idx = read_index()
    titles = list(idx.keys()) if idx else list_pages()

    # 2. Collect page contents
    parts = []
    for title in titles[:15]:  # limit context
        page = read_page(title)
        if page:
            parts.append(f"### {title}\n\n{page.content[:1500]}")
    wiki_text = "\n\n---\n\n".join(parts) if parts else "_(empty wiki)_"

    # 3. LLM
    client = get_llm_client()
    try:
        answer = client.query(question=question, wiki_pages=wiki_text)
    except Exception as exc:
        result.answer = f"Query failed: {exc}"
        return result

    result.answer = answer

    # 4. Extract [[sources]] from answer
    import re
    refs = re.findall(r"\[\[(.+?)\]\]", answer)
    result.sources = list(set(refs))

    # 5. Optional write-back
    if write_back and answer:
        q_title = f"Q: {question[:80]}"
        fm = {
            "title": q_title,
            "page_type": "query_result",
            "status": "draft",
            "source": "query-derived",
            "question": question,
            "created_at": format_log_timestamp(),
        }
        write_page(WikiPage(title=q_title, content=answer, frontmatter=fm))

        append_log(
            LogEntry(
                timestamp=format_log_timestamp(),
                operation="query",
                title=q_title[:100],
                details=f"Sources: {', '.join(result.sources[:10])}",
            )
        )
        result.written_back = True
        invalidate_graph_cache()

    return result


# ---------------------------------------------------------------------------
# Lint
# ---------------------------------------------------------------------------


def lint_wiki(*, auto_fix: bool = False) -> LintReport:
    """Run a comprehensive health check on the wiki.

    Combines LLM-powered semantic lint with graph-based structural checks.
    """
    issues: list[LintIssue] = []

    # --- Structural checks (graph-based, fast) ---
    try:
        G = get_graph()  # use cache if fresh

        # orphans
        for orphan in find_orphans(G):
            issues.append(
                LintIssue(
                    severity="warning",
                    type="orphan",
                    description=f"Page '{orphan}' has no incoming links",
                    affected_pages=[orphan],
                    suggestion="Add wikilinks from related pages, or consider archiving if no longer relevant.",
                    auto_fixable=False,
                )
            )

        # dead links
        for source, dead in find_dead_links(G):
            issues.append(
                LintIssue(
                    severity="critical",
                    type="dead_link",
                    description=f"Page '{source}' links to non-existent page '{dead}'",
                    affected_pages=[source, dead],
                    suggestion=f"Create the page '{dead}' or remove the broken link.",
                    auto_fixable=False,
                )
            )

        # stats
        stats = graph_stats(G)
    except Exception as exc:
        logger.warning("Graph lint failed: %s", exc)
        stats = {}

    # --- Source integrity check ---
    sources = scan_sources()
    hashes = _get_ingested_hashes()
    for s in sources:
        if s.path in hashes and hashes[s.path] != s.hash:
            issues.append(
                LintIssue(
                    severity="warning",
                    type="source_integrity",
                    description=f"Source '{s.path}' has been modified since last ingest",
                    affected_pages=[s.path],
                    suggestion="Re-ingest this source to update the wiki.",
                    auto_fixable=False,
                )
            )

    # --- LLM-powered semantic lint (sample of pages) ---
    try:
        titles = list_pages()
        if titles:
            # sample up to 10 pages for LLM review
            sample = titles[:10]
            parts = []
            for t in sample:
                page = read_page(t)
                if page:
                    parts.append(f"### {t}\n\n{page.content[:1000]}")
            sample_text = "\n\n---\n\n".join(parts)

            client = get_llm_client()
            raw = client.lint(wiki_pages=sample_text)
            parsed = json.loads(raw)

            for iss in parsed.get("issues", []):
                issues.append(
                    LintIssue(
                        severity=iss.get("severity", "info"),
                        type=iss.get("type", "unknown"),
                        description=iss.get("description", ""),
                        affected_pages=iss.get("affected_pages", []),
                        suggestion=iss.get("suggestion", ""),
                        auto_fixable=iss.get("auto_fixable", False),
                    )
                )
    except Exception as exc:
        logger.warning("LLM lint failed: %s", exc)

    # --- Auto-fix ---
    if auto_fix:
        for iss in issues:
            if iss.auto_fixable and iss.type == "dead_link":
                # Create stub pages for dead links
                for page in iss.affected_pages:
                    if not page_exists(page) and page not in ("index.md", "log.md"):
                        stub = WikiPage(
                            title=page,
                            content=f"# {page}\n\n_This is a stub page. Content to be added._\n",
                            frontmatter={
                                "title": page,
                                "page_type": "concept",
                                "status": "draft",
                                "created_at": format_log_timestamp(),
                            },
                        )
                        write_page(stub)
                        iss.suggestion += " (Stub page auto-created)"

    # --- Compute health score ---
    critical = sum(1 for i in issues if i.severity == "critical")
    warnings = sum(1 for i in issues if i.severity == "warning")
    total = critical + warnings
    if total == 0:
        score = "A"
    elif critical == 0 and warnings <= 3:
        score = "B"
    elif critical <= 2:
        score = "C"
    elif critical <= 5:
        score = "D"
    else:
        score = "F"

    # --- Log ---
    append_log(
        LogEntry(
            timestamp=format_log_timestamp(),
            operation="lint",
            title="Health check",
            details=f"Score: {score} | Critical: {critical} | Warnings: {warnings} | Info: {sum(1 for i in issues if i.severity=='info')}",
        )
    )

    return LintReport(
        health_score=score,
        issues=issues,
        stats=stats,
        summary=f"Health score: {score}. Found {critical} critical, {warnings} warnings, {sum(1 for i in issues if i.severity=='info')} info-level issues.",
    )
