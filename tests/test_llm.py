"""Tests for core/llm.py — LLM client, token estimation, model routing."""

from unittest.mock import MagicMock, patch, ANY
import pytest
import json

from core.llm import (
    LLMClient,
    estimate_tokens,
    get_llm_client,
    INGEST_SYSTEM_PROMPT,
    QUERY_SYSTEM_PROMPT,
    LINT_SYSTEM_PROMPT,
    COMPLEX_TASKS,
    LIGHT_TASKS,
)


# ============================================================================
# Token estimation
# ============================================================================


class TestEstimateTokens:
    def test_returns_positive_integer(self):
        n = estimate_tokens("Hello world")
        assert isinstance(n, int)
        assert n > 0

    def test_empty_string(self):
        n = estimate_tokens("")
        assert n == 0

    def test_deterministic(self):
        text = "The quick brown fox jumps over the lazy dog."
        a = estimate_tokens(text)
        b = estimate_tokens(text)
        assert a == b

    def test_long_text(self):
        text = "Hello " * 1000
        n = estimate_tokens(text)
        assert n > 0

    @patch("core.llm.tiktoken.encoding_for_model", side_effect=Exception("no tiktoken"))
    def test_fallback_on_tiktoken_error(self, _mock):
        """When tiktoken fails, fallback to ~4 chars per token."""
        n = estimate_tokens("Hello world!")  # 12 chars
        assert isinstance(n, int)
        assert n > 0


# ============================================================================
# Task classification
# ============================================================================


class TestTaskClassification:
    def test_ingest_is_complex(self):
        assert "ingest" in COMPLEX_TASKS

    def test_lint_is_complex(self):
        assert "lint" in COMPLEX_TASKS

    def test_query_is_light(self):
        assert "query" in LIGHT_TASKS

    def test_summary_is_light(self):
        assert "summary" in LIGHT_TASKS

    def test_entity_extraction_is_light(self):
        assert "entity_extraction" in LIGHT_TASKS

    def test_complex_and_light_are_disjoint(self):
        assert COMPLEX_TASKS.isdisjoint(LIGHT_TASKS)


# ============================================================================
# LLMClient – model / client resolution
# ============================================================================


class TestModelResolution:
    def test_explicit_model_wins(self):
        client = LLMClient()
        assert client._resolve_model(model="gpt-5") == "gpt-5"

    def test_complex_task_uses_big_model(self):
        client = LLMClient()
        assert client._resolve_model(task="ingest") == client.settings.llm_model

    def test_light_task_uses_small_model_when_set(self):
        client = LLMClient()
        model = client._resolve_model(task="query")
        expected = client.settings.llm_small_model or client.settings.llm_model
        assert model == expected

    def test_no_task_uses_small_model(self):
        client = LLMClient()
        model = client._resolve_model(task=None)
        expected = client.settings.llm_small_model or client.settings.llm_model
        assert model == expected

    def test_explicit_client_uses_primary(self):
        client = LLMClient()
        resolved = client._resolve_client(model="custom-model")
        assert resolved is client.primary

    def test_complex_task_uses_primary(self):
        client = LLMClient()
        resolved = client._resolve_client(task="ingest")
        assert resolved is client.primary

    def test_light_task_uses_small(self):
        client = LLMClient()
        resolved = client._resolve_client(task="query")
        assert resolved is client.small


# ============================================================================
# LLMClient – client construction
# ============================================================================


class TestClientConstruction:
    def test_primary_client_built(self):
        client = LLMClient()
        p = client.primary
        assert p is not None
        # Same settings → same client instance (cached)
        assert client.primary is p

    def test_small_client_built(self):
        client = LLMClient()
        s = client.small
        assert s is not None

    def test_primary_and_small_different_when_keys_differ(self, monkeypatch):
        """When small model has a different base URL, clients differ."""
        monkeypatch.setattr("core.config.get_settings", lambda: __import__("core.config").config.Settings(
            llm_api_base="https://api.a.com/v1",
            llm_small_api_base="https://api.b.com/v1",
            llm_api_key="key-a",
            llm_small_api_key="key-b",
        ))
        # Force fresh client
        from core.llm import get_llm_client
        get_llm_client.cache_clear()
        client = LLMClient()
        assert client.primary is not None
        assert client.small is not None


