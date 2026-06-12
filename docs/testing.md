# LLM Wiki - Testing Documentation

> Version: 1.0 | Date: 2026-06-12

---

## 1. Overview

### 1.1 Test Layers

| Layer | Tool | Scope | Current Coverage |
|-------|------|-------|:---:|
| Python Unit | pytest | core/* modules | 123 tests |
| Python API | pytest + httpx | api/* routes | 12 tests |
| React Component | Vitest + RTL | frontend/src/components | 0 (planned) |
| React Integration | Vitest + RTL | frontend/src/pages | 0 (planned) |
| E2E | Playwright | Full user flows | 0 (planned) |

### 1.2 Running Tests

```
# All Python tests
poetry run python -m pytest tests/ -v

# Specific module
poetry run python -m pytest tests/test_llm.py -v

# With coverage
poetry run python -m pytest tests/ --cov=core --cov=api --cov-report=html

# React tests (after frontend setup)
cd frontend && npm test

# E2E tests
cd frontend && npx playwright test
```

---

## 2. Python Test Architecture

### 2.1 Directory Structure

```
tests/
  conftest.py           Shared fixtures (temp_dir, mock_llm_client)
  test_config.py        Settings, env vars, user config
  test_git.py           Git repo init, commit, branch, merge
  test_graph_engine.py  Graph parsing, wikilinks, backlinks, stats
  test_wiki_io.py       Page read/write, index, log, source scanning
  test_llm.py           LLM client, token estimation, retries, streaming
  test_watcher.py       Folder watcher, session management, events
  test_api_wiki.py      Wiki ingest/query/lint endpoints
  test_api_branch.py    Branch CRUD endpoints
```

### 2.2 Shared Fixtures (conftest.py)

| Fixture | Scope | Purpose |
|---------|-------|---------|
| temp_dir | function | Isolated temp directory, auto-cleanup |
| temp_wiki | function | wiki/ and raw/ dirs inside temp_dir |
| sample_markdown_page | function | Pre-built markdown with frontmatter |
| mock_llm_client | function | MagicMock with default ingest/query/lint responses |

### 2.3 Test Patterns

**Mocking the LLM client:**

```python
def test_ingest_dry_run(self, client, temp_wiki):
    (temp_wiki['raw'] / 'test.md').write_text('# Test Source')
    resp = client.post('/api/wiki/ingest',
        json={'source_path': 'test.md', 'dry_run': True})
    assert resp.status_code == 200
    assert resp.json()['dry_run'] is True
```

**Mocking git operations:**

```python
with patch('core.git.open_wiki_repo', return_value=mock_repo):
    with patch('core.git.current_branch', return_value='main'):
        # Test branch API endpoints
```

**Testing retry logic:**

```python
mock_s.chat.completions.create.side_effect = [
    Exception('timeout'), Exception('timeout'),
]
with pytest.raises(RuntimeError, match='failed after 2 retries'):
    client.chat_completion(messages=[{'role': 'user', 'content': 'hi'}])
```

---

## 3. Current Test Coverage

### 3.1 core/llm.py (38 tests)

| Class | Tests | Coverage |
|-------|:---:|----------|
| TestEstimateTokens | 5 | token count, empty, deterministic, fallback |
| TestTaskClassification | 6 | complex/light task sets, disjoint check |
| TestModelResolution | 7 | explicit model, task routing, client routing |
| TestClientConstruction | 3 | primary build, small build, separate instances |
| TestSchemaLoader | 2 | existing schema file, missing file fallback |
| TestChatCompletion | 6 | content return, json_mode, retries, custom params |
| TestChatCompletionStream | 2 | stream yield, skip None deltas |
| TestConvenienceMethods | 5 | ingest/query/lint call correctness |
| TestGetLLMClient | 2 | singleton, cache clear |

### 3.2 core/watcher.py (32 tests)

| Class | Tests | Coverage |
|-------|:---:|----------|
| TestWatchEvent | 3 | event creation (added/modified/deleted) |
| TestWatchSession | 8 | defaults, options, to_dict variants |
| TestCountMdTxt | 5 | empty, md, txt, other files, recursive |
| TestSetOnFileDetected | 2 | register, unregister callback |
| TestGetWatchStatus | 3 | no session, all, specific |
| TestListWatchedFolders | 2 | empty, with sessions |
| TestStartStopWatching | 9 | start, stop, duplicate, subfolder, all |

### 3.3 api/wiki.py (8 tests)

| Test | What it verifies |
|------|-----------------|
| test_ingest_source_not_found | Returns 'skipped' for missing files |
| test_ingest_dry_run | Dry run doesn't write pages |
| test_ingest_creates_pages | Normal ingest creates wiki pages |
| test_ingest_deduplicates | Same source hash returns 'skipped' |
| test_query_returns_answer | Query returns answer string |
| test_query_empty_question | Empty question handled gracefully |
| test_lint_returns_report | Lint returns health_score + issues |
| test_health_endpoint | /health returns ok |

### 3.4 api/branch.py (4 tests)

| Test | What it verifies |
|------|-----------------|
| test_list_branches | Returns branches array + active |
| test_create_branch_empty_name | Validation returns 422 |
| test_merge_branch | Merge endpoint exists |
| test_compare_branches | Compare returns diff data |

---

## 4. React Test Architecture (Planned)

### 4.1 Toolchain

```
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D @testing-library/user-event jsdom
npm install -D @vitest/coverage-v8
npm install -D playwright @playwright/test
```

### 4.2 vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.*', 'src/test/**'],
    },
  },
})
```

### 4.3 Test Setup

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// Mock fetch globally
globalThis.fetch = vi.fn()
```

### 4.4 Component Test Template

```typescript
// src/components/__tests__/ThemeToggle.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { ThemeToggle } from '../ThemeToggle'

describe('ThemeToggle', () => {
  it('renders light/dark toggle button', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('toggles theme on click', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)
    const button = screen.getByRole('button')
    await user.click(button)
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})
```

### 4.5 Hook Test Template

```typescript
// src/hooks/__tests__/useSSE.test.ts
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useSSE } from '../useSSE'

describe('useSSE', () => {
  it('accumulates chunks from EventSource', () => {
    const { result } = renderHook(() => useSSE('/api/wiki/query/stream'))
    // Mock EventSource message events
    act(() => {
      const event = new MessageEvent('message', { data: 'Hello' })
      // dispatch to the hook's EventSource
    })
    expect(result.current.text).toBe('Hello')
  })
})
```

### 4.6 Page Integration Test Template

```typescript
// src/pages/__tests__/QueryPage.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryPage } from '../QueryPage'

describe('QueryPage', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ answer: 'Mock answer [[Test]]' }),
    } as Response)
  })

  it('submits question and displays answer', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><QueryPage /></MemoryRouter>)

    await user.type(screen.getByPlaceholderText(/ask/i), 'What is Transformer?')
    await user.click(screen.getByRole('button', { name: /ask/i }))

    await waitFor(() => {
      expect(screen.getByText('Mock answer')).toBeInTheDocument()
    })
  })
})
```

---

## 5. E2E Test Architecture (Planned)

### 5.1 Playwright Config

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 1,
  use: {
    baseURL: 'http://127.0.0.1:8089',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'poetry run uvicorn app.main:app --host 127.0.0.1 --port 8089',
    url: 'http://127.0.0.1:8089/health',
    reuseExistingServer: true,
  },
})
```

### 5.2 E2E Test Template

```typescript
// e2e/ingest.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Ingest Flow', () => {
  test('upload a markdown file and see new wiki pages', async ({ page }) => {
    await page.goto('/ingest')
    await page.setInputFiles('input[type=file]', './e2e/fixtures/test.md')
    await page.click('button:has-text("Upload & Ingest")')
    await expect(page.locator('.upload-queue-item .status.ok')).toBeVisible()
    await expect(page.locator('text=new pages created')).toBeVisible()
  })

  test('query returns answer with citations', async ({ page }) => {
    await page.goto('/query')
    await page.fill('textarea', 'What is Transformer?')
    await page.click('button:has-text("Ask")')
    await expect(page.locator('.answer')).toContainText('[[Transformer]]')
  })
})
```

---

## 6. CI/CD Integration

### 6.1 GitHub Actions

```yaml
name: Test

on: [push, pull_request]

jobs:
  python-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: pip install poetry && poetry install --with dev
      - run: poetry run pytest tests/ --cov --cov-report=xml

  react-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: cd frontend && npm ci && npm test -- --coverage

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: pip install poetry && poetry install
      - run: cd frontend && npm ci && npx playwright install
      - run: cd frontend && npx playwright test
```

---

## 7. Test Quality Checklist

- [ ] Every new core/* module has corresponding tests/test_*.py
- [ ] Every new api/* route has HTTP-level tests
- [ ] Every React component has at least render + interaction test
- [ ] Every Zustand store has unit tests for all actions
- [ ] Every custom hook has isolated test with mocked dependencies
- [ ] E2E tests cover: ingest -> query -> lint full flow
- [ ] Coverage thresholds: 80% Python, 70% React
- [ ] Tests run in CI on every push
