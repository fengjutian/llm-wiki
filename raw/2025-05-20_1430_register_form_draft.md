---
type: source
title: "注册表单草稿自动保存与恢复功能"
created: 2025-05-20
updated: 2025-05-20
tags: [注册, 草稿, 自动保存, 多设备同步, 软删除, 频率限制]
related: [register-form-draft-model, register-form-draft-repo, register-form-draft-api, 软删除设计, 频率限制实现, 字段白名单, 状态分支判断, 多设备同步, upsert操作]
sources: ["2025-05-20_1430_register_form_draft.md"]
---
# 注册表单草稿自动保存与恢复功能

## 概述

本文档记录了注册表单草稿自动保存与恢复功能的完整实现。该功能支持用户在任何设备上恢复已填写的注册信息，解决了因中途离开导致数据丢失的问题。

## 核心决策

### 技术选型

选择**后端数据库存储方案（方案C）**，而非前端 LocalStorage 或 SessionStorage。决策依据包括：

- 用户明确要求支持多设备同步
- 注册流程涉及邮箱验证，需要后端状态同步
- 可复用现有的 verify_email 验证码机制

### 架构设计

| 设计要点 | 方案 | 理由 |
|---------|------|------|
| 删除策略 | 软删除 | 可追溯、便于排查、未来可能需要恢复功能 |
| 跳转策略 | 恢复后保持Step 1 | 避免"未填密码就验证"的逻辑问题 |
| 频率限制 | 60秒/邮箱 | 防止恶意请求、减少DB压力、草稿变更不频繁 |
| 冲突策略 | 最后保存优先 | upsert保证多设备场景数据可覆盖 |

## 核心功能

### API 接口

新增 3 个公共接口：

- **POST** `/api/v1/public/register_form_draft` — 保存草稿（60秒频率限制）
- **GET** `/api/v1/public/register_form_draft` — 获取草稿及注册状态
- **DELETE** `/api/v1/public/register_form_draft` — 软删除草稿

### 状态判断

根据 verify_email 表和 user 表判断用户所处阶段：

| 状态 | 条件 | step_hint |
|------|------|-----------|
| registered | user表有记录 | 完成注册 |
| verified | is_verified=True, 无user | step_2 |
| pending_verification | email已注册, 未验证 | verify_email |
| new | 无任何记录 | step_1 |

## 安全措施

- **字段白名单**：Schema层过滤 password、password2、code 等敏感字段
- **频率限制**：同一邮箱60秒内只能保存1次草稿，使用 `with_for_update()` 行锁
- **软删除设计**：注册成功后软删除草稿，保留30天后硬删除清理

## Bug修复

修复 SQLModel index 与 sa_column 冲突问题：当使用 `sa_column=Column(...)` 时，`index=True` 应放在 `Column()` 内部而非 `Field()` 中。

## 关键文件

| 文件 | 作用 |
|------|------|
| `backend/models/Customer.py` | RegisterFormDraft ORM模型 |
| `backend/repository/Customer.py` | RegisterFormDraftRepo数据访问层 |
| `backend/services/User.py` | 草稿CRUD业务逻辑 |
| `routers/v1/public/public.py` | 3个API路由 |
| `frontend/src/views/Register.vue` | 草稿保存与恢复前端逻辑 |

## 待完善事项

- 添加草稿保存频率限制的单元测试
- 添加定时任务清理过期草稿
- 添加管理后台查看草稿数据功能
- 补充 OpenAPI 文档