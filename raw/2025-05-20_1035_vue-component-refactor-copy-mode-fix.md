---
type: source
title: "Vue Promotion Form 重构与复制模式修复"
created: 2025-05-20
updated: 2025-05-20
tags: [vue, refactor, bug-fix, frontend, composition-api]
related: [promotion-form-vue, iscopymode-computed, vue-mode-pattern, vue-component-refactor-patterns, dry-principle, transform-tier-data, transform-quantity-type, transform-to-form-data, default-filter-data]
sources: ["2025-05-20_1035_vue-component-refactor-copy-mode-fix.md"]
---
# Vue Promotion Form 重构与复制模式修复

前端 Promotion 表单组件重构，消除重复代码并修复复制模式标题和提交逻辑的技术报告。

## 背景与目标

用户在复制 Promotion 记录时，发现弹层标题显示 "Edit" 而非预期的 "Create"，且提交时可能调用了错误的接口。本次重构旨在修复这些 Bug，同时提升代码可维护性，消除重复逻辑。

## 核心问题

### 代码重复问题

`getData` 方法中 Copy 模式和 Edit 模式的 tier 数据转换逻辑完全相同（约 40 行重复），违反 [[dry-principle]]。重构后从 120 行压缩至 45 行，效果显著。

### Magic Values 问题

`DEFAULT_FILTER_DATA` 对象（`id: 'root', type: 'group', operator: 'AND'`）在多处硬编码，存在一致性问题。通过提取为独立常量统一管理。

## 复制模式判断机制

通过 3 个 Props 区分不同模式：

| 模式 | editModel | rowId | rowData | 判断条件 |
|------|:---------:|:-----:|:-------:|---------|
| 新建 | false | null | null | - |
| 编辑 | true | 有值 | 有值 | `editModel && rowId` |
| 复制 | true | **null** | 有值 | `editModel && rowData && !rowId` |

**核心判断依据**：`rowId === null && rowData !== null` → 复制模式

## Bug 修复

### 问题 1：复制模式标题显示错误

**问题现象**：复制 Promotion 时弹层标题显示 "Edit" 而非 "Create"

**根本原因**：原逻辑仅根据 `editModel` 判断，未考虑复制模式

**修复方案**：新增 [[iscopymode-computed]] 判断，复制模式优先显示 "Create"

### 问题 2：复制模式提交接口错误

**问题现象**：复制记录后提交可能调用 update 接口而非 add

**根本原因**：原逻辑 `if(props.editModel)` 包含编辑和复制两种情况

**修复方案**：增加 `!isCopyMode.value` 条件排除复制模式

## 重构方案

1. **提取辅助函数**：将重复的 tier 转换逻辑提取为 [[transform-tier-data]]
2. **提取常量**：将 Magic Values 提取为 [[default-filter-data]]
3. **统一数据转换入口**：新建 [[transform-to-form-data]] 整合所有转换逻辑
4. **添加计算属性**：新增 [[iscopymode-computed]] computed 属性判断复制模式

## 设计决策

### 复制模式判断机制决策

**决定**：通过 `rowId === null && rowData !== null` 区分复制模式

**原因**：
- 复制时需要原数据（rowData）填充表单
- 复制后是新记录，不应携带原 ID（rowId）
- 编辑时 rowId 必须有值

**替代方案**：添加独立的 `mode` 参数（type: 'create' | 'edit' | 'copy'），语义更明确，但修改成本高。

## 风险评估

| 风险 | 说明 | 缓解措施 |
|-----|------|---------|
| **props 依赖性** | 依赖父组件正确传参 | 已在组件内部明确判断逻辑 |
| **向后兼容** | 新增 computed 不影响现有功能 | 严格测试三种模式 |

## 待解决问题

- 是否需要支持批量复制功能？
- 复制时是否需要清空某些字段（如 code）？

## 相关文件

- [[promotion-form-vue]] — 重构的目标组件