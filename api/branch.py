"""Branch management API – create, switch, merge, compare."""

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.config import get_settings
from core.git import (
    open_wiki_repo,
    create_branch,
    checkout,
    merge,
    list_branches,
    current_branch,
    diff,
)
from core.wiki_io import append_log, format_log_timestamp, LogEntry

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/branches", tags=["branches"])


class CreateBranchRequest(BaseModel):
    name: str


class MergeRequest(BaseModel):
    source_branch: str
    message: str = ""


# -- CRUD -------------------------------------------------------------------


@router.get("")
async def get_branches():
    """List all local branches."""
    try:
        repo = open_wiki_repo()
        branches = list_branches(repo)
        active = current_branch(repo)
        return {
            "branches": [{"name": b.name, "is_active": b.is_active} for b in branches],
            "active": active,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("")
async def create_new_branch(req: CreateBranchRequest):
    """Create a new branch and switch to it."""
    try:
        repo = open_wiki_repo()
        name = create_branch(repo, req.name)

        append_log(
            LogEntry(
                timestamp=format_log_timestamp(),
                operation="branch_create",
                title=req.name,
                branch=req.name,
                details=f"Created branch from {current_branch(repo)}",
            )
        )
        return {"branch": name, "status": "created"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/{name}/checkout")
async def checkout_branch(name: str):
    """Switch to an existing branch."""
    try:
        repo = open_wiki_repo()
        checkout(repo, name)
        return {"branch": current_branch(repo), "status": "checked_out"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/{name}/merge")
async def merge_branch(name: str, req: MergeRequest = MergeRequest(source_branch="")):
    """Merge source_branch into target branch (name)."""
    try:
        repo = open_wiki_repo()
        source = req.source_branch or name
        ok = merge(repo, source)
        if not ok:
            raise HTTPException(status_code=409, detail="Merge conflict – resolve manually")

        append_log(
            LogEntry(
                timestamp=format_log_timestamp(),
                operation="merge",
                title=f"{source} → {current_branch(repo)}",
                branch=current_branch(repo),
                details=f"Merged {source} into {current_branch(repo)}",
            )
        )
        return {"status": "merged", "source": source, "target": current_branch(repo)}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# -- Compare -----------------------------------------------------------------


@router.get("/compare")
async def compare_branches(
    page: str = "",
    branch_a: str = "main",
    branch_b: str = "",
):
    """Compare a page (or full wiki) across two branches."""
    try:
        repo = open_wiki_repo()
        current = current_branch(repo)

        if not branch_b:
            branch_b = current

        # diff the entire wiki between branches, or a specific page
        try:
            diff_text = diff(repo, branch_a, branch_b)
        except Exception:
            diff_text = f"(cannot diff between {branch_a} and {branch_b})"

        return {
            "branch_a": branch_a,
            "branch_b": branch_b,
            "page": page,
            "diff": diff_text[:10000],  # limit output
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
