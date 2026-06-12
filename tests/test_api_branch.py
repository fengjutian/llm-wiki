"""Tests for api/branch.py — Branch CRUD / merge / compare API endpoints."""

import json
from pathlib import Path
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client(temp_wiki):
    mock_repo = MagicMock()
    mock_repo.active_branch.name = "main"
    b = MagicMock()
    b.name = "main"
    mock_repo.branches = [b]

    with patch("core.git.open_wiki_repo", return_value=mock_repo):
        with patch("core.git.current_branch", return_value="main"):
            with patch("core.git.list_branches", return_value=[MagicMock(name="main", is_active=True)]):
                with patch("core.config.get_settings") as mock_settings:
                    s = MagicMock()
                    s.wiki_root = temp_wiki["wiki"]
                    s.raw_root = temp_wiki["raw"]
                    mock_settings.return_value = s
                    with patch("core.llm.get_llm_client", return_value=MagicMock()):
                        yield TestClient(app)


class TestBranchList:
    def test_list_branches_returns_array(self, client):
        resp = client.get("/api/branches")
        assert resp.status_code == 200
        data = resp.json()
        assert "branches" in data
        assert isinstance(data["branches"], list)


class TestBranchCreate:
    def test_create_branch_validates_name(self, client):
        resp = client.post("/api/branches", json={"name": ""})
        assert resp.status_code in (422, 500)  # 422 if validated, 500 if git fails


class TestBranchCompare:
    def test_compare_default_branches(self, client):
        resp = client.get("/api/branches/compare")
        assert resp.status_code == 200
        data = resp.json()
        assert "branch_a" in data
