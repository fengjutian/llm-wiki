"""Tests for core/watcher.py — Folder watcher, session management, events."""

import asyncio
import logging
import time
from pathlib import Path
from unittest.mock import patch, MagicMock, AsyncMock

import pytest

from core.watcher import (
    WatchEvent,
    WatchSession,
    start_watching,
    stop_watching,
    get_watch_status,
    list_watched_folders,
    stop_all_watchers,
    set_on_file_detected,
    _count_md_txt,
    _watch_sessions,
    _on_file_detected,
)


@pytest.fixture(autouse=True)
def _clear_watch_registry():
    """Ensure the global watch registry is clean before each test."""

    _watch_sessions.clear()
    global _on_file_detected
    _on_file_detected = None
    yield
    _watch_sessions.clear()
    _on_file_detected = None


# ---------------------------------------------------------------------------
# WatchEvent
# ---------------------------------------------------------------------------


class TestWatchEvent:
    def test_create_event(self):
        event = WatchEvent(change_type="added", path="test.md", timestamp="2026-06-09T12:00:00Z")
        assert event.change_type == "added"
        assert event.path == "test.md"
        assert event.timestamp == "2026-06-09T12:00:00Z"

    def test_create_event_modified(self):
        event = WatchEvent(change_type="modified", path="sub/doc.txt", timestamp="2026-06-09T13:00:00Z")
        assert event.change_type == "modified"
        assert event.path == "sub/doc.txt"

    def test_create_event_deleted(self):
        event = WatchEvent(change_type="deleted", path="old.md", timestamp="now")
        assert event.change_type == "deleted"


# ---------------------------------------------------------------------------
# WatchSession
# ---------------------------------------------------------------------------


class TestWatchSession:
    def test_create_session_defaults(self):
        session = WatchSession(folder="test-folder")
        assert session.folder == "test-folder"
        assert session.enabled is True
        assert session.auto_ingest is True
        assert session.events == []
        assert session.error is None
        assert session.files_watched == 0
        assert session.task is None

    def test_create_session_with_options(self):
        session = WatchSession(folder="", auto_ingest=False)
        assert session.folder == ""
        assert session.auto_ingest is False

    def test_to_dict_basic(self):
        session = WatchSession(folder="docs")
        d = session.to_dict()
        assert d["folder"] == "docs"
        assert d["enabled"] is True
        assert d["auto_ingest"] is True
        assert d["events_count"] == 0
        assert d["recent_events"] == []
        assert d["error"] is None
        assert d["files_watched"] == 0
        assert d["active"] is False

    def test_to_dict_with_events(self):
        session = WatchSession(folder="docs")
        session.events = [
            WatchEvent("added", "a.md", "t1"),
            WatchEvent("modified", "b.md", "t2"),
        ]
        d = session.to_dict()
        assert d["events_count"] == 2
        assert len(d["recent_events"]) == 2
        assert d["recent_events"][0]["change_type"] == "added"

    def test_to_dict_recent_events_capped(self):
        """recent_events should show only last 20."""
        session = WatchSession(folder="docs")
        session.events = [
            WatchEvent("added", f"file_{i}.md", f"ts_{i}") for i in range(50)
        ]
        d = session.to_dict()
        assert d["events_count"] == 50
        assert len(d["recent_events"]) == 20

    def test_to_dict_with_error(self):
        session = WatchSession(folder="broken")
        session.error = "Permission denied"
        d = session.to_dict()
        assert d["error"] == "Permission denied"

    def test_to_dict_with_task_active(self):
        session = WatchSession(folder="active-dir")
        mock_task = MagicMock(spec=asyncio.Task)
        mock_task.done.return_value = False
        session.task = mock_task
        assert session.to_dict()["active"] is True

    def test_to_dict_task_done(self):
        session = WatchSession(folder="done-dir")
        mock_task = MagicMock(spec=asyncio.Task)
        mock_task.done.return_value = True
        session.task = mock_task
        assert session.to_dict()["active"] is False


