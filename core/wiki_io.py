"""File I/O utilities for wiki pages, sources, index, and log."""

import hashlib
import json
import logging
import tempfile
import shutil
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import aiofiles
import aiofiles.os as aio_os
from core.config import get_settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------


@dataclass
class WikiPage:
    title: str
    content: str  # raw markdown body (no frontmatter)
    frontmatter: dict = field(default_factory=dict)
    filename: str = ""  # derived from title

    @property
    def full_markdown(self) -> str:
        """Render the page as a complete .md file (frontmatter + body)."""
        if not self.frontmatter:
            return self.content
        import yaml

        fm = yaml.dump(self.frontmatter, allow_unicode=True, default_flow_style=False).strip()
        return f"---\n{fm}\n---\n\n{self.content}"


@dataclass
class Source:
    path: str
    hash: str
    title: str = ""
    ingested_at: Optional[datetime] = None
    status: str = "pending"  # pending | ingested | modified | skipped


@dataclass
class LogEntry:
    timestamp: str
    operation: str  # ingest | query | lint | merge
    title: str
    branch: str = "main"
    details: str = ""


# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

def _wiki_root() -> Path:
    return get_settings().wiki_root


def _raw_root() -> Path:
    return get_settings().raw_root


# ---------------------------------------------------------------------------
# Hashing
# ---------------------------------------------------------------------------


def compute_hash(content: str | bytes) -> str:
    """SHA-256 hex digest."""
    if isinstance(content, str):
        content = content.encode("utf-8")
    return hashlib.sha256(content).hexdigest()


def file_hash(path: Path) -> str:
    """SHA-256 hash of a file's contents."""
    return compute_hash(path.read_bytes())


# ---------------------------------------------------------------------------
# Wiki page I/O
# ---------------------------------------------------------------------------


def _page_filename(title: str) -> str:
    """Convert a page title to a safe filename."""
    safe = title.strip().replace("/", "-").replace("\\", "-").replace(":", "-")
    # limit length
    if len(safe) > 120:
        safe = safe[:120]
    return f"{safe}.md"


def normalize_title(title: str) -> str:
    """Normalize a page title (strip whitespace, consistent casing rules)."""
    return title.strip()


def page_exists(title: str) -> bool:
    return (_wiki_root() / _page_filename(title)).exists()


def read_page(title: str) -> Optional[WikiPage]:
    """Read a wiki page from disk. Returns None if not found."""
    fp = _wiki_root() / _page_filename(title)
    if not fp.exists():
        return None
    raw = fp.read_text(encoding="utf-8")

    # parse frontmatter
    from core.graph_engine import parse_frontmatter

    fm = parse_frontmatter(raw)
    import re

    body = re.sub(r"^---\s*\n.*?\n---\s*\n", "", raw, count=1, flags=re.DOTALL)

    return WikiPage(title=title, content=body.strip(), frontmatter=fm, filename=fp.name)


def write_page(page: WikiPage, *, atomic: bool = True) -> Path:
    """Write a wiki page to disk. Uses atomic write by default (tmp → rename)."""
    fp = _wiki_root() / (page.filename or _page_filename(page.title))
    _wiki_root().mkdir(parents=True, exist_ok=True)

    page.filename = fp.name  # ensure consistent

    if atomic:
        # write to temp file in same directory, then atomic rename
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=_wiki_root(),
            delete=False,
            prefix=".tmp_",
            suffix=".md",
        ) as tmp:
            tmp.write(page.full_markdown)
            tmp_path = Path(tmp.name)
        shutil.move(str(tmp_path), str(fp))
    else:
        fp.write_text(page.full_markdown, encoding="utf-8")

    logger.debug("Wrote page  %s", fp.name)
    return fp


def delete_page(title: str) -> bool:
    """Delete a wiki page. Returns True if deleted."""
    fp = _wiki_root() / _page_filename(title)
    if fp.exists():
        fp.unlink()
        logger.info("Deleted page  %s", title)
        return True
    return False


def list_pages() -> list[str]:
    """List all wiki page titles (excludes index.md and log.md)."""
    root = _wiki_root()
    if not root.exists():
        return []
    titles = []
    for f in sorted(root.rglob("*.md")):
        if f.name in ("index.md", "log.md"):
            continue
        page = read_page(f.stem)
        if page:
            titles.append(page.title)
    return titles


# ---------------------------------------------------------------------------
# Source I/O
# ---------------------------------------------------------------------------


def scan_sources(
    folder: str = "",
    exclude_patterns: list[str] | None = None,
) -> list[Source]:
    """Scan raw/ directory (or a sub-folder) and return source info with hash.

    Args:
        folder: Sub-folder within raw/ to scan. Empty = scan entire raw/.
        exclude_patterns: Glob patterns to exclude (e.g. ['*.tmp', '.gitkeep', 'draft/*']).
    """
    raw = _raw_root()
    base = raw / folder if folder else raw
    if not base.exists():
        return []

    exclude_patterns = exclude_patterns or []
    sources = []
    for f in sorted(base.rglob("*")):
        if not f.is_file() or f.name.startswith("."):
            continue
        if any(f.match(p) for p in exclude_patterns):
            continue
        sources.append(Source(
            path=str(f.relative_to(raw)),
            hash=file_hash(f),
            title=f.stem,
            status="pending",
        ))
    return sources


