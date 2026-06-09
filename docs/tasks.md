# LLM Wiki — 任务文档

> 派生自 `docs/requirements.md`，按开发阶段组织可执行任务

---

## Phase 1 — 核心基础设施

### T1.1 配置模块 `core/config.py`

- [ ] 定义 `Settings` Pydantic 模型，从 `.env` 加载
  - `wiki_path: str` — wiki 根目录，默认 `./wiki`
  - `raw_path: str` — 原始资料目录，默认 `./raw`
  - `schema_path: str` — schema 文件路径，默认 `./CLAUDE.md`
  - `wiki_branch: str` — 当前操作分支，默认 `main`
  - `default_branch: str` — 默认分支，默认 `main`
  - `git_auto_commit: bool` — ingest 后是否自动 commit，默认 `true`
- [ ] 定义 LLM 相关配置
  - `llm_api_base: str` — API 地址
  - `llm_api_key: str` — API Key
  - `llm_model: str` — 默认模型名
  - `llm_small_model: str` — 小模型名（摘要等轻量任务）
  - `llm_max_tokens: int` — 单次调用最大 token
  - `llm_temperature: float` — 温度参数
- [ ] 定义操作分级
  - `auto_approve_operations: list[str]`
  - `require_approval_operations: list[str]`
- [ ] 提供 `get_settings()` 单例工厂

**产出：** `core/config.py`

---

### T1.2 LLM 客户端 `core/llm.py`

- [ ] 封装 OpenAI 兼容客户端
  - 支持 `chat_completion(messages, model=None)` 同步调用
  - 支持 `chat_completion_stream(messages, model=None)` 流式调用
- [ ] Prompt 模板管理
  - `INGEST_PROMPT` — 摄入文档的 system prompt
  - `QUERY_PROMPT` — 查询 wiki 的 system prompt
  - `LINT_PROMPT` — 健康检查的 system prompt
  - 模板中注入 schema 内容、分支信息、安全约束
- [ ] 模型分层选择
  - `get_model(task_type: str) -> str` — 根据任务类型选大模型或小模型
- [ ] Token 预算感知
  - `estimate_tokens(text: str) -> int` — 粗略估算
  - 调用前检查是否超出 `llm_max_tokens`
- [ ] 错误处理与重试
  - 网络错误重试 3 次（指数退避）
  - 格式错误返回 raw text fallback

**产出：** `core/llm.py`

---

### T1.3 Git 操作 `core/git.py`

- [ ] 初始化/打开 wiki 仓库
  - `init_wiki_repo(path) -> Repo`
  - `open_wiki_repo(path) -> Repo`
- [ ] 基础操作
  - `commit(repo, message)` — 提交所有变更
  - `log(repo, max_count=20) -> list[CommitInfo]` — 最近提交
  - `diff(repo, commit_a, commit_b) -> str` — 两个版本间差异
- [ ] 分支操作
  - `create_branch(repo, name)` — 创建分支
  - `checkout(repo, branch)` — 切换分支
  - `merge(repo, source_branch)` — 合并分支
  - `list_branches(repo) -> list[str]` — 列出分支
  - `current_branch(repo) -> str` — 当前分支名
- [ ] 文件状态
  - `status(repo) -> dict` — 变更文件列表
  - `is_dirty(repo) -> bool` — 是否有未提交变更
- [ ] 引用完整性
  - `file_exists_at_commit(repo, commit, path) -> bool`

**产出：** `core/git.py`

---

### T1.4 图谱引擎 `core/graph_engine.py`

- [ ] 从 wiki markdown 文件解析 wikilink
  - `parse_wikilinks(content: str) -> list[str]` — 提取 `[[page]]`
  - `parse_frontmatter(content: str) -> dict` — 提取 YAML frontmatter
  - `parse_relations(content: str) -> list[Relation]` — 提取关系声明
- [ ] 构建 NetworkX 有向图
  - `build_graph(wiki_path: str) -> nx.DiGraph`
  - 节点属性：title, page_type, status, confidence, sources
  - 边属性：relation_type