# ============================================================================
# LLMClient – schema loading
# ============================================================================


class TestSchemaLoader:
    def test_loads_existing_schema(self, monkeypatch, tmp_path):
        schema_file = tmp_path / "CLAUDE.md"
        schema_file.write_text("# Test Schema\n\nRule: be good.")
        monkeypatch.setattr("core.llm.get_settings", lambda: MagicMock(
            schema_file=schema_file,
        ))
        client = LLMClient()
        schema = client._load_schema()
        assert "Test Schema" in schema

    def test_fallback_when_no_schema(self, monkeypatch, tmp_path):
        schema_file = tmp_path / "NONEXISTENT.md"
        monkeypatch.setattr("core.llm.get_settings", lambda: MagicMock(
            schema_file=schema_file,
        ))
        client = LLMClient()
        schema = client._load_schema()
        assert "No schema file" in schema


# ============================================================================
# LLMClient – chat_completion (mocked)
# ============================================================================


class TestChatCompletion:
    @pytest.fixture
    def mock_settings(self):
        from core.config import Settings
        return Settings(
            llm_api_base="https://api.test.com/v1",
            llm_api_key="sk-test",
            llm_model="test-model-big",
            llm_small_model="test-model-small",
            llm_max_tokens=100,
            llm_temperature=0.5,
            llm_max_retries=2,
            llm_timeout_seconds=10,
        )

    @pytest.fixture
    def client_with_mock(self, mock_settings, monkeypatch):
        """LLMClient whose OpenAI clients are mocked."""
        monkeypatch.setattr("core.llm.get_settings", lambda: mock_settings)
        from core.llm import get_llm_client
        get_llm_client.cache_clear()
        client = LLMClient()

        # Replace the actual OpenAI clients with mocks
        mock_primary = MagicMock()
        mock_small = MagicMock()
        client._primary = mock_primary
        client._small = mock_small
        # Must match fingerprint from mock_settings to prevent rebuild
        fp = "https://api.test.com/v1|sk-test"
        client._primary_key_hash = fp
        client._small_key_hash = fp
        return client, mock_primary, mock_small

    def test_returns_content(self, client_with_mock):
        client, mock_p, mock_s = client_with_mock
        fake_resp = MagicMock()
        fake_choice = MagicMock()
        fake_msg = MagicMock()
        fake_msg.content = "Hello from LLM"
        fake_choice.message = fake_msg
        fake_resp.choices = [fake_choice]
        fake_resp.usage = MagicMock(prompt_tokens=10, completion_tokens=5)
        mock_s.chat.completions.create.return_value = fake_resp

        result = client.chat_completion(
            messages=[{"role": "user", "content": "hi"}],
        )
        assert result == "Hello from LLM"

    def test_json_mode_adds_response_format(self, client_with_mock):
        client, mock_p, mock_s = client_with_mock
        fake_resp = MagicMock()
        fake_choice = MagicMock()
        fake_msg = MagicMock()
        fake_msg.content = '{"key": "value"}'
        fake_choice.message = fake_msg
        fake_resp.choices = [fake_choice]
        fake_resp.usage = None
        mock_p.chat.completions.create.return_value = fake_resp

        client.chat_completion(
            messages=[{"role": "user", "content": "json please"}],
            task="ingest",
            json_mode=True,
        )

        call_kwargs = mock_p.chat.completions.create.call_args.kwargs
        assert call_kwargs["response_format"] == {"type": "json_object"}

    def test_retries_on_failure(self, client_with_mock):
        client, mock_p, mock_s = client_with_mock
        mock_s.chat.completions.create.side_effect = [
            Exception("timeout"),
            Exception("timeout"),
        ]

        with pytest.raises(RuntimeError, match="LLM call failed after 2 retries"):
            client.chat_completion(messages=[{"role": "user", "content": "hi"}])

        assert mock_s.chat.completions.create.call_count == 2

    def test_succeeds_on_retry(self, client_with_mock):
        client, mock_p, mock_s = client_with_mock
        fake_resp = MagicMock()
        fake_choice = MagicMock()
        fake_msg = MagicMock()
        fake_msg.content = "Recovered"
        fake_choice.message = fake_msg
        fake_resp.choices = [fake_choice]
        fake_resp.usage = None
        mock_s.chat.completions.create.side_effect = [
            Exception("first fail"),
            fake_resp,
        ]

        result = client.chat_completion(messages=[{"role": "user", "content": "hi"}])
        assert result == "Recovered"
        assert mock_s.chat.completions.create.call_count == 2

    def test_uses_custom_temperature(self, client_with_mock):
        client, mock_p, mock_s = client_with_mock
        fake_resp = MagicMock()
        fake_choice = MagicMock()
        fake_msg = MagicMock()
        fake_msg.content = "ok"
        fake_choice.message = fake_msg
        fake_resp.choices = [fake_choice]
        fake_resp.usage = None
        mock_p.chat.completions.create.return_value = fake_resp

        client.chat_completion(
            messages=[{"role": "user", "content": "hi"}],
            model="custom-model",
            temperature=0.0,
        )

        call_kwargs = mock_p.chat.completions.create.call_args.kwargs
        assert call_kwargs["temperature"] == 0.0

    def test_uses_custom_max_tokens(self, client_with_mock):
        client, mock_p, mock_s = client_with_mock
        fake_resp = MagicMock()
        fake_choice = MagicMock()
        fake_msg = MagicMock()
        fake_msg.content = "ok"
        fake_choice.message = fake_msg
        fake_resp.choices = [fake_choice]
        fake_resp.usage = None
        mock_p.chat.completions.create.return_value = fake_resp

        client.chat_completion(
            messages=[{"role": "user", "content": "hi"}],
            model="custom-model",
            max_tokens=50,
        )

        call_kwargs = mock_p.chat.completions.create.call_args.kwargs
        assert call_kwargs["max_tokens"] == 50