def read_source(path: str) -> Optional[str]:
    """Read a raw source file. `path` is relative to raw_root."""
    fp = _raw_root() / path
    if not fp.exists():
        return None
    return fp.read_text(encoding="utf-8")


def source_status(source: Source, ingested_hashes: dict[str, str]) -> str:
    """Determine ingest status: pending | ingested | modified | skipped."""
    prev = ingested_hashes.get(source.path)
    if prev is None:
        return "pending"
    if prev == source.hash:
        return "ingested"  # already processed, unchanged
    return "modified"


# ---------------------------------------------------------------------------
# Index (index.md)
# ---------------------------------------------------------------------------


def _index_path() -> Path:
    return _wiki_root() / "index.md"


def read_index() -> dict[str, dict]:
    """Parse index.md into a dict of {page_title: metadata}.  Returns {} if missing."""
    idx = _index_path()
    if not idx.exists():
        return {}
    entries: dict[str, dict] = {}
    current_title = None
    for line in idx.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith("## "):
            # section header – skip categories
            pass
        elif line.startswith("- [["):
            #  - [[Page Title]] – one-line summary
            import re

            m = re.match(r"- \[\[(.+?)\]\]\s*[–—-]\s*(.+)", line)
            if m:
                current_title = m.group(1).strip()
                entries[current_title] = {"summary": m.group(2).strip()}
    return entries


def update_index_entry(title: str, summary: str, category: str = "") -> None:
    """Add or update a single entry in index.md."""
    idx = _index_path()
    current = read_index()

    current[title] = {"summary": summary, "category": category}

    _write_index_file(current)


def rebuild_index() -> None:
    """Completely rebuild index.md from all wiki pages."""
    pages = list_pages()
    entries: dict[str, dict] = {}
    for title in pages:
        page = read_page(title)
        if page:
            summary = page.frontmatter.get("summary", "")
            ptype = page.frontmatter.get("page_type", "concept")
            entries[title] = {"summary": summary, "category": ptype}
    _write_index_file(entries)
    logger.info("Rebuilt index: %d entries", len(entries))


def _write_index_file(entries: dict[str, dict]) -> None:
    """Write index.md from entries dict."""
    _wiki_root().mkdir(parents=True, exist_ok=True)

    # group by category
    by_cat: dict[str, list[tuple[str, str]]] = {}
    for title, meta in entries.items():
        cat = meta.get("category", "other")
        by_cat.setdefault(cat, []).append((title, meta.get("summary", "")))

    lines = ["# Wiki Index\n"]
    for cat in sorted(by_cat):
        lines.append(f"## {cat}\n")
        for title, summary in sorted(by_cat[cat]):
            if summary:
                lines.append(f"- [[{title}]] – {summary}\n")
            else:
                lines.append(f"- [[{title}]]\n")
        lines.append("")

    _index_path().write_text("".join(lines), encoding="utf-8")


# ---------------------------------------------------------------------------
# Log (log.md)
# ---------------------------------------------------------------------------


def _log_path() -> Path:
    return _wiki_root() / "log.md"


def append_log(entry: LogEntry) -> None:
    """Append a single entry to log.md. Thread-safe-ish: append-only."""
    _wiki_root().mkdir(parents=True, exist_ok=True)
    line = f"## [{entry.timestamp}] {entry.operation} | {entry.title}"
    if entry.branch:
        line += f" | branch: {entry.branch}"
    line += f"\n{entry.details}\n\n" if entry.details else "\n\n"

    with open(_log_path(), "a", encoding="utf-8") as f:
        f.write(line)


def read_log(last_n: int = 20) -> list[LogEntry]:
    """Read the most recent N log entries, newest first."""
    lp = _log_path()
    if not lp.exists():
        return []
    entries = parse_log()
    # Reverse: newest first
    entries.reverse()
    return entries[:last_n]


def parse_log() -> list[LogEntry]:
    """Parse all entries from log.md."""
    lp = _log_path()
    if not lp.exists():
        return []

    entries = []
    import re

    pattern = re.compile(
        r"^## \[(.+?)\]\s+(\S+?)\s*\|\s*(.+?)(?:\s*\|\s*branch:\s*(\S+))?\s*$"
    )
    current = None
    details: list[str] = []

    for line in lp.read_text(encoding="utf-8").splitlines():
        m = pattern.match(line.strip())
        if m:
            if current:
                entries.append(LogEntry(**current))
            current = {
                "timestamp": m.group(1),
                "operation": m.group(2),
                "title": m.group(3).strip(),
                "branch": m.group(4) or "main",
                "details": "",
            }
            details = []
        elif current and line.strip():
            details.append(line.strip())

    if current:
        current["details"] = "\n".join(details)
        entries.append(LogEntry(**current))

    return entries


def format_log_timestamp(dt: Optional[datetime] = None) -> str:
    """Return a log-friendly ISO timestamp string."""
    dt = dt or datetime.now(timezone.utc)
    return dt.strftime("%Y-%m-%d %H:%M")
