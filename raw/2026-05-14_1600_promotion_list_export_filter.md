---
type: source
title: "Promotion 列表与导出接口筛选条件实现"
created: 2026-05-14
updated: 2026-05-14
tags: [promotion, export, filter, fastapi, backend]
related: [promotion-export-api, promotion-export-repo, promotion-export-service, multi-items-参数解析, URL数组参数解析规范, 子查询关联过滤, streaming-export-response-tool, 后端直查模式]
sources: ["2026-05-14_1600_promotion_list_export_filter.md"]
---
# Promotion 列表与导出接口筛选条件实现

## 需求概述

实现 Promotion 列表和导出接口的多字段筛选功能：

1. **列表接口** `POST /backend/promotion/list` 增加筛选条件：promotion_code、group（模糊查询），service、customer、region（关联过滤），created_at（日期范围）
2. **导出接口** `GET /backend/promotion/download` 同步新增 group 筛选条件

## 核心 Bug 修复

### 导出数据不生效问题

**问题现象**：用户在列表页筛选后点击导出，导出的是全部数据而非筛选结果。

**根本原因**：
- 导出接口使用 `dict(request.query_params)` 解析 GET 参数
- 对于数组参数（如 `created_at[]=2026-05-12&created_at[]=2026-05-14`），`dict()` 只保留最后一个值
- 日期范围变成单边条件，无法正确过滤

**修复方案**：使用 `request.query_params.multi_items()` 遍历所有参数值，正确构建列表。

## 技术实现

### Repository 层变更

**PromotionRepo.paginate** 新增筛选逻辑：
- `promotion_code` 模糊查询：`self.model.code.like(f"%{value}%")`
- `group` 模糊查询：同上
- `service/customer/region` 关联过滤：使用子查询关联 `PromotionCondition` 表
- `created_at` 日期范围过滤：解析数组参数 `[start_date, end_date]`

**PromotionRepo.get_export_stmt** 新增 `group` 筛选：
```python
if query.get('group'):
    stmt = stmt.where(Promotion.group.like(f"%{query.get('group')}%"))
```

### 路由层变更

使用 `multi_items()` 替代 `dict()` 解析 URL 参数：
```python
for key, value in request.query_params.multi_items():
    clean_key = key.replace('[]', '')
    # 正确处理数组参数
```

## API 参数变更

| 参数名 | 类型 | 说明 |
|-------|------|------|
| `promotion_code` | string | 促销代码模糊查询 |
| `group` | string | 分组模糊查询 |
| `service` | string | 按 category_id 过滤 |
| `customer` | string | 按 customer_id 过滤 |
| `region` | string | 按 region_id 过滤 |
| `created_at[]` | array | 日期范围 `[start, end]` |

## 待解决问题

- 是否需要支持导出指定范围数据
- 导出接口是否需要权限控制
- 大数据量导出超时和内存溢出风险