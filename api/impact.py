"""Impact analysis API – determine which pages are affected by a change."""

from fastapi import APIRouter, Query
from pydantic import BaseModel

from core.graph_engine import get_graph, impact_analysis

router = APIRouter(prefix="/api/impact", tags=["impact"])


class AnalyzeRequest(BaseModel):
    page: str
    depth: int = 2


@router.post("/analyze")
async def analyze_impact(req: AnalyzeRequest):
    """Analyze the impact radius of changing a given page.

    Returns all pages transitively linked (outgoing) up to `depth` hops.
    """
    G = get_graph(force_rebuild=True)
    affected = impact_analysis(G, req.page, req.depth)
    return {
        "page": req.page,
        "depth": req.depth,
        "affected_pages": affected,
        "count": len(affected),
    }
