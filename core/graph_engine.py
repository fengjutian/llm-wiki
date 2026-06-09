"""Graph engine – builds and queries a NetworkX graph from wiki pages."""

import logging
import pickle
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import networkx as nx
import yaml

from core.config import get_settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Regex patterns
# ---------------------------------------------------------------------------

WIKILINK_RE = re.compile(r"\[\[([^\]|#]+)(?:[|#][^\]]+)?\]\]")  # [[Page]]  [[Page|alias]]  [[Page#section]]
FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)

# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------


@dataclass
class PageMeta:
    """Metadata extracted from a wiki page."""

    filename: str
    title: str
    page_type: str = "concept"  # entity | concept | source_summary | overview | comparison
    status: str = "active"  # draft | active | stale | contradicted | archived
    confidence: str = "medium"
    sources: list[dict] = field(default_factory=list)
    wikilinks: list[str] = field(default_factory=list)
    relations: list[dict] = field(default_factory=list)
    schema_version: str = ""


@dataclass
class Relation:
    source_page: str
    target_page: str
    relation_type: str  # supports | contradicts | extends | supersedes | references


# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------


def parse_frontmatter(content: str) -> dict:
    """Extract YAML frontmatter from a Markdown string."""
    m = FRONTMATTER_RE.match(content)
    if not m:
        return {}
    try:
        return yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError:
        logger.warning("Invalid YAML frontmatter")
        return {}


def parse_wikilinks(content: str) -> list[str]:
    """Extract [[wikilinks]] from Markdown content."""
    return WIKILINK_RE.findall(content)


def parse_page(filepath: Path) -> PageMeta:
    """Read a Markdown wiki page and extract metadata."""
    content = filepath.read_text(encoding="utf-8")
    fm = parse_frontmatter(content)
    body = FRONTMATTER_RE.sub("", content, count=1)

    return PageMeta(
        filename=filepath.name,
        title=fm.get("title", filepath.stem),
        page_type=fm.get("page_type", "concept"),
        status=fm.get("status", "active"),
        confidence=fm.get("confidence", "medium"),
        sources=fm.get("sources", []),
        wikilinks=parse_wikilinks(body),
        relations=fm.get("relates_to", []),
        schema_version=fm.get("schema_version", ""),
    )


def scan_wiki(wiki_path: Path) -> list[PageMeta]:
    """Scan all .md files in the wiki directory (excluding index.md and log.md)."""
    pages = []
    for f in sorted(wiki_path.rglob("*.md")):
        # skip meta files
        if f.name in ("index.md", "log.md"):
            continue
        try:
            pages.append(parse_page(f))
        except Exception as exc:
            logger.warning("Failed to parse %s : %s", f, exc)
    return pages


# ---------------------------------------------------------------------------
# Graph building
# ---------------------------------------------------------------------------


def build_graph(pages: list[PageMeta]) -> nx.DiGraph:
    """Build a directed graph from parsed wiki pages.

    Nodes = pages.  Edges = wikilinks + declared relations.
    """
    G = nx.DiGraph()

    for p in pages:
        G.add_node(
            p.title,
            filename=p.filename,
            page_type=p.page_type,
            status=p.status,
            confidence=p.confidence,
            sources=p.sources,
        )

    for p in pages:
        # wikilinks  →  edge type "references"
        for target in p.wikilinks:
            if target in G:
                G.add_edge(p.title, target, relation_type="references")

        # declared relations  →  typed edges
        for rel in p.relations:
            target = rel.get("page") or rel.get("target", "")
            rtype = rel.get("rel") or rel.get("type", "references")
            if target and target in G:
                G.add_edge(p.title, target, relation_type=rtype)

    return G


# ---------------------------------------------------------------------------
# Graph queries
# ---------------------------------------------------------------------------


def get_backlinks(G: nx.DiGraph, page: str) -> list[str]:
    """Pages that link TO this page."""
    if page not in G:
        return []
    return list(G.predecessors(page))


def get_wikilinks(G: nx.DiGraph, page: str) -> list[str]:
    """Pages that this page links TO."""
    if page not in G:
        return []
    return list(G.successors(page))


