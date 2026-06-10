"""Folder watcher – monitors raw/ sub-directories for new/modified source files.

Uses watchfiles for efficient file-system monitoring and auto-ingests
newly detected files.
"""

from __future__ import annotations

import asyncio
import logging
import threading
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Awaitable, Callable, Optional, Union

from watchfiles import awatch

from core.config import get_settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------


@dataclass
class WatchEvent:
    """A single file-system event detected by the watcher."""

    change_type: str  # added | modified | deleted
    path: str
    timestamp: str


@dataclass
class WatchSession:
    """State for a single watched folder."""

    folder: str  # relative path within raw/
    task: asyncio.Task | None = None
    enabled: bool = True
    auto_ingest: bool = True
    events: list[WatchEvent] = field(default_factory=list)
    error: str | None = None
    files_watched: int = 0

    def to_dict(self) -> dict:
        return {
            "folder": self.folder,
            "enabled": self.enabled,
            "auto_ingest": self.auto_ingest,
            "events_count": len(self.events),
            "recent_events": [
                {"change_type": e.change_type, "path": e.path, "timestamp": e.timestamp}
                for e in self.events[-20:]
            ],
            "error": self.error,
            "files_watched": self.files_watched,
            "active": self.task is not None and not self.task.done(),
        }


# ---------------------------------------------------------------------------
# Global watch registry
# ---------------------------------------------------------------------------

_watch_sessions: dict[str, WatchSession] = {}

# Callback invoked when new files are detected (set by main.py to trigger ingest)
_on_file_detected: Callable[[str], Any] | None = None


def set_on_file_detected(callback: Callable[[str], Any]) -> None:
    """Register a callback for newly detected files (full relative path in raw/).

    The callback may be sync or async. If async, it will be awaited.
    """
    global _on_file_detected
    _on_file_detected = callback


# ---------------------------------------------------------------------------
# Watch operations
# ---------------------------------------------------------------------------


async def start_watching(
    folder: str = "",
    *,
    auto_ingest: bool = True,
) -> WatchSession:
    """Start watching a folder under raw/.

    Args:
        folder: Relative path within raw/. Empty string = watch entire raw/.
        auto_ingest: If True, auto-ingest newly detected .md/.txt files.

    Returns:
        WatchSession describing the watch state.
    """
    if folder in _watch_sessions:
        existing = _watch_sessions[folder]
        if existing.task and not existing.task.done():
            return existing  # already watching

    session = WatchSession(folder=folder, auto_ingest=auto_ingest)
    _watch_sessions[folder] = session

    settings = get_settings()
    watch_dir = settings.raw_root / folder if folder else settings.raw_root
    watch_dir.mkdir(parents=True, exist_ok=True)

    # Count initial files
    session.files_watched = _count_md_txt(watch_dir)

    # Start background watcher
    session.task = asyncio.create_task(_watch_loop(session, watch_dir))
    logger.info("Started watching folder: %s (auto_ingest=%s)", folder or "/", auto_ingest)
    return session


async def stop_watching(folder: str = "") -> bool:
    """Stop watching a folder. Returns True if a session was stopped."""
    session = _watch_sessions.pop(folder, None)
    if session and session.task and not session.task.done():
        session.task.cancel()
        try:
            await session.task
        except asyncio.CancelledError:
            pass
        logger.info("Stopped watching folder: %s", folder or "/")
        return True
    return False


def get_watch_status(folder: str = "") -> dict | None:
    """Get the status of a watch session, or all sessions if folder is empty."""
    if folder:
        session = _watch_sessions.get(folder)
        return session.to_dict() if session else None

    return {
        "sessions": {k: v.to_dict() for k, v in _watch_sessions.items()},
        "total": len(_watch_sessions),
    }


def list_watched_folders() -> list[dict]:
    """List all currently watched folders."""
    return [
        {
            "folder": folder,
            "enabled": s.enabled,
            "auto_ingest": s.auto_ingest,
            "active": s.task is not None and not s.task.done(),
            "files_watched": s.files_watched,
            "events_count": len(s.events),
            "error": s.error,
        }
        for folder, s in _watch_sessions.items()
    ]


async def stop_all_watchers() -> None:
    """Stop all active watch sessions."""
    for folder in list(_watch_sessions.keys()):
        await stop_watching(folder)


# ---------------------------------------------------------------------------
# Internal watch loop
# ---------------------------------------------------------------------------


def _count_md_txt(directory: Path) -> int:
    """Count .md and .txt files recursively in a directory."""
    if not directory.exists():
        return 0
    count = 0
    for p in directory.rglob("*"):
        if p.is_file() and p.suffix.lower() in (".md", ".txt"):
            count += 1
    return count


async def _watch_loop(session: WatchSession, watch_dir: Path) -> None:
    """Background coroutine that watches a directory for changes."""
    from datetime import datetime, timezone

    try:
        async for changes in awatch(watch_dir, debounce=2000, step=500):
            if not session.enabled:
                continue

            timestamp = datetime.now(timezone.utc).isoformat()

            for change_type, path_str in changes:
                path = Path(path_str)

                # Only care about .md and .txt files
                if path.suffix.lower() not in (".md", ".txt"):
                    continue

                # Map watchfiles change type
                change_map = {1: "added", 2: "modified", 3: "deleted"}
                ct = change_map.get(change_type, "unknown")

                # Compute relative path from raw root
                settings = get_settings()
                try:
                    rel_path = str(path.relative_to(settings.raw_root))
                except ValueError:
                    rel_path = str(path)

                event = WatchEvent(change_type=ct, path=rel_path, timestamp=timestamp)
                session.events.append(event)
                logger.info("Watch event: %s → %s", ct, rel_path)

                # Auto-ingest new/modified files
                if session.auto_ingest and ct in ("added", "modified"):
                    if _on_file_detected:
                        try:
                            result = _on_file_detected(rel_path)
                            # Support async callbacks
                            if asyncio.iscoroutine(result):
                                await result
                        except Exception as exc:
                            logger.error("Auto-ingest callback failed for %s: %s", rel_path, exc)

                # Update file count
                session.files_watched = _count_md_txt(watch_dir)

                # Cap events list
                if len(session.events) > 500:
                    session.events = session.events[-200:]

    except asyncio.CancelledError:
        logger.info("Watch loop cancelled for: %s", session.folder or "/")
        raise
    except Exception as exc:
        session.error = str(exc)
        logger.exception("Watch loop error for %s", session.folder or "/")
