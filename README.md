# LLM Wiki

> 用 LLM 把散落的文档变成持续生长的结构化 Wiki。
>
> Based on [Karpathy's LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) concept.

---

## 是什么

传统 RAG 每次问问题都要重新检索原始文档、拼凑答案。LLM Wiki 的思路不同：**让 LLM 提前把知识编译成结构化 Wiki，然后基于 Wiki 回答问题**。知识累积起来，而不是每次都从头造。

```
原始文档  →  LLM 阅读 & 提取  →  结构化 Markdown Wiki  →  查询 / 浏览 / 图谱
(raw/)                         (wiki/)                   (Web UI / API)
```

你负责提供资料、提问、做判断。LLM 负责所有繁琐的整理、交叉引用、更新维护。

---

## 快速开始

### 1. 安装

```bash
git clone <repo-url> && cd llm-wiki
poetry install
```

### 2. 配置 LLM

```bash
cp .env.example .env
# 编辑 .env，填入你的 API Key
```

支持任何 OpenAI 兼容接口（OpenAI / DeepSeek / Ollama / LM Studio 等）：

```env
LLM_API_BASE=https://api.openai.com/v1
LLM_API_KEY=sk-your-key-here
LLM_MODEL=gpt-4o
LLM_SMALL_MODEL=gpt-4o-mini   # 轻量任务用小模型，省钱
```

### 3. 启动

```bash
poetry run uvicorn app.main:app --port 8080
```

打开 **http://127.0.0.1:8080**

---

## 使用流程

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ 放入源文档 │ ──→ │  Ingest  │ ──→ │  浏览Wiki │ ──→ │ Query查询 │
│  raw/     │     │  /ingest │     │    /      │     │  /query   │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                       │                                 │
                       ↓                                 ↓
                LLM 提取知识                       基于 Wiki 回答
                生成/更新页面                       带 [[引用]]
                更新 index.md
                追加 log.md
                git commit
```

### 放入源文档

```bash
# 把文档放在 raw/ 目录
cp your-paper.md raw/
```

### 执行 Ingest

打开 `/ingest` 页面，输入源文档文件名，点击执行。或通过 API：

```bash
curl -X POST http://127.0.0.1:8080/api/wiki/ingest \
  -H "Content-Type: application/json" \
  -d '{"source_path": "transformer-paper.md"}'
```

### 浏览 Wiki

| 页面 | 路由 | 功能 |
|------|------|------|
| Wiki 浏览器 | `/` | 查看所有页面，点击 [[wikilink]] 跳转 |
| 图谱视图 | `/graph` | D3.js 力导向图，拖拽缩放搜索 |
| Ingest 面板 | `/ingest` | 上传/粘贴文档，Dry-run 预览 |
| Query 对话 | `/query` | 基于 Wiki 问答，带来源引用 |
| Lint 仪表盘 | `/lint` | 矛盾/死链/孤立页检测，一键修复 |
| 分支管理 | `/branches` | Git 分支创建/切换/合并 |
| API 文档 | `/docs` | Swagger UI，所有 API 可在线测试 |

---

## 项目结构

```
llm-wiki/
├── raw/                   ← 原始资料（只读）
├── wiki/                  ← LLM 生成的 Wiki（Markdown + Git 版本管理）
│   ├── index.md           ← 页面目录
│   └── log.md             ← 操作时间线
├── CLAUDE.md              ← LLM 行为规范（Schema）
│
├── core/                  ← 基础设施
│   ├── config.py          ← 配置管理
│   ├── llm.py             ← LLM 客户端（OpenAI 兼容 + 重试）
│   ├── git.py             ← Git 操作封装
│   ├── graph_engine.py    ← NetworkX 图谱引擎
│   └── wiki_io.py         ← 文件 I/O + index + log
│
├── api/                   ← 业务逻辑 + API 路由
│   ├── wiki.py            ← ingest / query / lint 核心
│   ├── entity.py          ← 实体管理
│   ├── graph.py           ← 图谱 API
│   ├── impact.py          ← 影响分析
│   ├── branch.py          ← 分支管理
│   └── webhook.py         ← GitHub Webhook
│
├── app/main.py            ← FastAPI 入口
├── templates/             ← Jinja2 前端页面
├── static/css/style.css   ← 暗色主题
├── tests/                 ← 测试
└── docs/                  ← 需求 & 任务文档
```

---

## API 概览

| 方法 | 端点 | 说明 |
|------|------|------|
| `POST` | `/api/wiki/ingest` | 摄入源文档 |
| `POST` | `/api/wiki/ingest/batch` | 批量摄入 |
| `POST` | `/api/wiki/query` | 查询 Wiki |
| `POST` | `/api/wiki/lint` | 健康检查 |
| `GET` | `/api/wiki/pages` | 列出页面 |
| `GET` | `/api/wiki/pages/{name}` | 获取页面 |
| `PUT` | `/api/wiki/pages/{name}` | 更新页面 |
| `DELETE` | `/api/wiki/pages/{name}` | 删除页面 |
| `GET` | `/api/wiki/index` | 获取索引 |
| `GET` | `/api/wiki/log` | 获取日志 |
| `GET` | `/api/entities` | 实体列表 |
| `GET` | `/api/graph` | 图数据 |
| `GET` | `/api/graph/paths` | 路径查找 |
| `POST` | `/api/impact/analyze` | 影响分析 |
| `GET/POST` | `/api/branches` | 分支管理 |
| `POST` | `/api/webhook/github` | GitHub 集成 |

完整文档：`/docs` (Swagger UI)

---

## 开发

```bash
# 运行测试
poetry run pytest tests/ -v

# 开发模式启动（热重载）
poetry run uvicorn app.main:app --reload --port 8080
```

详见 `docs/requirements.md`（需求）和 `docs/tasks.md`（任务拆解）。

---

## 核心理念

> *"The tedious part of maintaining a knowledge base is not the reading or the thinking — it's the bookkeeping. LLMs don't get bored, don't forget to update a cross-reference, and can touch 15 files in one pass."*
>
> — Andrej Karpathy


$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
npm run build:win
