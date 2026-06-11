---
type: source
title: "Promotion Tracking CSV 流式导出功能设计文档"
created: 2026-05-13
updated: 2026-05-13
tags: [fastapi, streaming, csv-export, sqlalchemy, frontend, backend]
related: [iter-paged-export, streaming-export-response, promotion-tracking-vue, coupon-service, coupon-repo, dry-principle, repository-layer-design, streaming-export]
sources: ["2026-05-13_1026_promotion_tracking_export.md"]
---
# Promotion Tracking CSV 流式导出功能设计文档

## 摘要

本文档记录了 promotion-tracking 页面新增 CSV 流式导出功能的完整技术方案和实现细节。该功能允许运营/市场团队按筛选条件导出完整的 promotion 使用数据，采用流式导出方案避免内存溢出，前端通过 `window.open` 直接触发浏览器下载。

## 核心功能

- **新增导出接口**：`GET /api/v1/backend/market/promotion_tracking/download`
- **流式导出方案**：复用 `iter_paged_export` + `streaming_export_response`
- **数据来源**：SQLAlchemy 聚合查询（COUNT/SUM/GROUP_CONCAT）
- **前端触发**：window.open 直接下载，无 Blob 处理

## 修改文件

| 文件 | 修改目的 |
|------|----------|
| `repository/Promotion.py` | SQL 构建器与分页执行器分离，DRY |
| `services/Promotion.py` | 新增 `promotion_tracking_download` 流式导出 |
| `routers/v1/backend/market.py` | 新增 GET 下载路由 |
| `promotion-tracking.vue` | Export 按钮改为 window.open |

## 技术要点

### 流式导出数据流

```
前端 URL 参数 → FastAPI 路由 → CouponService.promotion_tracking_download → 
CouponRepo.get_promotion_tracking_stmt → iter_paged_export 分批流式读取 → 
streaming_export_response 编码为 CSV 流 → 浏览器自动下载
```

### SQL 聚合逻辑

```sql
COUNT(DISTINCT order_id) AS use
SUM(total_price + saving) AS total_price
SUM(total_price) AS discounted_price
SUM(saving) AS saving
GROUP_CONCAT(DISTINCT Category.name) AS service_line
MAX(created_at) AS last_used_at
```

## 架构决策

**Repository 层拆分**：将 SQL 构建逻辑提取为独立函数 `get_promotion_tracking_stmt`，列表查询与导出共享同一套 SQL，避免代码重复。

## 已知风险

1. 新增路由的权限装饰器是否正确配置待确认
2. 流式导出无进度反馈，超大导出可能超时
3. `params.csv = 1` 参数后端未使用，可能成为技术债务

## 待解决问题

- 是否支持 Excel 格式导出
- `params.csv = 1` 是否应移除