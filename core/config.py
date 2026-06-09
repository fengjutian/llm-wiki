"""Application configuration loaded from environment variables."""

from pathlib import Path
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration for LLM Wiki.

    All values can be overridden via environment variables or a .env file.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ------------------------------------------------------------------
    # Paths
    # ------------------------------------------------------------------
    wiki_path: str = "./wiki"
    raw_path: str = "./raw"
    schema_path: str = "./CLAUDE.md"

    # ------------------------------------------------------------------
    # Git / Branch
    # ------------------------------------------------------------------
    wiki_branch: str = "main"
    default_branch: str = "main"
    git_auto_commit: bool = True
    git_author_name: str = "LLM Wiki"
    git_author_email: str = "wiki@llm-wiki.local"

    # ------------------------------------------------------------------
    # LLM – primary model (complex tasks: analysis, contradiction detection)
    # ------------------------------------------------------------------
    llm_api_base: str = "https://api.openai.com/v1"
    llm_api_key: str = ""
    llm_model: str = "gpt-4o"
    llm_max_tokens: int = 16384
    llm_temperature: float = 0.3
    llm_max_retries: int = 3
    llm_timeout_seconds: int = 120

    # ------------------------------------------------------------------
    # LLM – small / fast model (light tasks: summarisation, entity extraction)
    # ------------------------------------------------------------------
    llm_small_api_base: str = ""
    llm_small_api_key: str = ""
    llm_small_model: str = "gpt-4o-mini"
    llm_small_max_tokens: int = 8192
    llm_small_temperature: float = 0.2

    # ------------------------------------------------------------------
    # Token budget
    # ------------------------------------------------------------------
    token_budget_warn_percent: int = 80  # warn when context usage exceeds this

    # ------------------------------------------------------------------
    # Human-in-the-loop – which operations can run fully automatically
    # ------------------------------------------------------------------
    auto_approve_operations: list[str] = [
        "add_wikilink",
        "update_index",
        "append_log",
        "update_entity_summary",
    ]
    require_approval_operations: list[str] = [
        "delete_page",
        "modify_schema",
        "merge_branch",
        "rewrite_synthesis",
    ]

    # ------------------------------------------------------------------
    # Cache
    # ------------------------------------------------------------------
    query_cache_enabled: bool = True
    graph_cache_enabled: bool = True

    # ------------------------------------------------------------------
    # Derived / helper
    # ------------------------------------------------------------------
    @property
    def wiki_root(self) -> Path:
        return Path(self.wiki_path).resolve()

    @property
    def raw_root(self) -> Path:
        return Path(self.raw_path).resolve()

    @property
    def schema_file(self) -> Path:
        return Path(self.schema_path).resolve()

    @property
    def small_llm_api_base(self) -> str:
        """Fall back to primary API base if small-model base is not set."""
        return self.llm_small_api_base or self.llm_api_base

    @property
    def small_llm_api_key(self) -> str:
        """Fall back to primary API key if small-model key is not set."""
        return self.llm_small_api_key or self.llm_api_key


@lru_cache
def get_settings() -> Settings:
    """Return a cached singleton of the application settings."""
    return Settings()
