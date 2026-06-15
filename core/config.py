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
    wiki_path: str = ""
    raw_path: str = ""
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
    llm_api_base: str = "https://api.deepseek.com/v1"
    llm_api_key: str = ""
    llm_model: str = "deepseek-v4-pro"
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
    # RAG (Retrieval-Augmented Generation)
    # ------------------------------------------------------------------
    rag_enabled: bool = True
    rag_chunk_size: int = 500
    rag_chunk_overlap: int = 50
    rag_top_k: int = 5
    rag_embedding_model: str = ""  # empty = auto-detect from llm_small_model
    rag_persist_dir: str = "./rag_index"

    # ------------------------------------------------------------------
    # Derived / helper
    # ------------------------------------------------------------------
    @property
    def wiki_root(self) -> Path | None:
        if not self.wiki_path:
            return None
        return Path(self.wiki_path).resolve()

    @property
    def raw_root(self) -> Path | None:
        if not self.raw_path:
            return None
        return Path(self.raw_path).resolve()

    @property
    def schema_file(self) -> Path:
        return Path(self.schema_path).resolve()

    @property
    def resolved_small_api_base(self) -> str:
        """Fall back to primary API base if small-model base is not set."""
        return self.llm_small_api_base or self.llm_api_base

    @property
    def resolved_small_api_key(self) -> str:
        """Fall back to primary API key if small-model key is not set."""
        return self.llm_small_api_key or self.llm_api_key


SETTINGS_FILE = Path("settings.json")

# Whitelist: only these keys are user-configurable via the web UI
_USER_CONFIG_KEYS = {
    "llm_api_base", "llm_api_key", "llm_model",
    "llm_small_api_base", "llm_small_api_key", "llm_small_model",
    "llm_max_tokens", "llm_temperature", "llm_max_retries",
}


def load_user_config() -> dict:
    """Load user overrides from settings.json."""
    if not SETTINGS_FILE.exists():
        return {}
    try:
        import json
        return json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save_user_config(data: dict) -> None:
    """Persist user configuration to settings.json (whitelisted keys only).

    Merges with existing config so keys not present in the incoming data are
    preserved. Clears both the settings cache AND the LLM client cache so new
    credentials take effect immediately.
    """
    import json
    # Merge with existing config: incoming values take priority, missing keys preserved
    merged = load_user_config()
    for k, v in data.items():
        if k in _USER_CONFIG_KEYS:
            if v:
                merged[k] = v
            else:
                merged.pop(k, None)  # explicit empty = remove key
    SETTINGS_FILE.write_text(json.dumps(merged, indent=2, ensure_ascii=False), encoding="utf-8")
    get_settings.cache_clear()

    # also force-recreate the LLM client so it picks up the new API key
    from core.llm import get_llm_client
    get_llm_client.cache_clear()


@lru_cache
def get_settings() -> Settings:
    """Return a cached singleton of the application settings.

    Priority: env vars > settings.json > defaults.
    """
    user = load_user_config()
    return Settings(**user)