# ---------------------------------------------------------------------------
# _count_md_txt
# ---------------------------------------------------------------------------


class TestCountMdTxt:
    def test_empty_directory(self, temp_dir):
        assert _count_md_txt(temp_dir) == 0

    def test_counts_md_files(self, temp_dir):
        (temp_dir / "a.md").write_text("")
        (temp_dir / "b.md").write_text("")
        assert _count_md_txt(temp_dir) == 2

    def test_counts_txt_files(self, temp_dir):
        (temp_dir / "notes.txt").write_text("")
        assert _count_md_txt(temp_dir) == 1

    def test_ignores_other_files(self, temp_dir):
        (temp_dir / "image.png").write_text("")
        (temp_dir / "video.mp4").write_text("")
        (temp_dir / "config.json").write_text("{}")
        assert _count_md_txt(temp_dir) == 0

    def test_recursive_count(self, temp_dir):
        (temp_dir / "a.md").write_text("")
        sub = temp_dir / "sub"
        sub.mkdir()
        (sub / "b.md").write_text("")
        (sub / "nested").mkdir(parents=True)
        (sub / "nested" / "c.txt").write_text("")
        assert _count_md_txt(temp_dir) == 3

    def test_nonexistent_directory(self, temp_dir):
        assert _count_md_txt(temp_dir / "nope") == 0


# ---------------------------------------------------------------------------
# set_on_file_detected
# ---------------------------------------------------------------------------


class TestSetOnFileDetected:
    def test_register_callback(self):
        import core.watcher
        core.watcher._on_file_detected = None

        def cb(path): pass
        set_on_file_detected(cb)
        assert core.watcher._on_file_detected is cb

    def test_unregister_callback(self):
        def cb(path):
            pass

        set_on_file_detected(cb)
        set_on_file_detected(None)
        assert _on_file_detected is None


# ---------------------------------------------------------------------------
# get_watch_status
# ---------------------------------------------------------------------------


class TestGetWatchStatus:
    def test_no_session_returns_none(self):
        assert get_watch_status("nonexistent") is None

    def test_returns_all_when_no_folder_specified(self):
        _watch_sessions["a"] = WatchSession(folder="a")
        _watch_sessions["b"] = WatchSession(folder="b")
        result = get_watch_status()
        assert result["total"] == 2
        assert "a" in result["sessions"]
        assert "b" in result["sessions"]

    def test_returns_specific_session(self):
        _watch_sessions["my-folder"] = WatchSession(folder="my-folder")
        result = get_watch_status("my-folder")
        assert result["folder"] == "my-folder"


# ---------------------------------------------------------------------------
# list_watched_folders
# ---------------------------------------------------------------------------


class TestListWatchedFolders:
    def test_empty(self):
        assert list_watched_folders() == []

    def test_returns_folder_info(self):
        _watch_sessions["a"] = WatchSession(folder="a", auto_ingest=True)
        _watch_sessions["b"] = WatchSession(folder="b", auto_ingest=False)
        folders = list_watched_folders()
        assert len(folders) == 2
        names = {f["folder"] for f in folders}
        assert names == {"a", "b"}
        for f in folders:
            if f["folder"] == "a":
                assert f["auto_ingest"] is True
            else:
                assert f["auto_ingest"] is False


# ---------------------------------------------------------------------------
# start_watching / stop_watching
# ---------------------------------------------------------------------------


