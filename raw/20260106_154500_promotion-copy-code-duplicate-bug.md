---
type: source
title: Promotion 复制 Code 重复 Bug 分析
created: 2026-01-06
updated: 2026-05-20
tags: [bug, frontend, backend, vue, python, promotion, copy, code-duplicate]
related: [promotion-form-vue, promotion-index-vue, iscopymode-computed, vue-mode-pattern, id-保留问题, 唯一性检查逻辑漏洞, promotion-service, promotion-request-model, promotion-copy-bug-analysis, 复制场景数据隔离模式]
sources: ["20260106_154500_promotion-copy-code-duplicate-bug.md", "20260106_154500_promotion-copy-code-duplicate-bug.yaml"]
authors: []
year: 2026
url: ""
venue: ""
---

# Promotion 复制 Code 重复 Bug 分析

## 文档概述

本文档记录了 Promotion 促销管理模块中复制功能出现的 **Code 字段重复 Bug** 的完整分析过程。该 Bug 导致用户在复制现有 Promotion 记录时，新生成的记录与原记录拥有相同的 Code 值，触发了数据库唯一性约束冲突。

## 问题描述

点击复制 Promotion Code 时，复制的记录可以与原记录使用相同的 Code Name 并成功保存。

用户在执行 Promotion 记录复制操作时，系统未正确处理 Code 字段的生成逻辑。复制后的新记录继承了原始记录的 Code 值，而非生成新的唯一标识符。这不仅违反了业务规则中的 Code 唯一性要求，还会在后续操作中引发数据库层面的唯一性约束异常。

## 排查过程

### 1. 前端验证规则检查

**文件**: `qb2025_frontend/src/views/admin/promotion/Form.vue`

**发现**: `code` 字段只有必填验证，没有唯一性验证。

```javascript
code: [
  { required: true, message: 'Please Enter Code', trigger: 'blur' }
],
```

### 2. 复制模式数据流分析

**Index.vue handleCopy:**

```javascript
const handleCopy = async (row: any) => {
  editModel.value = true
  rowId.value = null
  rowData.value = row  // 传递完整的 row 数据，包含 id
  FormVisible.value = true
}
```

**Form.vue getData:**

```javascript
if (props.editModel && props.rowData && !props.rowId) {
  formDataCopy = JSON.parse(JSON.stringify(props.rowData)); // 保留了原 id
}
```

### 3. 后端唯一性检查逻辑

**文件**: `qb2025_backend/backend/services/Promotion.py`

```python
async def create(self, query: PromotionRequest):
    # unique code
    has_promotion = await self.repo.find(dict(code=query.code))
    if has_promotion:
        if not query.id or has_promotion.id != query.id:
            logger.error(f"Promotion code is exist [{query.code}]")
            raise AppException(PromotionError.EXIST.value, ...)
```

## 根因分析

该 Bug 涉及多个软件层次的协同缺陷，形成了一个完整的故障链路。

### 前端层问题

Vue 组件在复制模式下运行时，未能正确清除 `id` 字段。根据 [[promotion-form-vue]] 的设计逻辑，复制模式应该继承原记录的绝大部分字段以减少用户重复录入工作量，但 `id` 字段必须作为新建标识处理。当前实现中，复制模式虽然正确处理了 `id` 的显示隐藏，但在提交数据时将原记录的完整数据结构发送至后端，包含了原始的 `id` 值。参见 [[id-保留问题]] 了解该问题的详细分析。

### 后端层问题

后端 API 在处理复制请求时，缺少对新记录 Code 唯一性的校验逻辑。`code` 字段唯一性检查条件在复制场景下失效，因为检查逻辑假设新增记录的 Code 必然与数据库中现有记录不同。当用户复制一个已存在的 Promotion 时，系统应该自动生成新的 Code 值或要求用户输入新值，但当前实现未包含此校验。详见 [[唯一性检查逻辑漏洞]]。

### 数据层问题

数据库层面，复制生成的新记录直接继承了原始记录的 `code` 值，而非通过触发器或应用层逻辑生成新的唯一标识符。

### 逻辑漏洞

当 `query.id == has_promotion.id` 时，唯一性检查被跳过。

### 数据流分析

```
复制操作
    ↓
props.rowData = {id: 5, code: "SUMMER2025", ...}  // 包含原 id
    ↓
formDataCopy = JSON.parse(JSON.stringify(props.rowData))  // id 被保留
    ↓
await add(res)  // res 包含 id: 5
    ↓
has_promotion = repo.find(code="SUMMER2025")  // 找到 id=5 的记录
    ↓
has_promotion.id(5) == query.id(5)  // True
    ↓
条件: not 5 or 5 != 5 = False or False = False
    ↓
唯一性检查被跳过！允许创建重复 code
```

## 故障时序

```
用户点击复制按钮
    ↓
前端 promotion-form-vue 进入复制模式
    ↓
表单加载原记录数据（含 id、code 等字段）
    ↓
用户修改必要信息后提交
    ↓
后端接收复制请求，未生成新 code
    ↓
数据库写入新记录（继承原 code）
    ↓
触发唯一性约束异常
```

## 解决方案

针对该 Bug 的修复应从以下层面入手：

### 方案1: 前端修复（推荐）

在复制模式下清空 id。

**文件**: `qb2025_frontend/src/views/admin/promotion/Form.vue`

```javascript
if (props.editModel && props.rowData && !props.rowId) {
  formDataCopy = JSON.parse(JSON.stringify(props.rowData));
  delete formDataCopy.id;  // 清空 id
}
```

### 方案2: 后端修复

修改唯一性检查逻辑。

**文件**: `qb2025_backend/backend/services/Promotion.py`

```python
# 移除 id 比较逻辑
has_promotion = await self.repo.find(dict(code=query.code))
if has_promotion:
    raise AppException(PromotionError.EXIST.value, ...)
```

## 涉及文件

| 文件类型 | 文件路径 |
|---------|---------|
| 前端组件 | `qb2025_frontend/src/views/admin/promotion/Form.vue` |
| 前端列表 | `qb2025_frontend/src/views/admin/promotion/Index.vue` |
| 后端服务 | `qb2025_backend/backend/services/Promotion.py` |
| 后端路由 | `qb2025_backend/routers/v1/backend/promotion.py` |

## 相关概念

- [[vue-mode-pattern]] — Vue 表单组件模式判断
- [[iscopymode-computed]] — 复制模式计算属性
- [[id-保留问题]] — 复制模式下 id 字段的处理逻辑缺陷
- [[唯一性检查逻辑漏洞]] — 后端唯一性检查条件在复制场景下的失效
- [[复制场景数据隔离模式]] — 复制操作中数据隔离的通用设计模式
- [[promotion-form-vue]] — 表单组件文档，含复制模式实现
- [[promotion-copy-bug-analysis]] — 综合分析入口，整合各层 Bug 分析

## 相关实体

- [[promotion-form-vue]] — 核心问题文件
- [[promotion-service]] — 后端 Promotion 服务
- [[promotion-request-model]] — Promotion 请求数据模型

## 参考价值

该 Bug 分析可作为后续类似问题的排查参考模板，展示了从前端表单提交到后端 API 处理再到数据库写入的完整数据流分析方法。

## 状态

- [x] 问题排查完成
- [ ] 修复待实施