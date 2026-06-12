# LLM Wiki — Jinja2 → React + TypeScript 迁移方案

> 版本: 1.0 | 日期: 2026-06-12

---

## 1. 现状分析

### 1.1 当前架构

`
FastAPI 后端 (app/main.py)
├── 35+ REST API 端点 (JSON)          ← 完整 API 层，可直接供 React 消费
├── 13 个 Jinja2 模板渲染路由           ← SSR 页面，每页一个模板
│   ├── base.html       (7KB)  布局壳 + 主题 + Toast + 健康轮询
│   ├── ingest.html     (33KB) 上传/文件夹监视器/扫描  ← 最复杂
│   ├── raw.html        (24KB) 源文件管理 + 批量 ingest
│   ├── index.html      (10KB) Wiki 浏览器 + 预览抽屉
│   ├── graph.html      (9KB)  D3 力导向图
│   ├── query.html      (7KB)  SSE 流式查询
│   ├── workbench.html  (8KB)  项目管理
│   ├── lint.html       (6KB)  健康检查 + 轮询
│   ├── config.html     (6KB)  配置表单
│   ├── branches.html   (2KB)  Git 分支管理
│   ├── log.html        (4KB)  操作日志
│   └── page.html       (2KB)  Wiki 页面详情
└── static/css/style.css    全局样式 (CSS 变量 + 深色/浅色)
`

### 1.2 各页面复杂度评估

| 模板 | 大小 | JS行数 | 复杂度 | 关键交互 |
|------|------|:---:|:---:|------|
| base.html | 7KB | ~60 | 中 | 主题切换、健康状态轮询、全局 Toast |
| ingest.html | 33KB | ~450 | 高 | 3-Tab (上传/文件夹/监视器)、拖拽上传、队列管理、watch 事件 |
| raw.html | 24KB | ~300 | 高 | 文件列表+搜索、预览抽屉、批量选择、ingest 触发 |
| index.html | 10KB | ~140 | 中 | 页面列表、preview 抽屉、hover tooltip |
| graph.html | 9KB | ~120 | 中 | D3 力导向图、拖拽/缩放、搜索高亮 |
| query.html | 7KB | ~90 | 中 | SSE 流式响应、Markdown 渲染、历史 |
| workbench.html | 8KB | ~100 | 中 | 项目 CRUD、激活切换 |
| lint.html | 6KB | ~80 | 中 | 后台任务、轮询结果 |
| config.html | 6KB | ~80 | 低 | 表单提交、API 连接测试 |
| branches.html | 2KB | ~30 | 低 | 分支列表、创建/切换/合并 |
| log.html | 4KB | ~30 | 低 | 日志列表 |
| page.html | 2KB | ~10 | 低 | Markdown 静态渲染 |


## 2. 核心痛点

### 2.1 状态管理混乱

- 全局变量直接挂 window，跨页面无法保持
- sessionStorage 作为 hack 传递后台任务状态
- DOM 直接操作 (document.getElementById) 耦合数据和视图

### 2.2 零组件复用

- previewDrawer 在 index.html / raw.html 中重复实现
- showToast 在 base.html 中定义，但样式分散在各处
- StatusBadge、escapeHtml 等工具函数每个文件复制一份

### 2.3 全页刷新

- 所有导航都是 <a href> 整页刷新，丢失所有客户端状态
- 无 SPA 路由，浏览器前进/后退不可用
- 每次页面加载重新 fetch 数据

### 2.4 交互天花板

| 交互 | Jinja2 实现 | React 期望 |
|------|-------------|------------|
| 拖拽上传 | 手动监听 drag/drop + FileReader | 组件抽象，单行声明 |
| SSE 流式 | 手动 EventSource + DOM 追加 | useSSE hook，自动状态同步 |
| D3 图谱 | 直接操作 SVG DOM，与框架无关 | react-force-graph 封装 |
| 表单+验证 | 手动校验 + innerHTML 错误提示 | React Hook Form + Zod |
| 乐观更新 | 无法实现 | useOptimistic 自动回滚 |
| 后台轮询 | setInterval + DOM 替换 | usePolling hook + Zustand |

### 2.5 测试空白

- 前端测试覆盖：0%
- 无组件隔离测试、无集成测试、无 E2E

