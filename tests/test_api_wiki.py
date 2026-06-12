"""Tests for api/wiki.py — Wiki ingest / query / lint API endpoints."""

import json
import logging
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest
from fastapi.testclient import TestClient

from app.main import app

logger = logging.getLogger(__name__)

# Sample LLM ingest response
SAMPLE_INGEST_JSON = json.dumps({
    "source_summary": {"title": "Test Source", "summary": "A test source document.", "key_claims": ["Claim 1"]},
    "new_pages": [
        {"title": "New Entity", "content": "Content about new entity. Links to [[Existing Page]].", "page_type": "entity", "summary": "New entity summary"},
        {"title": "New Concept", "content": "Content about new concept.", "page_type": "concept", "summary": "New concept summary"}
    ],
    "updated_pages": [
        {"title": "Existing Page", "new_content": "Updated content about Existing Page.", "change_description": "Added info from test source"}
    ],
    "contradictions": [
        {"wiki_page": "Existing Page", "claim_in_wiki": "Old claim", "claim_in_source": "New contradictory claim", "resolution_suggestion": "Review both claims"}
    ],
    "relationships": [{"from": "New Entity", "to": "Existing Page", "type": "supports"}],
    "index_entries": [
        {"page": "New Entity", "summary": "New entity summary", "category": "entity"},
        {"page": "New Concept", "summary": "New concept summary", "category": "concept"}
    ]
})


@pytest.fixture
def client(temp_wiki):
    """Create a TestClient with mocked LLM."""
    with patch("core.config.get_settings") as mock_settings:
        s = MagicMock()
        s.wiki_root = temp_wiki["wiki"]
        s.raw_root = temp_wiki["raw"]
        s.schema_file = Path("CLAUDE.md")
        s.wiki_branch = "main"
        s.default_branch = "main"
        s.git_auto_commit = False
        s.git_author_name = "Test"
        s.git_author_email = "test@test.local"
        s.llm_max_retries = 1
        s.llm_timeout_seconds = 10
        mock_settings.return_value = s
        with patch("core.llm.get_llm_client") as mock_llm:
            llm = MagicMock()
            llm.ingest.return_value = SAMPLE_INGEST_JSON
            llm.query.return_value = "Based on the wiki, [[New Entity]] supports this finding. See [[Existing Page]] for context."
            llm.lint.return_value = json.dumps({
                "health_score": "B",
                "issues": [
                    {"severity": "warning", "type": "orphan", "description": "Page has no incoming links", "affected_pages": ["Orphan Page"], "suggestion": "Add links from related pages", "auto_fixable": False}
                ],
                "summary": "Wiki is mostly healthy with 1 warning."
            })
            llm.settings = s
            mock_llm.return_value = llm
            yield TestClient(app)


class TestWikiIngest:
    """Tests for POST /api/wiki/ingest."""

    def test_ingest_source_not_found(self, client):
        resp = client.post("/api/wiki/ingest", json={"source_path": "nonexistent.md"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "skipped"

    def test_ingest_dry_run(self, client, temp_wiki):
        (temp_wiki["raw"] / "test.md").write_text("# Test Source")
        resp = client.post("/api/wiki/ingest", json={"source_path": "test.md", "dry_run": True})
        assert resp.status_code == 200
        data = resp.json()
        assert data["dry_run"] is True
        assert "New Entity" in data["new_pages"]

    def test_ingest_creates_pages(self, client, temp_wiki):
        (temp_wiki["raw"] / "test.md").write_text("# Test Source Content")
        resp = client.post("/api/wiki/ingest", json={"source_path": "test.md"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] in ("ingested", "modified", "skipped")
        assert "New Entity" in data["new_pages"]

    def test_ingest_deduplicates(self, client, temp_wiki):
        raw = temp_wiki["raw"]
        wiki = temp_wiki["wiki"]
        (raw / "test.md").write_text("# Test Source")
        # first ingest
        resp1 = client.post("/api/wiki/ingest", json={"source_path": "test.md"})
        # second ingest with same content - should skip
        resp2 = client.post("/api/wiki/ingest", json={"source_path": "test.md"})
        data2 = resp2.json()
        assert data2["status"] == "skipped"


class TestWikiQuery:
    """Tests for POST /api/wiki/query."""

    def test_query_returns_answer(self, client):
        resp = client.post("/api/wiki/query", json={"question": "What is this about?"})
        assert resp.status_code == 200
        data = resp.json()
        assert "answer" in data
        assert len(data["answer"]) > 0

    def test_query_empty_question(self, client):
        resp = client.post("/api/wiki/query", json={"question": ""})
        assert resp.status_code == 200
        data = resp.json()
        assert "answer" in data


class TestWikiLint:
    """Tests for POST /api/wiki/lint."""

    def test_lint_returns_report(self, client):
        resp = client.post("/api/wiki/lint")
        assert resp.status_code == 200
        data = resp.json()
        assert "health_score" in data
        assert "issues" in data
        assert isinstance(data["issues"], list)
        assert data["health_score"] in ("A", "B", "C", "D", "F")

    def test_lint_issues_have_required_fields(self, client):
        resp = client.post("/api/wiki/lint")
        data = resp.json()
        for issue in data["issues"]:
            assert "severity" in issue
            assert "type" in issue
            assert "description" in issue


class TestHealthEndpoint:
    """Tests for GET /health."""

    def test_health_returns_ok(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