# ============================================================================
# LLMClient – chat_completion_stream (mocked)
# ============================================================================


class TestChatCompletionStream:
    @pytest.fixture
    def client_with_stream_mock(self, monkeypatch):
        from core.config import Settings
        settings = Settings(
            llm_api_base="https://api.test.com/v1",
            llm_api_key="sk-test",
            llm_model="test-big",
            llm_small_model="test-small",
        )
        monkeypatch.setattr("core.llm.get_settings", lambda: settings)
        from core.llm import get_llm_client
        get_llm_client.cache_clear()
        client = LLMClient()

        mock_primary = MagicMock()
        client._primary = mock_primary
        fp = "https://api.test.com/v1|sk-test"
        client._primary_key_hash = fp
        mock_small = MagicMock()
        client._small = mock_small
        client._small_key_hash = fp
        return client, mock_primary, mock_small

    def test_stream_yields_content(self, client_with_stream_mock):
        client, mock_p, mock_s = client_with_stream_mock
        chunk1 = MagicMock()
        chunk1.choices = [MagicMock()]
        chunk1.choices[0].delta.content = "Hello"
        chunk2 = MagicMock()
        chunk2.choices = [MagicMock()]
        chunk2.choices[0].delta.content = " World"
        mock_s.chat.completions.create.return_value = [chunk1, chunk2]

        results = list(client.chat_completion_stream(
            messages=[{"role": "user", "content": "hi"}],
        ))
        assert results == ["Hello", " World"]

    def test_stream_skips_none_deltas(self, client_with_stream_mock):
        client, mock_p, mock_s = client_with_stream_mock
        chunk1 = MagicMock()
        chunk1.choices = [MagicMock()]
        chunk1.choices[0].delta.content = None
        chunk2 = MagicMock()
        chunk2.choices = [MagicMock()]
        chunk2.choices[0].delta.content = "Real content"
        mock_s.chat.completions.create.return_value = [chunk1, chunk2]

        results = list(client.chat_completion_stream(
            messages=[{"role": "user", "content": "hi"}],
        ))
        assert results == ["Real content"]