def find_orphans(G: nx.DiGraph) -> list[str]:
    """Pages with zero incoming links."""
    return [n for n in G.nodes if G.in_degree(n) == 0]


def find_dead_links(G: nx.DiGraph) -> list[tuple[str, str]]:
    """Wikilinks pointing to non-existent pages."""
    dead = []
    all_nodes = set(G.nodes)
    for u, v in G.edges:
        if v not in all_nodes:
            dead.append((u, v))
    return dead


def find_paths(G: nx.DiGraph, source: str, target: str, max_len: int = 5) -> list[list[str]]:
    """Find all simple paths between two pages, limited by length."""
    if source not in G or target not in G:
        return []
    try:
        return list(nx.all_simple_paths(G, source, target, cutoff=max_len))
    except nx.NetworkXNoPath:
        return []


# ---------------------------------------------------------------------------
# Statistics
# ---------------------------------------------------------------------------


def graph_stats(G: nx.DiGraph) -> dict:
    """Return summary statistics for the graph."""
    if len(G) == 0:
        return {"nodes": 0, "edges": 0}

    in_degrees = dict(G.in_degree())
    return {
        "nodes": G.number_of_nodes(),
        "edges": G.number_of_edges(),
        "density": nx.density(G),
        "orphans": len(find_orphans(G)),
        "hub_pages": sorted(in_degrees, key=in_degrees.get, reverse=True)[:10],
        "by_type": _count_by_attr(G, "page_type"),
        "by_status": _count_by_attr(G, "status"),
    }


def _count_by_attr(G: nx.DiGraph, attr: str) -> dict:
    counts: dict[str, int] = {}
    for _, data in G.nodes(data=True):
        val = data.get(attr, "unknown")
        counts[val] = counts.get(val, 0) + 1
    return counts


def hub_pages(G: nx.DiGraph, top_n: int = 10) -> list[str]:
    """Pages with the most incoming links."""
    in_deg = dict(G.in_degree())
    return sorted(in_deg, key=in_deg.get, reverse=True)[:top_n]


# ---------------------------------------------------------------------------
# Impact analysis
# ---------------------------------------------------------------------------


def impact_analysis(G: nx.DiGraph, page: str, depth: int = 2) -> list[str]:
    """Return pages affected if `page` changes – transitive successors up to `depth`."""
    if page not in G:
        return []
    affected = set()
    frontier = {page}
    for _ in range(depth):
        next_frontier = set()
        for n in frontier:
            for succ in G.successors(n):
                if succ not in affected and succ != page:
                    affected.add(succ)
                    next_frontier.add(succ)
        frontier = next_frontier
    return sorted(affected)


# ---------------------------------------------------------------------------
# Caching
# ---------------------------------------------------------------------------


def _cache_path() -> Path:
    return get_settings().wiki_root / ".graph_cache.pkl"


def load_cached_graph() -> Optional[nx.DiGraph]:
    """Load graph from pickle cache if available."""
    cp = _cache_path()
    if cp.exists():
        try:
            with open(cp, "rb") as f:
                return pickle.load(f)
        except Exception:
            logger.warning("Failed to load graph cache")
    return None


def save_graph_cache(G: nx.DiGraph) -> None:
    """Persist graph to pickle cache."""
    cp = _cache_path()
    try:
        with open(cp, "wb") as f:
            pickle.dump(G, f)
        logger.debug("Graph cache saved (%d nodes)", G.number_of_nodes())
    except Exception as exc:
        logger.warning("Failed to save graph cache: %s", exc)


def invalidate_graph_cache() -> None:
    """Delete the cached graph."""
    cp = _cache_path()
    if cp.exists():
        cp.unlink()


# ---------------------------------------------------------------------------
# High-level convenience
# ---------------------------------------------------------------------------


def get_graph(force_rebuild: bool = False) -> nx.DiGraph:
    """Get the wiki graph – from cache if available, otherwise build."""
    if not force_rebuild:
        cached = load_cached_graph()
        if cached is not None:
            return cached

    wiki_path = get_settings().wiki_root
    if not wiki_path.exists():
        return nx.DiGraph()

    pages = scan_wiki(wiki_path)
    G = build_graph(pages)
    save_graph_cache(G)
    return G
