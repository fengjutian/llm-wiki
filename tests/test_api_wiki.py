"""Tests for api/wiki.py — Wiki ingest / query / lint API endpoints."""

import json
from pathlib import Path
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient
from app.main import app

SAMPLE_INGEST_JSON = json.dumps({
    "source_summary": {"title": "Test Source", "summary": "A test source document.", "key_claims": ["Claim 1"]},
    "new_pages": [
        {"title": "New Entity", "content": "Content.", "page_type": "entity", "summary": "New entity"},
    ],
    "updated_pages": [],
    "contradictions": [],
    "relationships": [],
    "index_entries": [{"page": "New Entity", "summary": "New entity", "category": "entity"}]
})

@pytest.fixture
def client(temp_wiki):
    with patch("api.wiki.get_llm_client") as mock_llm_fn:
        llm = MagicMock()
        llm.ingest.return_value = SAMPLE_INGEST_JSON
        llm.query.return_value = "Based on the wiki, [[New Entity]] is relevant."
        llm.lint.return_value = json.dumps({"health_score": "B", "issues": [{"severity": "warning", "type": "orphan", "description": "No incoming links", "affected_pages": ["Orphan"], "suggestion": "Add links", "auto_fixable": False}], "summary": "Mostly healthy."})
        llm._load_schema.return_value = "# Schema"
        llm.settings = MagicMock()
        mock_llm_fn.return_value = llm

        with patch("api.wiki.get_settings") as mock_settings:
            s = MagicMock()
            s.wiki_root = temp_wiki["wiki"]
            s.raw_root = temp_wiki["raw"]
            s.schema_file = Path("CLAUDE.md")
            s.wiki_branch = "main"
            s.git_auto_commit = False
            s.git_author_name = "Test"
            s.git_author_email = "test@test.local"
            s.llm_max_retries = 1
            mock_settings.return_value = s
            yield TestClient(app)

class TestWikiIngest:
    def test_ingest_source_not_found(self, client):
        resp = client.post("/api/wiki/ingest", json={"source_path": "nonexistent.md"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "skipped"

    def test_ingest_dry_run(self, client, temp_wiki):
        (temp_wiki["raw"] / "test.md").write_text("# Test Source")
        resp = client.post("/api/wiki/ingest", json={"source_path": "test.md", "dry_run": True})
        assert resp.status_code == 200
        assert resp.json()["dry_run"] is True

    def test_ingest_deduplicates(self, client, temp_wiki):
        (temp_wiki["raw"] / "test.md").write_text("# Test Source")
        client.post("/api/wiki/ingest", json={"source_path": "test.md"})
        resp2 = client.post("/api/wiki/ingest", json={"source_path": "test.md"})
        assert resp2.json()["status"] == "skipped"

class TestWikiQuery:
    def test_query_returns_answer(self, client):
        resp = client.post("/api/wiki/query", json={"question": "What?"})
        assert resp.status_code == 200
        assert "answer" in resp.json()

    def test_query_empty_question(self, client):
        resp = client.post("/api/wiki/query", json={"question": ""})
        assert resp.status_code == 200

class TestWikiLint:
    def test_lint_sync_returns_report(self, client):
        resp = client.post("/api/wiki/lint", json={"async": False})
        assert resp.status_code == 200
        assert "health_score" in resp.json()

    def test_lint_async_returns_task(self, client):
        resp = client.post("/api/wiki/lint", json={"async": True})
        assert resp.status_code == 200
        assert resp.json()["status"] == "started"

class TestHealthEndpoint:
    def test_health_returns_ok(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"
