"""Tests for core/config.py."""

import os
from pathlib import Path

from core.config import Settings, get_settings


class TestSettings:
    """Unit tests for Settings model."""

    def test_defaults(self):
        """Defaults should be sensible."""
        s = Settings()
        assert s.wiki_path == "./wiki"
        assert s.raw_path == "./raw"
        assert s.wiki_branch == "main"
        assert s.git_auto_commit is True
        assert s.llm_model == "deepseek-v4-pro"
        assert s.llm_max_retries == 3

    def test_wiki_root_property(self):
        s = Settings(wiki_path="/tmp/test-wiki")
        assert s.wiki_root == Path("/tmp/test-wiki").resolve()

    def test_raw_root_property(self):
        s = Settings(raw_path="/tmp/test-raw")
        assert s.raw_root == Path("/tmp/test-raw").resolve()

    def test_small_llm_fallback(self):
        """Small model API key/base should fall back to primary."""
        s = Settings(llm_api_base="https://primary.api", llm_api_key="pk")
        assert s.small_llm_api_base == "https://primary.api"
        assert s.small_llm_api_key == "pk"

    def test_auto_approve_defaults(self):
        s = Settings()
        assert "update_index" in s.auto_approve_operations
        assert "delete_page" in s.require_approval_operations

    def test_get_settings_singleton(self):
        s1 = get_settings()
        s2 = get_settings()
        assert s1 is s2


class TestSettingsFromEnv:
    """Tests for environment variable loading."""

    def test_env_override(self, monkeypatch):
        monkeypatch.setenv("WIKI_PATH", "/custom/wiki")
        monkeypatch.setenv("LLM_MODEL", "deepseek-chat")
        s = Settings()
        assert s.wiki_path == "/custom/wiki"
        assert s.llm_model == "deepseek-chat"


