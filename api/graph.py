"""Graph API endpoints – visualize and query the wiki knowledge graph."""

from fastapi import APIRouter, Query

from core.graph_engine import (
    get_graph,
    find_orphans,
    find_paths,
    graph_stats,
    hub_pages,
)

router = APIRouter(prefix="/api/graph", tags=["graph"])


@router.get("")
async def get_graph_data():
    """Return full graph data (nodes + edges) for frontend visualization."""
    G = get_graph(force_rebuild=True)
    nodes = [
        {
            "id": n,
            "title": n,
            "page_type": data.get("page_type", "concept"),
            "status": data.get("status", "active"),
            "confidence": data.get("confidence", "medium"),
            "in_degree": G.in_degree(n),
            "out_degree": G.out_degree(n),
        }
        for n, data in G.nodes(data=True)
    ]
    edges = [
        {
            "source": u,
            "target": v,
            "relation_type": data.get("relation_type", "references"),
        }
        for u, v, data in G.edges(data=True)
    ]
    return {"nodes": nodes, "edges": edges}


@router.get("/paths")
async def get_paths(
    source: str = Query(..., description="Source page title"),
    target: str = Query(..., description="Target page title"),
    max_len: int = Query(5, ge=1, le=10),
):
    """Find all paths between two pages."""
    G = get_graph()
    paths = find_paths(G, source, target, max_len)
    return {"source": source, "target": target, "paths": paths, "count": len(paths)}


@router.get("/orphans")
async def get_orphans():
    """List pages with no incoming links."""
    G = get_graph(force_rebuild=True)
    orphans = find_orphans(G)
    return {"orphans": orphans, "count": len(orphans)}


@router.get("/stats")
async def get_stats():
    """Return graph-level statistics."""
    G = get_graph(force_rebuild=True)
    return graph_stats(G)


@router.get("/hubs")
async def get_hubs(top_n: int = Query(10, ge=1, le=50)):
    """Return the most-referenced pages."""
    G = get_graph()
    return {"hubs": hub_pages(G, top_n)}
