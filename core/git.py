"""Git operations wrapper for wiki version control."""

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from git import Repo, GitCommandError, Actor

from core.config import get_settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------


@dataclass
class CommitInfo:
    hash: str
    message: str
    author: str
    date: str


@dataclass
class BranchInfo:
    name: str
    is_active: bool


# ---------------------------------------------------------------------------
# Repo helpers
# ---------------------------------------------------------------------------


def _repo_path() -> Path:
    return get_settings().wiki_root


def init_wiki_repo(path: Optional[Path] = None) -> Repo:
    """Initialize a new git repository for the wiki. Creates the directory if needed."""
    target = path or _repo_path()
    target.mkdir(parents=True, exist_ok=True)
    repo = Repo.init(target)
    logger.info("Initialized git repo at %s", target)
    return repo


def open_wiki_repo(path: Optional[Path] = None) -> Repo:
    """Open an existing wiki git repository, or init if none exists."""
    target = path or _repo_path()
    try:
        return Repo(target)
    except Exception:
        logger.info("No git repo at %s – initializing", target)
        return init_wiki_repo(target)


# ---------------------------------------------------------------------------
# Basic operations
# ---------------------------------------------------------------------------


def commit(repo: Repo, message: str) -> Optional[str]:
    """Stage all changes and commit. Returns commit hexsha or None if nothing to commit."""
    if not repo.is_dirty(untracked_files=True):
        logger.debug("Nothing to commit")
        return None
    settings = get_settings()
    repo.git.add(A=True)
    actor = Actor(settings.git_author_name, settings.git_author_email)
    commit_obj = repo.index.commit(message, author=actor, committer=actor)
    logger.info("Committed  %s  %s", commit_obj.hexsha[:8], message)
    return commit_obj.hexsha


def log(repo: Repo, max_count: int = 20) -> list[CommitInfo]:
    """Return recent commits."""
    commits = []
    try:
        for c in repo.iter_commits(max_count=max_count):
            commits.append(
                CommitInfo(
                    hash=c.hexsha,
                    message=c.message.strip(),
                    author=str(c.author),
                    date=c.committed_datetime.isoformat(),
                )
            )
    except Exception:
        pass
    return commits


def diff(repo: Repo, commit_a: str = "HEAD~1", commit_b: str = "HEAD") -> str:
    """Return the diff between two commits."""
    try:
        return repo.git.diff(commit_a, commit_b)
    except GitCommandError:
        return ""


# ---------------------------------------------------------------------------
# Branch operations
# ---------------------------------------------------------------------------


def current_branch(repo: Repo) -> str:
    """Return the name of the currently checked-out branch."""
    try:
        return repo.active_branch.name
    except Exception:
        # Detached HEAD
        return repo.head.commit.hexsha[:8]


def list_branches(repo: Repo) -> list[BranchInfo]:
    """List all local branches."""
    active = current_branch(repo)
    branches = []
    for b in repo.branches:
        branches.append(BranchInfo(name=b.name, is_active=(b.name == active)))
    return branches


def create_branch(repo: Repo, name: str) -> str:
    """Create a new branch from current HEAD and switch to it."""
    branch = repo.create_head(name)
    branch.checkout()
    logger.info("Created and checked out branch  %s", name)
    return name


def checkout(repo: Repo, branch: str) -> None:
    """Switch to an existing branch."""
    repo.git.checkout(branch)
    logger.info("Checked out branch  %s", branch)


def merge(repo: Repo, source_branch: str) -> bool:
    """Merge source_branch into current branch. Returns True on success."""
    try:
        current = current_branch(repo)
        repo.git.merge(source_branch)
        logger.info("Merged  %s  →  %s", source_branch, current)
        return True
    except GitCommandError as exc:
        logger.error("Merge conflict  %s  →  %s : %s", source_branch, current_branch(repo), exc)
        return False


# ---------------------------------------------------------------------------
# Status
# ---------------------------------------------------------------------------


def is_dirty(repo: Repo) -> bool:
    """True if there are uncommitted changes."""
    return repo.is_dirty(untracked_files=True)


def status(repo: Repo) -> dict[str, list[str]]:
    """Return file status: staged, unstaged, untracked."""
    return {
        "staged": [item.a_path for item in repo.index.diff("HEAD")],
        "unstaged": [item.a_path for item in repo.index.diff(None)],
        "untracked": repo.untracked_files,
    }


def file_exists_at_commit(repo: Repo, commit_sha: str, file_path: str) -> bool:
    """Check whether a file existed at a given commit."""
    try:
        repo.git.cat_file("-e", f"{commit_sha}:{file_path}")
        return True
    except GitCommandError:
        return False