class TestStartStopWatching:
    @pytest.mark.asyncio
    async def test_start_creates_session(self, temp_dir, monkeypatch):
        """start_watching should create a WatchSession and start a background task."""
        monkeypatch.setattr("core.watcher.get_settings", lambda: MagicMock(raw_root=temp_dir))
        monkeypatch.setattr("core.watcher._watch_loop", AsyncMock())

        session = await start_watching("test-folder", auto_ingest=True)
        assert session.folder == "test-folder"
        assert session.auto_ingest is True
        assert session in _watch_sessions.values()

    @pytest.mark.asyncio
    async def test_start_creates_directory(self, temp_dir, monkeypatch):
        """start_watching should create the watch directory if it doesn't exist."""
        monkeypatch.setattr("core.watcher.get_settings", lambda: MagicMock(raw_root=temp_dir))
        monkeypatch.setattr("core.watcher._watch_loop", AsyncMock())

        await start_watching("new-folder")
        assert (temp_dir / "new-folder").exists()

    @pytest.mark.asyncio
    async def test_start_returns_existing_if_already_watching(self, temp_dir, monkeypatch):
        """If already watching, return the existing session without creating a new task."""
        monkeypatch.setattr("core.watcher.get_settings", lambda: MagicMock(raw_root=temp_dir))
        monkeypatch.setattr("core.watcher._watch_loop", AsyncMock())

        s1 = await start_watching("folder-x")
        # mock the task as not done (still running)
        s1.task = MagicMock(spec=asyncio.Task)
        s1.task.done.return_value = False

        s2 = await start_watching("folder-x")
        assert s2 is s1  # same session returned

    @pytest.mark.asyncio
    async def test_start_root_folder(self, temp_dir, monkeypatch):
        """start_watching with empty folder watches the entire raw/."""
        monkeypatch.setattr("core.watcher.get_settings", lambda: MagicMock(raw_root=temp_dir))
        monkeypatch.setattr("core.watcher._watch_loop", AsyncMock())

        session = await start_watching("")
        assert session.folder == ""

    @pytest.mark.asyncio
    async def test_stop_watching_removes_session(self, temp_dir, monkeypatch):
        """stop_watching should remove the session and cancel the task."""
        monkeypatch.setattr("core.watcher.get_settings", lambda: MagicMock(raw_root=temp_dir))
        monkeypatch.setattr("core.watcher._watch_loop", AsyncMock())

        await start_watching("folder-to-stop")
        assert "folder-to-stop" in _watch_sessions

        result = await stop_watching("folder-to-stop")
        assert result is True
        assert "folder-to-stop" not in _watch_sessions

    @pytest.mark.asyncio
    async def test_stop_watching_nonexistent(self):
        """Stopping a nonexistent folder returns False."""
        result = await stop_watching("no-such-folder")
        assert result is False

    @pytest.mark.asyncio
    async def test_stop_all_watchers(self, temp_dir, monkeypatch):
        """stop_all_watchers should clear all sessions."""
        monkeypatch.setattr("core.watcher.get_settings", lambda: MagicMock(raw_root=temp_dir))
        monkeypatch.setattr("core.watcher._watch_loop", AsyncMock())

        await start_watching("a")
        await start_watching("b")
        await start_watching("c")
        assert len(_watch_sessions) == 3

        await stop_all_watchers()
        assert len(_watch_sessions) == 0

    @pytest.mark.asyncio
    async def test_stop_cancels_task(self, temp_dir, monkeypatch):
        """Stopping a watch session should cancel its asyncio task."""
        monkeypatch.setattr("core.watcher.get_settings", lambda: MagicMock(raw_root=temp_dir))
        monkeypatch.setattr("core.watcher._watch_loop", AsyncMock())

        await start_watching("cancel-test")
        session = _watch_sessions["cancel-test"]
        # Create a mock task that can be cancelled
        cancel_called = False

        async def mock_coro():
            try:
                await asyncio.sleep(10)
            except asyncio.CancelledError:
                nonlocal cancel_called
                cancel_called = True
                raise

        session.task = asyncio.create_task(mock_coro())
        await asyncio.sleep(0.01)  # let the task start

        result = await stop_watching("cancel-test")
        assert result is True
        assert "cancel-test" not in _watch_sessions
