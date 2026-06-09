"""Shared test fixtures."""

import os
import tempfile
from pathlib import Path
from unittest.mock import MagicMock

import pytest


@pytest.fixture
def temp_dir():
    """Create a temporary directory. On Windows, ignore cleanup errors from git locks."""
    import tempfile, shutil
    td = tempfile.mkdtemp()
    yield Path(td)
    # Force close any git repos before cleanup
    import gc
    gc.collect()
    shutil.rmtree(td, ignore_errors=True)


@pytest.fixture
def temp_wiki(temp_dir):
    """Create a temporary wiki with raw/ and wiki/ directories."""
    wiki = temp_dir / "wiki"
    raw = temp_dir / "raw"
    wiki.mkdir()
    raw.mkdir()
    return {"wiki": wiki, "raw": raw, "root": temp_dir}


@pytest.fixture
def sample_markdown_page():
    """Return a sample wiki page content with frontmatter."""
    return """---
title: "Test Entity"
page_type: "entity"
status: "active"
summary: "A test entity for unit tests"
sources:
  - file: "test-source.md"
    hash: "abc123def"
confidence: "high"
---

# Test Entity

This is a test entity page. It links to [[Another Page]] and [[Third Page]].

## Details

Some more content here.

Also see [[Fourth Page]] for more info.
"""


@pytest.fixture
def mock_llm_client():
    """Return a mock LLM client that returns predefined JSON responses."""
    mock = MagicMock()

    # Default ingest response
    mock.ingest.return_value = """
{
  "source_summary": {"title": "Test Source", "summary": "A test source document.", "key_claims": ["Claim 1"]},
  "new_pages": [
    {"title": "New Concept", "content": "Content about new concept.", "page_type": "concept", "summary": "New concept summary"},
    {"title": "Another Page", "content": "Another page content.", "page_type": "entity", "summary": "Another page"}
  ],
  "updated_pages": [
    {"title": "Test Entity", "new_content": "Updated content about Test Entity.", "change_description": "Added info from test source"}
  ],
  "contradictions": [
    {"wiki_page": "Test Entity", "claim_in_wiki": "Old claim", "claim_in_source": "New contradictory claim", "resolution_suggestion": "Review both claims"}
  ],
  "relationships": [
    {"from": "New Concept", "to": "Test Entity", "type": "supports"}
  ],
  "index_entries": [
    {"page": "New Concept", "summary": "New concept summary", "category": "concept"},
    {"page": "Test Entity", "summary": "Updated test entity", "category": "entity"}
  ]
}
"""

    # Default query response
    mock.query.return_value = "Based on the wiki, [[Test Entity]] supports this finding. See also [[New Concept]] for details."

    # Default lint response
    mock.lint.return_value = """
{
  "health_score": "B",
  "issues": [
    {
      "severity": "warning",
      "type": "orphan",
      "description": "Page has no incoming links",
      "affected_pages": ["Orphan Page"],
      "suggestion": "Add links from related pages",
      "auto_fixable": false
    }
  ],
  "summary": "Wiki is mostly healthy with 1 warning."
}
"""
    return mock


@pytest.fixture(autouse=True)
def _cleanup_git_repos():
    """Ensure any open git repos are closed after each test (Windows fix)."""
    yield
    import gc
    gc.collect()
    # GitPython keeps mmap handles on Windows; force cleanup
    from git import Repo
    # Close any repos that might still be referenced
    for obj in gc.get_objects():
        if isinstance(obj, Repo):
            try:
                obj.close()
            except Exception:
                pass