- [ ] 图查询
  - `get_backlinks(graph, page) -> list[str]` — 入链
  - `get_wikilinks(graph, page) -> list[str]` — 出链
  - `find_orphans(graph) -> list[str]` — 孤立页面
  - `find_paths(graph, source, target, max_len=5) -> list[list[str]]`
- [ ] 图统计
  - `graph_stats(graph) -> dict` — 节点数、边数、密度、中心度 top-N
  - `hub_pages(graph, top_n=10) -> list[str]` — 链接最多的页面
- [ ] 影响分析
  - `impact_analysis(graph, page, depth=2) -> list[str]` — 影响范围
- [ ] 缓存
  - 图结构缓存到 pickle，仅在 wiki 文件变更时重建

**产出：** `core/graph_engine.py`

---

## Phase 2 — Wiki 基础操作

### T2.1 文件管理工具

- [ ] Markdown 文件读写
  - `read_page(path) -> WikiPage`
  - `write_page(path, page: WikiPage)` — 原子写入（先写 tmp 再 rename）
  - `delete_page(path)`
  - `list_pages(wiki_path) -> list[str]` — 扫描所有 .md
- [ ] 源文档管理
  - `scan_sources(raw_path) -> list[Source]` — 扫描 raw/ 目录
  - `compute_hash(file_path) -> str` — SHA-256
  - `source_status(hash, existing_sources) -> str` — pending/ingested/modified/skipped
- [ ] index.md 读写
  - `read_index(wiki_path) -> list[dict]`
  - `update_index_entry(wiki_path, page_info)`
  - `rebuild_index(wiki_path)`
- [ ] log.md 追加
  - `append_log(wiki_path, entry: LogEntry)` — 只追加
  - `read_log(wiki_path, last_n=20) -> list[LogEntry]`
  - `parse_log(wiki_path) -> list[LogEntry]` — 解析全部

**产出：** `core/wiki_io.py`（或整合进各 API 模块）

---

### T2.2 Ingest 流程 `api/wiki.py`（ingest 部分）

- [ ] `ingest_source(source_path, dry_run=False) -> IngestResult`
  1. 读取源文档，计算 hash
  2. 判断去重/变更（已有且未变 → 跳过）
  3. 调用 LLM（INGEST_PROMPT + 源文档 + 当前 wiki 相关页面 + schema）
  4. LLM 返回结构化结果：
     - 源文档摘要
     - 实体/概念提取
     - 关系标注（supports/contradicts/extends）
     - 需更新的现有页面 + 新内容
     - 需新建的页面 + 内容
  5. 写入 wiki 文件（dry_run 时只返回预览）
  6. 更新 index.md
  7. 追加 log.md
  8. git commit（如启用）
  9. 返回变更清单
- [ ] 支持 `?branch=xxx` 参数
- [ ] 异步接口：返回 `202 Accepted + task_id`，后台执行

**验收：** 放入一篇 Markdown 文档 → wiki 中生成摘要页、更新相关实体页、index.md 和 log.md 均正确更新

---

### T2.3 Query 流程 `api/wiki.py`（query 部分）

- [ ] `query_wiki(question, output_format="markdown") -> QueryResult`
  1. 读取 index.md → 选相关页面
  2. 读取相关页面全文
  3. 调用 LLM（QUERY_PROMPT + 问题 + 页面内容 + schema）
  4. 返回带引用的答案
- [ ] 支持 `?write_back=true` — 将答案保存为 wiki 新页面
- [ ] 输出格式：markdown / table / 结构化 JSON
- [ ] 缓存：相同 question + 相同 wiki epoch → 返回缓存

**验收：** 问 "Transformer 的架构是什么" → 返回带 `[[source-page]]` 引用的答案

---

### T2.4 Lint 流程 `api/wiki.py`（lint 部分）

