"""Tests for core/wiki_io.py."""

import pytest
from pathlib import Path

from core.wiki_io import (
    WikiPage,
    Source,
    LogEntry,
    compute_hash,
    file_hash,
    read_page,
    write_page,
    delete_page,
    list_pages,
    scan_sources,
    read_source,
    read_index,
    update_index_entry,
    rebuild_index,
    append_log,
    read_log,
    parse_log,
    format_log_timestamp,
    page_exists,
)


class TestHashing:
    def test_compute_hash_string(self):
        h = compute_hash("hello world")
        assert len(h) == 64
        assert compute_hash("hello world") == h  # deterministic

    def test_compute_hash_bytes(self):
        h = compute_hash(b"hello world")
        assert len(h) == 64

    def test_file_hash(self, temp_dir):
        fp = temp_dir / "test.txt"
        fp.write_text("hello")
        h = file_hash(fp)
        assert h == compute_hash("hello")


class TestWikiPageIO:
    def test_write_and_read(self, temp_wiki, monkeypatch):
        monkeypatch.setattr("core.wiki_io._wiki_root", lambda: temp_wiki["wiki"])
        page = WikiPage(
            title="Test Page",
            content="Hello **world**.",
            frontmatter={"title": "Test Page", "page_type": "concept", "status": "active"},
        )
        write_page(page)
        assert page_exists("Test Page")

        loaded = read_page("Test Page")
        assert loaded is not None
        assert loaded.title == "Test Page"
        assert "Hello **world**" in loaded.content
        assert loaded.frontmatter["page_type"] == "concept"

    def test_delete_page(self, temp_wiki, monkeypatch):
        monkeypatch.setattr("core.wiki_io._wiki_root", lambda: temp_wiki["wiki"])
        write_page(WikiPage(title="ToDelete", content="x", frontmatter={"title": "ToDelete"}))
        assert page_exists("ToDelete")
        delete_page("ToDelete")
        assert not page_exists("ToDelete")

    def test_list_pages(self, temp_wiki, monkeypatch):
        monkeypatch.setattr("core.wiki_io._wiki_root", lambda: temp_wiki["wiki"])
        write_page(WikiPage(title="A", content="a", frontmatter={"title": "A", "page_type": "concept"}))
        write_page(WikiPage(title="B", content="b", frontmatter={"title": "B", "page_type": "entity"}))
        pages = list_pages()
        assert "A" in pages
        assert "B" in pages

    def test_full_markdown_roundtrip(self):
        page = WikiPage(
            title="Test",
            content="Body text",
            frontmatter={"title": "Test", "page_type": "concept"},
        )
        md = page.full_markdown
        assert md.startswith("---")
        assert "Body text" in md
        assert "page_type: concept" in md


class TestSourceIO:
    def test_scan_sources(self, temp_wiki, monkeypatch):
        monkeypatch.setattr("core.wiki_io._raw_root", lambda: temp_wiki["raw"])
        (temp_wiki["raw"] / "doc1.md").write_text("# Doc 1")
        (temp_wiki["raw"] / "doc2.txt").write_text("Doc 2")
        sources = scan_sources()
        assert len(sources) == 2
        names = {s.path for s in sources}
        assert "doc1.md" in names

    def test_read_source(self, temp_wiki, monkeypatch):
        monkeypatch.setattr("core.wiki_io._raw_root", lambda: temp_wiki["raw"])
        (temp_wiki["raw"] / "hello.md").write_text("# Hello World")
        content = read_source("hello.md")
        assert content == "# Hello World"

    def test_read_source_missing(self, temp_wiki, monkeypatch):
        monkeypatch.setattr("core.wiki_io._raw_root", lambda: temp_wiki["raw"])
        assert read_source("nonexistent.md") is None


class TestIndex:
    def test_read_empty_index(self, temp_wiki, monkeypatch):
        monkeypatch.setattr("core.wiki_io._wiki_root", lambda: temp_wiki["wiki"])
        assert read_index() == {}

    def test_update_and_read(self, temp_wiki, monkeypatch):
        monkeypatch.setattr("core.wiki_io._wiki_root", lambda: temp_wiki["wiki"])
        update_index_entry("Test Page", "A test page", "concept")
        idx = read_index()
        assert "Test Page" in idx
        assert idx["Test Page"]["summary"] == "A test page"

    def test_rebuild_index(self, temp_wiki, monkeypatch):
        monkeypatch.setattr("core.wiki_io._wiki_root", lambda: temp_wiki["wiki"])
        write_page(WikiPage(
            title="Page A",
            content="content a",
            frontmatter={"title": "Page A", "page_type": "entity", "summary": "Summary A"},
        ))
        rebuild_index()
        idx = read_index()
        assert "Page A" in idx


class TestLog:
    def test_append_and_read(self, temp_wiki, monkeypatch):
        monkeypatch.setattr("core.wiki_io._wiki_root", lambda: temp_wiki["wiki"])
        append_log(LogEntry(
            timestamp="2026-06-09 12:00",
            operation="ingest",
            title="test doc",
            branch="main",
            details="Ingested successfully.",
        ))
        entries = parse_log()
        assert len(entries) >= 1
        assert entries[-1].operation == "ingest"
        assert entries[-1].title == "test doc"

    def test_read_last_n(self, temp_wiki, monkeypatch):
        monkeypatch.setattr("core.wiki_io._wiki_root", lambda: temp_wiki["wiki"])
        for i in range(5):
            append_log(LogEntry(
                timestamp=f"2026-06-09 1{i}:00",
                operation="query",
                title=f"query {i}",
            ))
        recent = read_log(last_n=3)
        assert len(recent) == 3


class TestUtils:
    def test_format_log_timestamp(self):
        ts = format_log_timestamp()
        assert "2026" in ts
        assert ":" in ts
