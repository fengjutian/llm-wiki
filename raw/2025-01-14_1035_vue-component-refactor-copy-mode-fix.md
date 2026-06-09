---
type: source
title: "Vue Promotion Form 重构与复制模式修复"
created: 2025-01-14
updated: 2025-01-14
tags: [vue, frontend, refactor, bug-fix, composition-api]
related: [promotion-index-vue, promotion-form-vue, vue-mode-pattern, vue-component-refactor-patterns, dry-principle]
sources: ["2025-01-14_1035_vue-component-refactor-copy-mode-fix.md"]
---
# Vue Promotion Form 重构与复制模式修复

本文档记录了对前端 Promotion 表单组件 Form.vue 的重构过程，核心目标是消除重复代码并修复复制模式下的两个 bug。

## 背景与问题

用户在复制 Promotion 记录时遇到两个问题：弹层标题显示 "Edit" 而非预期的 "Create"，且提交时可能调用错误的接口。通过三 Props 组合机制（`editModel`、`rowId`、`rowData`）区分新建、编辑、复制三种模式，其中复制模式的判断依据是 `rowId === null && rowData !== null`。

## 技术方案

### 重构措施

将 `getData` 方法从 120 行缩减至 45 行，具体措施包括：

1. **提取辅助函数**：新增 `transformTierData()`、`transformQuantityType()`、`transformToFormData()` 三个函数消除重复逻辑
2. **提取常量**：将 Magic Values 统一为 `DEFAULT_FILTER_DATA` 常量
3. **新增计算属性**：`isCopyMode` 通过 `computed(() => props.editModel && props.rowData && !props.rowId)` 精确判断复制模式

### Bug 修复

**问题 1**：复制模式标题显示错误。修复方案为 `:title="isCopyMode ? 'Create' : (editModel ? 'Edit' : 'Create')"`

**问题 2**：复制模式提交接口错误。修复方案为 `if (props.editModel && !isCopyMode.value)` 排除复制模式后调用 update 接口

## 影响范围

仅修改 `qb2025_frontend/src/views/admin/promotion/Form.vue` 组件，未影响其他模块。

## 关键产出

- `getData` 方法行数减少 62%
- 消除 2 处约 40 行重复代码
- 提供了可复用的模式判断设计模式

## 相关资源

- [[promotion-form-vue]] — Form.vue 组件详细文档
- [[vue-mode-pattern]] — Vue 组件模式判断通用模式
- [[vue-component-refactor-patterns]] — Vue 重构最佳实践