- [ ] `lint_wiki() -> LintReport`
  1. 扫描所有 wiki 页面
  2. 构建图谱
  3. 检查项：
     - 矛盾声明（两个页面同一实体有冲突描述）
     - 过时内容（页面引用的 source hash 已变更）
     - 孤立页面（无入链）
     - 缺失概念（wikilink 指向不存在的页面 → 死链）
     - 缺失交叉引用（内容相关但未链接）
     - 引用完整性（source 文件是否存在、hash 是否匹配）
  4. 生成报告：按严重程度分级，给出修复建议
- [ ] 支持 `?auto_fix=true` — 自动修复死链、补充交叉引用
- [ ] 回归 lint：抽查 N 个页面对比原始 source 验证内容一致性

**验收：** 手动制造一个死链 + 一个矛盾声明 → lint 准确检出

---

## Phase 3 — 图谱 API

### T3.1 `api/graph.py`

- [ ] `GET /api/graph` — 返回完整图数据（nodes + edges），供前端 D3/ECharts 渲染
- [ ] `GET /api/graph/paths?from=X&to=Y` — 两节点间路径
- [ ] `GET /api/graph/orphans` — 孤立页面列表
- [ ] `GET /api/graph/stats` — 统计信息
- [ ] `GET /api/graph/hubs?top_n=10` — 枢纽页面

---

## Phase 4 — API 层 & 应用入口

### T4.1 `api/entity.py`

- [ ] `GET /api/entities` — 列出所有实体
- [ ] `GET /api/entities/{name}` — 实体详情
- [ ] `PUT /api/entities/{name}` — 更新实体

### T4.2 `api/wiki.py`（补充）

- [ ] `GET /api/wiki/pages` — 分页列出
- [ ] `GET /api/wiki/pages/{name}` — 获取页面
- [ ] `PUT /api/wiki/pages/{name}` — 更新页面
- [ ] `DELETE /api/wiki/pages/{name}` — 删除页面（需确认）
- [ ] `GET /api/wiki/index` — 获取 index.md
- [ ] `GET /api/wiki/log?last_n=20` — 获取 log.md
- [ ] `GET /api/wiki/ingest/{task_id}` — 查询 ingest 任务进度

### T4.3 `api/impact.py`

- [ ] `POST /api/impact/analyze` — body: `{page, depth}`，返回影响范围

### T4.4 `api/webhook.py`

- [ ] `POST /api/webhook/github` — 接收 GitHub push event，自动触发 ingest

### T4.5 `app/main.py`

- [ ] FastAPI 应用实例化
- [ ] 注册所有路由
- [ ] 生命周期：启动时初始化 git repo / 构建图谱缓存；关闭时清理
- [ ] CORS 中间件
- [ ] 全局异常处理

---

## Phase 5 — 高级功能

### T5.1 批量 Ingest
- [ ] `POST /api/wiki/ingest/batch` — 批量摄入 raw/ 下所有未处理文件

### T5.2 Dry-Run 预览
- [ ] ingest 支持 `?dry_run=true` — 返回预览变更，不写入

### T5.3 分支管理 API
- [ ] `POST /api/wiki/branches` — 创建分支
- [ ] `POST /api/wiki/branches/{name}/checkout` — 切换分支
- [ ] `POST /api/wiki/branches/{name}/merge` — 合并分支
- [ ] `GET /api/wiki/branches` — 列出分支

### T5.4 跨分支对比
- [ ] `GET /api/wiki/compare?page=X&branch_a=main&branch_b=draft/y`

### T5.5 模型分层
- [ ] 简单 ingest（摘要提取）用小模型
- [ ] 复杂 lint（矛盾分析）用大模型
- [ ] 配置可切换

---

## Phase 5.5 — Web 前端页面

> 技术方案：Jinja2 服务端渲染 + 原生 JS + D3.js（CDN），不引入前端构建工具链。

### T5.5.1 基础设施

- [ ] `poetry add jinja2`
- [ ] 创建 `templates/` + `static/css/` + `static/js/`
- [ ] `app/main.py` 挂载 StaticFiles + Jinja2Templates
- [ ] `templates/base.html` — 布局骨架（左侧目录 + 顶部导航 + 主内容区）

