"""Webhook endpoints for external triggers (e.g. GitHub push)."""

import logging

from fastapi import APIRouter, Request, HTTPException

from api.wiki import ingest_source

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webhook", tags=["webhook"])


@router.post("/github")
async def github_webhook(request: Request):
    """Handle a GitHub push webhook.

    For each added or modified Markdown file in the push,
    trigger an ingest against the wiki.
    """
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    results = []
    commits = payload.get("commits", [])

    for commit in commits:
        for f in commit.get("added", []) + commit.get("modified", []):
            if f.endswith(".md"):
                try:
                    result = ingest_source(f)
                    results.append(
                        {
                            "file": f,
                            "status": result.status,
                            "new_pages": result.new_pages,
                            "updated_pages": result.updated_pages,
                        }
                    )
                except Exception as exc:
                    logger.error("Ingest failed for %s: %s", f, exc)
                    results.append({"file": f, "status": "error", "error": str(exc)})

    return {"processed": len(results), "results": results}