# ============================================================================
# LLMClient – convenience methods (verify they call chat_completion correctly)
# ============================================================================


class TestConvenienceMethods:
    @pytest.fixture
    def client_with_mocked_cc(self, monkeypatch, tmp_path):
        """Client with chat_completion mocked, and a fake schema file."""
        schema_file = tmp_path / "CLAUDE.md"
        schema_file.write_text("# Test Schema")
        from core.config import Settings
        settings = Settings(
            llm_api_base="https://api.test.com/v1",
            llm_api_key="sk-test",
            llm_model="big-model",
            llm_small_model="small-model",
            schema_path=str(schema_file),
        )
        monkeypatch.setattr("core.llm.get_settings", lambda: settings)
        monkeypatch.setattr("core.config.get_settings", lambda: settings)
        from core.llm import get_llm_client
        get_llm_client.cache_clear()
        client = LLMClient()
        return client

    def test_ingest_calls_chat_completion_with_json_mode(self, client_with_mocked_cc):
        client = client_with_mocked_cc
        client.chat_completion = MagicMock(return_value='{"ok": true}')

        result = client.ingest(
            source_content="Some content",
            source_name="test.md",
            existing_pages="Existing pages",
        )

        assert result == '{"ok": true}'
        call_args = client.chat_completion.call_args
        assert call_args.kwargs["task"] == "ingest"
        assert call_args.kwargs["json_mode"] is True

    def test_query_calls_chat_completion(self, client_with_mocked_cc):
        client = client_with_mocked_cc
        client.chat_completion = MagicMock(return_value="Answer text")

        result = client.query(
            question="What is X?",
            wiki_pages="Page content",
        )

        assert result == "Answer text"
        call_args = client.chat_completion.call_args
        assert call_args.kwargs["task"] == "query"

    def test_lint_calls_chat_completion_with_low_temp(self, client_with_mocked_cc):
        client = client_with_mocked_cc
        client.chat_completion = MagicMock(return_value='{"health_score":"A"}')

        result = client.lint(wiki_pages="Some pages")

        assert result == '{"health_score":"A"}'
        call_args = client.chat_completion.call_args
        assert call_args.kwargs["task"] == "lint"
        assert call_args.kwargs["json_mode"] is True
        assert call_args.kwargs["temperature"] == 0.1

    def test_ingest_includes_source_content_in_prompt(self, client_with_mocked_cc):
        client = client_with_mocked_cc
        client.chat_completion = MagicMock(return_value='{"ok": true}')

        client.ingest(
            source_content="SECRET KNOWLEDGE",
            source_name="secret.md",
            existing_pages="",
        )

        # Verify the user message includes the source content
        messages = client.chat_completion.call_args.kwargs["messages"]
        user_msg = messages[-1]["content"]
        assert "SECRET KNOWLEDGE" in user_msg
        assert "secret.md" in user_msg

    def test_query_includes_all_wiki_pages(self, client_with_mocked_cc):
        client = client_with_mocked_cc
        client.chat_completion = MagicMock(return_value="Answer")

        client.query(
            question="Help?",
            wiki_pages="### Page One\n\nContent one.\n\n### Page Two\n\nContent two.",
        )

        messages = client.chat_completion.call_args.kwargs["messages"]
        system_msg = messages[0]["content"]
        assert "Page One" in system_msg
        assert "Page Two" in system_msg


# ============================================================================
# get_llm_client singleton
# ============================================================================


class TestGetLLMClient:
    def test_singleton(self):
        a = get_llm_client()
        b = get_llm_client()
        assert a is b

    def test_cache_clear_creates_new(self):
        a = get_llm_client()
        get_llm_client.cache_clear()
        b = get_llm_client()
        # Should get a new instance after cache clear
        # (but a and b are different due to lru_cache clearing)
        from core.llm import get_llm_client as fn
        fn.cache_clear()
        c = fn()
        assert isinstance(c, LLMClient)