### T5.5.2 Wiki 浏览器 `GET /` `GET /page/{name}`

- [ ] 左侧目录树（从 index.md 读取，按分类折叠）
- [ ] 右侧 Markdown 渲染：`[[wikilink]]` 转为可点击链接、代码高亮、frontmatter 折叠
- [ ] 页面底部：入链 / 出链列表

### T5.5.3 图谱视图 `GET /graph`

- [ ] D3.js 力导向图：节点颜色=页面类型、边颜色/线型=关系类型、节点大小=入链数
- [ ] 交互：拖拽、缩放、点击跳转、搜索高亮、类型筛选

### T5.5.4 Ingest 面板 `GET /ingest`

- [ ] 文件上传（拖拽） / 文本框粘贴 / URL 输入
- [ ] 选项：分支、dry-run、交互模式
- [ ] 执行后展示变更清单 + diff 预览 + 确认/撤销

### T5.5.5 Query 对话 `GET /query`

- [ ] 对话式界面，流式输出（SSE）
- [ ] 每条回答：引用来源可点击、置信度、"保存到 wiki" 按钮

### T5.5.6 Lint 仪表盘 `GET /lint`

- [ ] 健康报告：🔴严重 / 🟡警告 / 🔵建议，可展开详情，一键修复
- [ ] 整体健康评分（A-F）+ 历史趋势

### T5.5.7 分支管理 `GET /branches`

- [ ] 分支列表、创建/切换/合并、合并前 lint 提示

---

## Phase 6 — 测试 & 文档

### T6.1 单元测试 `tests/`
- [ ] `tests/test_config.py` — 配置加载
- [ ] `tests/test_git.py` — git 操作（用临时目录）
- [ ] `tests/test_graph_engine.py` — 图谱构建/查询
- [ ] `tests/test_wiki_io.py` — 文件读写、index、log

### T6.2 Mock LLM 测试
- [ ] `tests/test_ingest.py` — 固定 LLM response → 验证生成的文件
- [ ] `tests/test_query.py` — 固定 wiki + 固定 LLM response → 验证答案
- [ ] `tests/test_lint.py` — 构造矛盾/死链 → 验证检测

### T6.3 Golden File 测试
- [ ] `tests/fixtures/` — 固定 source 文档 + 期望的 wiki 输出
- [ ] `tests/test_golden.py` — 对比实际输出与期望输出

### T6.4 Schema 合规测试
- [ ] `tests/test_schema_compliance.py` — 自动检查 wiki 页面是否符合 schema 约定

### T6.5 API 文档
- [ ] FastAPI 自动生成 OpenAPI docs (`/docs`)
- [ ] `README.md` — 项目说明、快速开始

---

## 任务依赖关系

```
Phase 1 (并行)
├── T1.1 config ─────────────┐
├── T1.2 llm ────────────────┤
├── T1.3 git ────────────────┤
└── T1.4 graph_engine ───────┘
                              ↓
Phase 2
├── T2.1 wiki_io ────────────┐
├── T2.2 ingest ─────────────┤
├── T2.3 query ──────────────┤
└── T2.4 lint ───────────────┘
                              ↓
Phase 3
└── T3.1 graph API ──────────┐
                              ↓
Phase 4 (并行)
├── T4.1 entity ─────────────┤
├── T4.2 wiki 补充 ──────────┤
├── T4.3 impact ─────────────┤
├── T4.4 webhook ────────────┤
└── T4.5 main ───────────────┘
                              ↓
Phase 5 (独立，可插拔)
Phase 5.5 — Web 前端（依赖 Phase 4 的 API 和路由）
                              ↓
Phase 6 (随各 Phase 并行推进)
```

---

## 当前状态

| Phase | 进度 |
|-------|------|
| Phase 1 | 待开始 |
| Phase 2 | 待开始 |
| Phase 3 | 待开始 |
| Phase 4 | 待开始 |
| Phase 5 | 待开始 |
| Phase 5.5 | 待开始 |
| Phase 6 | 待开始 |
