---
type: source
title: "Promotion Index 动态搜索选项实现"
created: 2026-05-13
updated: 2026-05-13
tags: [vue, frontend, dynamic-search, api-integration]
related: [promotion-index-vue, customer-index-vue, loadingsearch-机制, 动态搜索选项加载模式, searchform组件, page-header组件]
sources: ["2026-05-13_1100_promotion_dynamic_search_options.md"]
---
# Promotion Index 动态搜索选项实现

根据 condition_types API 动态加载 Service/Customer/Region 下拉选项。

## 需求背景

用户需要将 promotion 列表页的搜索字段（service, customer, region）的下拉选项改为动态加载，数据来源为后端接口 `/backend/promotion/condition_types`。

- **为什么做**：原 search 配置中的 options 为空数组，需要从后端 API 实时获取
- **业务目标**：支持根据后端返回的 condition_types 动态渲染搜索下拉框
- **涉及模块**：qb2025_frontend - promotion 列表页

## 技术分析

**实现模式**：参考 `customer/Index.vue` 的实现方式

1. 在 `onMounted` 中调用 API 获取数据
2. 数据加载完成后设置 `loadingSearch = true` 触发 UI 刷新（通过 `page-header` 组件的 `searchFieldsKey` 机制）
3. 遍历 condition_types，将各 group 的 fields 映射为 select options

**数据映射规则**：

| group.type | search field | options 来源 | id 字段 | name 字段 |
|------------|--------------|-------------|---------|-----------|
| customer   | customer     | fields      | name    | label     |
| region     | region       | fields      | name    | label     |
| service    | service      | fields      | name    | name      |

**替代方案**：
- 硬编码 options（不灵活，无法随后端配置变化）
- 组件内单独维护 API 调用逻辑（与参考实现不一致）

**优点**：
- 与现有 codebase 风格一致
- 利用现有 `loadingSearch` 机制触发刷新

## 文件变更

- `qb2025_frontend/src/views/admin/promotion/Index.vue`

修改内容：
1. 导入 `getCondition` API
2. 添加 `loadingSearch` ref 变量
3. page-header 添加 `:loading-search="loadingSearch"` prop
4. 添加 `onMounted` 钩子处理动态数据加载

## API 变更

**新增 API**：`getCondition`
```javascript
export const getCondition = () => request.post("/backend/promotion/condition_types");
```

**API 返回值格式**：
```json
[
  {
    "type": "customer",
    "label": "Customer",
    "fields": [
      {"name": "all", "label": "All", "type": "radio", ...},
      {"name": "billgroup", "label": "Bill Group", "type": "checkbox", "options_source": "...", ...}
    ],
    "group": true
  },
  {
    "type": "region",
    "label": "Region",
    "fields": [...],
    "group": true
  },
  {
    "type": "service",
    "label": "Service",
    "fields": [...],
    "group": false
  }
]
```

## 待办事项

- [ ] 测试下拉选项是否正确加载
- [ ] 验证搜索参数是否能正确传递到后端
- [ ] 检查 service 类型的 label 取值逻辑（当前为 `f.label || f.name`）