---

## 3. 迁移策略：渐进式，非一次重写

`
Phase 1 (1 week):  Vite + React 壳 + 2 核心页面
Phase 2 (2 weeks): 剩余页面迁移
Phase 3 (1 week):  替换 Jinja2 路由，清理旧模板
Phase 4 (ongoing): 持续优化与测试
`

### 3.1 Phase 1 — 基础架构 + IngestPage + QueryPage

| 任务 | 耗时 | 产出 |
|------|:---:|------|
| 初始化 frontend/ (Vite + React + TS + Tailwind) | 2h | 项目骨架 |
| Layout + Sidebar + ThemeToggle + Toast | 4h | 壳就绪 |
| API 层 (fetch 封装 + 类型定义) | 2h | pi/*.ts |
| Zustand stores (theme, wiki, workbench) | 2h | 全局状态 |
| IngestPage (拖拽上传 + 队列 + 监视器) | 8h | 最复杂页面 |
| QueryPage (SSE 流式 + Markdown 渲染) | 6h | 流式体验 |

### 3.2 Phase 2 — 全量迁移

| 页面 | 复杂度 | 预计耗时 |
|------|:---:|:---:|
| RawFilesPage | 高 | 6h |
| GraphPage (D3 -> react-force-graph) | 高 | 6h |
| WikiBrowserPage (原 index.html) | 中 | 4h |
| WorkbenchPage | 中 | 4h |
| LintPage | 中 | 3h |
| ConfigPage | 低 | 3h |
| BranchesPage | 低 | 2h |
| LogPage | 低 | 2h |
| PageDetail | 低 | 1h |

### 3.3 Phase 3 — 后端适配 + 清理

| 任务 | 耗时 |
|------|:---:|
| FastAPI: SPA fallback 路由 (非 /api/* -> index.html) | 1h |
| Vite 生产构建 + FastAPI StaticFiles 集成 | 1h |
| Electron 验证 (loadURL 无需改动) | 1h |
| 删除 13 个 Jinja2 模板文件 | 0.5h |
| 删除 static/css/style.css (Tailwind 替代) | 0.5h |

### 3.4 并行运行策略

迁移期间新旧前端并行：

`
/dev/*     -> React SPA (Vite dev server 代理)
/api/*     -> FastAPI (不变)
/jinja/*   -> 旧 Jinja2 页面 (用于对比验证)
`

---


## 4. 技术选型

| 层面 | 选择 | 版本 | 理由 |
|------|------|:---:|------|
| 框架 | React | 18.3+ | 生态最大，社区资源最丰富 |
| 语言 | TypeScript | 5.5+ | 类型安全，API 契约 |
| 构建 | Vite | 6.x | 秒级 HMR，开箱即用 TS/JSX |
| 路由 | React Router | 7.x | SPA 客户端路由 |
| 状态管理 | Zustand | 5.x | 轻量 (~1KB)，无 boilerplate |
| HTTP | fetch + 封装 | - | 浏览器原生，零依赖 |
| 样式 | Tailwind CSS | 4.x | 原子化 CSS |
| SSE | EventSource | - | 浏览器原生，流式 query |
| D3 图谱 | react-force-graph | 1.x | D3 力导向图 React 封装 |
| Markdown | react-markdown + remark-gfm | 9.x | 客户端渲染 |
| 测试 | Vitest + Testing Library | 2.x | Vite 原生 |
| E2E | Playwright | 1.x | 多浏览器支持 |

### 4.1 为什么不选 Next.js

| Next.js | 本项目 |
|----------|--------|
| SSR/SSG 能力 | FastAPI 已做 SSR (Jinja2)，React 仅做客户端 |
| 边缘/Serverless | 桌面应用 + 本地服务，不需要 |
| 文件路由 | SPA 路由更灵活 |
| app/ 目录 | 学习成本高 |
| 构建复杂度 | Vite 更轻量 |

---

## 5. 目录结构

frontend/
  index.html                  Vite 入口
  package.json
  tsconfig.json
  vite.config.ts
  tailwind.config.ts
  src/
    main.tsx                  ReactDOM.createRoot
    App.tsx                   RouterProvider + Layout
    router.tsx                路由配置
    api/                      API 调用层
      client.ts               base fetch 封装
      types.ts                共享类型
      wiki.ts                 /api/wiki/*
      branch.ts               /api/branches/*
      graph.ts                /api/graph/*
      raw.ts                  /api/raw/*
      watch.ts                /api/watch/*
      workbench.ts            /api/workbench/*
      config.ts               /api/config
    stores/                   Zustand stores
      themeStore.ts
      wikiStore.ts
      workbenchStore.ts
      ingestStore.ts
      toastStore.ts
    hooks/                    自定义 hooks
      useSSE.ts
      usePolling.ts
      useDebounce.ts
      useLocalStorage.ts
    components/               共享组件
      Layout.tsx
      Sidebar.tsx
      PreviewDrawer.tsx
      Toast.tsx
      StatusBadge.tsx
      ThemeToggle.tsx
      MarkdownViewer.tsx
      HealthBadge.tsx
      EmptyState.tsx
      LoadingSpinner.tsx
      ConfirmDialog.tsx
    pages/                    页面组件
      WikiBrowserPage.tsx
      IngestPage.tsx
      RawFilesPage.tsx
      QueryPage.tsx
      GraphPage.tsx
      LintPage.tsx
      WorkbenchPage.tsx
      BranchesPage.tsx
      ConfigPage.tsx
      LogPage.tsx
      PageDetail.tsx
    __tests__/               测试
      components/
      pages/
      hooks/
      e2e/


## 6. 后端改动 (最小化)

### 6.1 新增 SPA fallback 路由

app/main.py 新增:

    from fastapi.staticfiles import StaticFiles
    FRONTEND_DIST = BASE_DIR / 'frontend' / 'dist'

    if FRONTEND_DIST.exists():
        app.mount('/assets', StaticFiles(directory=FRONTEND_DIST / 'assets'))

    @app.get('/{full_path:path}')
    async def spa_fallback(full_path: str):
        if full_path.startswith(('api/', 'static/')):
            raise HTTPException(status_code=404)
        index_html = FRONTEND_DIST / 'index.html'
        if index_html.exists():
            return HTMLResponse(index_html.read_text(encoding='utf-8'))
        raise HTTPException(status_code=404)

### 6.2 Development Proxy (vite.config.ts)

    export default defineConfig({
      plugins: [react()],
      server: {
        port: 5173,
        proxy: {
          '/api': 'http://127.0.0.1:8089',
          '/static': 'http://127.0.0.1:8089',
          '/health': 'http://127.0.0.1:8089',
        },
      },
      build: { outDir: 'dist', assetsDir: 'assets' },
    })

### 6.3 不需要改动的

- 所有 /api/* 端点保持不变
- app/main.py lifespan 事件不变
- core/* 所有模块不变
- electron/main.js 无需改动
- poetry 依赖不变

---

## 7. API 类型定义 (TypeScript)

### 7.1 共享类型

    // api/types.ts
    export interface ApiResponse<T> {
      data: T
      error?: string
    }

    export interface WikiPage {
      title: string
      content: string
      frontmatter: {
        title: string
        page_type: 'entity' | 'concept' | 'source_summary' | 'overview' | 'comparison'
        status: 'draft' | 'active' | 'stale' | 'contradicted' | 'archived'
        summary?: string
        sources?: Array<{ file: string; hash: string }>
        confidence?: 'high' | 'medium' | 'low'
      }
    }

    export interface IngestResult {
      source_path: string
      source_hash: string
      status: 'ingested' | 'skipped' | 'modified'
      new_pages: string[]
      updated_pages: string[]
      contradictions: Array<{
        wiki_page: string
        claim_in_wiki: string
        claim_in_source: string
        resolution_suggestion: string
      }>
      dry_run: boolean
      errors: string[]
    }

    export interface LintReport {
      health_score: 'A' | 'B' | 'C' | 'D' | 'F'
      issues: LintIssue[]
      summary: string
    }

    export interface LintIssue {
      severity: 'critical' | 'warning' | 'info'
      type: string
      description: string
      affected_pages: string[]
      suggestion: string
      auto_fixable: boolean
    }

    export interface GraphData {
      nodes: GraphNode[]
      edges: GraphEdge[]
    }

    export interface GraphNode {
      id: string
      title: string
      page_type: string
      status: string
      in_degree: number
      out_degree: number
    }

    export interface GraphEdge {
      source: string
      target: string
      relation_type: string
    }

    export interface BranchInfo {
      name: string
      is_active: boolean
    }

    export interface ProjectInfo {
      name: string
      description: string
      wiki_path: string
      raw_path: string
      created_at: string
      page_count: number
    }

    export interface WatchSession {
      folder: string
      enabled: boolean
      auto_ingest: boolean
      events_count: number
      recent_events: WatchEvent[]
      error: string | null
      files_watched: number
      active: boolean
    }

    export interface WatchEvent {
      change_type: 'added' | 'modified' | 'deleted'
      path: string
      timestamp: string
    }

---

## 8. 关键组件设计

### 8.1 Layout.tsx

    import { Outlet } from 'react-router-dom'
    import { Sidebar } from './Sidebar'
    import { Toast } from './Toast'

    export function Layout() {
      return (
        <div className='flex h-screen'>
          <Sidebar />
          <main className='flex-1 overflow-y-auto p-6'>
            <Outlet />
          </main>
          <Toast />
        </div>
      )
    }

### 8.2 router.tsx

    import { createBrowserRouter } from 'react-router-dom'
    import { Layout } from './components/Layout'
    import { WikiBrowserPage } from './pages/WikiBrowserPage'
    import { IngestPage } from './pages/IngestPage'
    // ... other imports

    export const router = createBrowserRouter([
      {
        path: '/',
        element: <Layout />,
        children: [
          { index: true, element: <WikiBrowserPage /> },
          { path: 'ingest', element: <IngestPage /> },
          { path: 'raw', element: <RawFilesPage /> },
          { path: 'query', element: <QueryPage /> },
          { path: 'graph', element: <GraphPage /> },
          { path: 'lint', element: <LintPage /> },
          { path: 'workbench', element: <WorkbenchPage /> },
          { path: 'branches', element: <BranchesPage /> },
          { path: 'config', element: <ConfigPage /> },
          { path: 'log', element: <LogPage /> },
          { path: 'page/:name', element: <PageDetail /> },
        ],
      },
    ])

### 8.3 useSSE hook (Query 流式响应)

    import { useState, useRef, useCallback } from 'react'

    export function useSSE(url: string) {
      const [content, setContent] = useState('')
      const [isStreaming, setIsStreaming] = useState(false)
      const abortRef = useRef<AbortController | null>(null)

      const start = useCallback((body: unknown) => {
        setIsStreaming(true)
        setContent('')
        const controller = new AbortController()
        abortRef.current = controller

        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        }).then(async (res) => {
          const reader = res.body?.getReader()
          if (!reader) return
          const decoder = new TextDecoder()
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            setContent(prev => prev + decoder.decode(value))
          }
          setIsStreaming(false)
        }).catch(() => setIsStreaming(false))
      }, [url])

      const stop = useCallback(() => {
        abortRef.current?.abort()
        setIsStreaming(false)
      }, [])

      return { content, isStreaming, start, stop }
    }

### 8.4 IngestPage 状态设计

    // stores/ingestStore.ts
    import { create } from 'zustand'

    interface UploadItem {
      id: string
      file: File
      status: 'pending' | 'uploading' | 'done' | 'error'
      error?: string
    }

    interface IngestStore {
      queue: UploadItem[]
      isIngesting: boolean
      results: IngestResult[]
      addFiles: (files: File[]) => void
      removeFile: (id: string) => void
      uploadAll: () => Promise<void>
      clearResults: () => void
    }

    export const useIngestStore = create<IngestStore>((set, get) => ({
      queue: [],
      isIngesting: false,
      results: [],
      addFiles: (files) => set(s => ({
        queue: [...s.queue, ...files.map(f => ({
          id: crypto.randomUUID(), file: f, status: 'pending' as const
        }))]
      })),
      removeFile: (id) => set(s => ({
        queue: s.queue.filter(i => i.id !== id)
      })),
      uploadAll: async () => {
        set({ isIngesting: true })
        for (const item of get().queue) {
          set(s => ({ queue: s.queue.map(i =>
            i.id === item.id ? { ...i, status: 'uploading' as const } : i
          )}))
          try {
            const formData = new FormData()
            formData.append('file', item.file)
            const res = await fetch('/api/raw/upload', { method: 'POST', body: formData })
            if (!res.ok) throw new Error('Upload failed')
            set(s => ({ queue: s.queue.map(i =>
              i.id === item.id ? { ...i, status: 'done' as const } : i
            )}))
          } catch (e) {
            set(s => ({ queue: s.queue.map(i =>
              i.id === item.id ? { ...i, status: 'error' as const, error: (e as Error).message } : i
            )}))
          }
        }
        set({ isIngesting: false })
      },
      clearResults: () => set({ results: [] }),
    }))

---

## 9. 迁移收益量化

| 指标 | Jinja2 现状 | React 目标 |
|------|:---:|:---:|
| 总代码行数 (HTML+JS+CSS内联) | ~2,500 | ~3,500 (但可维护) |
| 页面切换 | 全页刷新 ~300ms | 客户端路由 ~30ms |
| 状态保持 | 无 (依赖 sessionStorage) | Zustand 内存 + persist |
| 组件复用 | 0% | Toast/Preview/StatusBadge 等复用 |
| 热更新 | 无 (重启 uvicorn) | Vite HMR 即时 |
| 测试覆盖 | 0% | 目标 80%+ |
| TypeScript 安全 | 无 | 全面类型安全 |
| Bundle 大小 | 0 (SSR) | ~150KB gzip (首屏可接受) |

---

## 10. 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 迁移期间功能破损 | Jinja2 和 React 并行运行，通过 URL 前缀区分 |
| Electron 兼容 | 现有 main.js 仅 loadURL，无需改动 |
| 打包体积 | Vite code splitting + lazy loading 每个页面独立 chunk |
| 学习曲线 | 选最简单的 Zustand + React Router，不碰 Redux/Next.js |
| API 改动 | **零改动**，所有 /api/* 端点原样消费 |
| Tailwind CSS 与现有样式冲突 | 使用 prefix 或 scoped 策略隔离 |

---

## 11. 实施检查清单

### Phase 1

- [ ] 
pm create vite@latest frontend -- --template react-ts
- [ ] 
pm install react-router-dom zustand tailwindcss @tailwindcss/vite
- [ ] 
pm install -D vitest @testing-library/react @testing-library/jest-dom
- [ ] 配置 vite.config.ts (proxy + Tailwind plugin)
- [ ] 配置 tailwind.config.ts (content paths + dark mode)
- [ ] 创建 src/api/client.ts (base fetch + error handling)
- [ ] 创建 src/api/types.ts (所有 DTO 类型)
- [ ] 创建 src/stores/themeStore.ts
- [ ] 创建 src/stores/toastStore.ts
- [ ] 创建 src/components/Layout.tsx
- [ ] 创建 src/components/Sidebar.tsx + ThemeToggle + HealthBadge
- [ ] 创建 src/pages/IngestPage.tsx
- [ ] 创建 src/pages/QueryPage.tsx (SSE)
- [ ] 验证: Vite dev server 正常，API 代理工作

### Phase 2

- [ ] 创建 src/pages/RawFilesPage.tsx
- [ ] 创建 src/pages/GraphPage.tsx (react-force-graph)
- [ ] 创建 src/pages/WikiBrowserPage.tsx
- [ ] 创建 src/pages/WorkbenchPage.tsx
- [ ] 创建 src/pages/LintPage.tsx
- [ ] 创建 src/pages/ConfigPage.tsx
- [ ] 创建 src/pages/BranchesPage.tsx
- [ ] 创建 src/pages/LogPage.tsx
- [ ] 创建 src/pages/PageDetail.tsx

### Phase 3

- [ ] 
pm run build 生产构建
- [ ] FastAPI 添加 SPA fallback 路由
- [ ] 删除 13 个 Jinja2 模板
- [ ] 删除 static/css/style.css (或保留作为 fallback)
- [ ] Electron 验证完整流程

### Phase 4

- [ ] 组件单元测试 (Vitest + RTL)
- [ ] 页面集成测试
- [ ] E2E 测试 (Playwright)
- [ ] 性能优化 (lazy loading, memo)
- [ ] 无障碍 (a11y) 审计
