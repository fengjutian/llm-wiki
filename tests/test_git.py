"""Tests for core/git.py."""

import gc
import pytest
from git import Repo

from core.git import (
    init_wiki_repo,
    open_wiki_repo,
    commit,
    log,
    current_branch,
    create_branch,
    checkout,
    list_branches,
    merge,
    is_dirty,
    status,
)


class TestGitBasics:
    """Basic git operations."""

    def test_init_repo(self, temp_dir):
        repo = init_wiki_repo(temp_dir / "wiki")
        assert repo is not None
        assert (temp_dir / "wiki" / ".git").exists()

    def test_open_existing_repo(self, temp_dir):
        init_wiki_repo(temp_dir / "wiki")
        repo = open_wiki_repo(temp_dir / "wiki")
        assert repo is not None

    def test_open_creates_if_missing(self, temp_dir):
        repo = open_wiki_repo(temp_dir / "new-wiki")
        assert repo is not None
        assert (temp_dir / "new-wiki" / ".git").exists()


class TestCommit:
    """Commit operations."""

    def test_commit_no_changes(self, temp_dir):
        repo = init_wiki_repo(temp_dir / "wiki")
        result = commit(repo, "empty commit")
        assert result is None  # nothing to commit

    def test_commit_with_changes(self, temp_dir):
        repo = init_wiki_repo(temp_dir / "wiki")
        (temp_dir / "wiki" / "test.md").write_text("# Test")
        result = commit(repo, "add test page")
        assert result is not None
        assert len(result) == 40  # full sha

    def test_log_returns_commits(self, temp_dir):
        repo = init_wiki_repo(temp_dir / "wiki")
        (temp_dir / "wiki" / "a.md").write_text("a")
        commit(repo, "first")
        (temp_dir / "wiki" / "b.md").write_text("b")
        commit(repo, "second")
        entries = log(repo)
        assert len(entries) >= 2


class TestBranchOps:
    """Branch operations."""

    def test_current_branch_default(self, temp_dir):
        repo = init_wiki_repo(temp_dir / "wiki")
        assert current_branch(repo) in ("main", "master")

    def test_create_and_switch_branch(self, temp_dir):
        repo = init_wiki_repo(temp_dir / "wiki")
        # need an initial commit first
        (temp_dir / "wiki" / "init.md").write_text("init")
        commit(repo, "initial")
        create_branch(repo, "draft/test")
        assert current_branch(repo) == "draft/test"

    def test_checkout_existing(self, temp_dir):
        repo = init_wiki_repo(temp_dir / "wiki")
        (temp_dir / "wiki" / "init.md").write_text("init")
        commit(repo, "initial")
        original = current_branch(repo)
        create_branch(repo, "feature/x")
        checkout(repo, original)
        assert current_branch(repo) == original

    def test_list_branches(self, temp_dir):
        repo = init_wiki_repo(temp_dir / "wiki")
        (temp_dir / "wiki" / "init.md").write_text("init")
        commit(repo, "initial")
        create_branch(repo, "branch-a")
        create_branch(repo, "branch-b")
        branches = list_branches(repo)
        names = {b.name for b in branches}
        assert "branch-a" in names
        assert "branch-b" in names
        active = [b for b in branches if b.is_active]
        assert len(active) == 1
        assert active[0].name == "branch-b"

    def test_merge_fast_forward(self, temp_dir):
        repo = init_wiki_repo(temp_dir / "wiki")
        (temp_dir / "wiki" / "init.md").write_text("init")
        commit(repo, "initial")
        original = current_branch(repo)
        create_branch(repo, "feature/z")
        (temp_dir / "wiki" / "feat.md").write_text("feat")
        commit(repo, "feature work")
        checkout(repo, original)
        ok = merge(repo, "feature/z")
        assert ok is True


class TestStatus:
    """File status."""

    def test_is_dirty(self, temp_dir):
        repo = init_wiki_repo(temp_dir / "wiki")
        assert not is_dirty(repo)
        (temp_dir / "wiki" / "new.md").write_text("new")
        assert is_dirty(repo)

    def test_status_untracked(self, temp_dir):
        repo = init_wiki_repo(temp_dir / "wiki")
        # need at least one commit so HEAD exists
        (temp_dir / "wiki" / "initial.md").write_text("x")
        commit(repo, "initial")
        (temp_dir / "wiki" / "untracked.md").write_text("x")
        s = status(repo)
        assert "untracked.md" in s["untracked"]
