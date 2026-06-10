"""Workbench API – manage multiple wiki projects in separate directories."""

import json
import logging
import shutil
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.config import get_settings, SETTINGS_FILE

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/workbench", tags=["workbench"])

# ---------------------------------------------------------------------------
# Workbench state file
# ---------------------------------------------------------------------------
WORKBENCH_FILE = Path("workbench.json")
BASE_DIR = Path(__file__).resolve().parent.parent


def _load_workbench() -> dict:
    """Load workbench state from disk."""
    if not WORKBENCH_FILE.exists():
        return {"projects": [], "active": None}
    try:
        return json.loads(WORKBENCH_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {"projects": [], "active": None}


def _save_workbench(data: dict) -> None:
    """Persist workbench state to disk."""
    WORKBENCH_FILE.write_text(
        json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8"
    )


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class ProjectCreate(BaseModel):
    name: str
    description: str = ""


class ProjectInfo(BaseModel):
    name: str
    description: str
    wiki_path: str
    raw_path: str
    created_at: str
    page_count: int = 0


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("/projects")
async def list_projects():
    """List all workbench projects."""
    wb = _load_workbench()
    result = []
    for p in wb.get("projects", []):
        wiki_dir = Path(p["wiki_path"])
        raw_dir = Path(p["raw_path"])
        page_count = 0
        if wiki_dir.exists():
            page_count = len(list(wiki_dir.glob("*.md")))
        result.append({
            "name": p["name"],
            "description": p.get("description", ""),
            "wiki_path": str(p["wiki_path"]),
            "raw_path": str(p["raw_path"]),
            "created_at": p.get("created_at", ""),
            "page_count": page_count,
        })
    return {
        "projects": result,
        "active": wb.get("active"),
        "count": len(result),
    }


@router.post("/projects")
async def create_project(project: ProjectCreate):
    """Create a new project with dedicated wiki/ and raw/ directories."""
    name = project.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Project name is required")

    # Sanitize name for directory use
    safe_name = name.replace("/", "-").replace("\\", "-").replace(":", "-").replace(" ", "_")
    project_dir = (BASE_DIR / "projects" / safe_name).resolve()

    wb = _load_workbench()

    # Check for duplicate
    for p in wb.get("projects", []):
        if p["name"] == name:
            raise HTTPException(status_code=409, detail=f"Project '{name}' already exists")

    # Create directories
    wiki_dir = project_dir / "wiki"
    raw_dir = project_dir / "raw"
    try:
        wiki_dir.mkdir(parents=True, exist_ok=True)
        raw_dir.mkdir(parents=True, exist_ok=True)
        # Create minimal index.md
        (wiki_dir / "index.md").write_text(
            "# Index\n\nWelcome to project **{}**.\n".format(name),
            encoding="utf-8",
        )
        # Create minimal log.md
        (wiki_dir / "log.md").write_text(
            "# Log\n\n| Timestamp | Operation | Details |\n|-----------|-----------|----------|\n",
            encoding="utf-8",
        )
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Failed to create project directories: {exc}")

    from datetime import datetime, timezone
    entry = {
        "name": name,
        "description": project.description,
        "wiki_path": str(wiki_dir),
        "raw_path": str(raw_dir),
        "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
    }
    wb.setdefault("projects", []).append(entry)

    # Auto-activate if this is the first project
    if wb.get("active") is None:
        wb["active"] = name
        _apply_project(entry)

    _save_workbench(wb)
    logger.info("Created project '%s' at %s", name, project_dir)
    return {"status": "created", "project": entry}


@router.post("/projects/{name}/activate")
async def activate_project(name: str):
    """Switch the active wiki to a different project."""
    wb = _load_workbench()
    target = None
    for p in wb.get("projects", []):
        if p["name"] == name:
            target = p
            break

    if target is None:
        raise HTTPException(status_code=404, detail=f"Project '{name}' not found")

    _apply_project(target)
    wb["active"] = name
    _save_workbench(wb)

    # Invalidate caches
    from core.config import get_settings
    get_settings.cache_clear()
    from core.graph_engine import invalidate_graph_cache
    invalidate_graph_cache()

    logger.info("Switched to project '%s'", name)
    return {"status": "activated", "project": name}


@router.delete("/projects/{name}")
async def delete_project(name: str, delete_files: bool = False):
    """Delete a project. Set delete_files=true to also remove its directories."""
    wb = _load_workbench()
    target = None
    idx = None
    for i, p in enumerate(wb.get("projects", [])):
        if p["name"] == name:
            target = p
            idx = i
            break

    if target is None:
        raise HTTPException(status_code=404, detail=f"Project '{name}' not found")

    was_active = wb.get("active") == name
    wb["projects"].pop(idx)

    if was_active:
        # Switch to another project or clear active
        if wb["projects"]:
            wb["active"] = wb["projects"][0]["name"]
            _apply_project(wb["projects"][0])
        else:
            wb["active"] = None
            _reset_settings()

    _save_workbench(wb)

    if delete_files:
        project_dir = Path(target["wiki_path"]).parent
        if project_dir.exists():
            shutil.rmtree(project_dir, ignore_errors=True)

    # Invalidate caches
    from core.config import get_settings
    get_settings.cache_clear()
    from core.graph_engine import invalidate_graph_cache
    invalidate_graph_cache()

    logger.info("Deleted project '%s'", name)
    return {"status": "deleted", "project": name}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _apply_project(project: dict) -> None:
    """Update settings.json to point to the project's wiki/raw directories."""
    try:
        user = {}
        if SETTINGS_FILE.exists():
            user = json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
    except Exception:
        user = {}
    user["wiki_path"] = project["wiki_path"]
    user["raw_path"] = project["raw_path"]
    SETTINGS_FILE.write_text(
        json.dumps(user, indent=2, ensure_ascii=False), encoding="utf-8"
    )


def _reset_settings() -> None:
    """Reset wiki_path/raw_path to defaults."""
    try:
        if SETTINGS_FILE.exists():
            user = json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
            user.pop("wiki_path", None)
            user.pop("raw_path", None)
            SETTINGS_FILE.write_text(
                json.dumps(user, indent=2, ensure_ascii=False), encoding="utf-8"
            )
    except Exception:
        pass
