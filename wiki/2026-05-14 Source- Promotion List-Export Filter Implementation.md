---
created_at: 2026-06-09 12:59
page_type: source_summary
sources:
- file: 2026-05-14_1600_promotion_list_export_filter.md
  hash: 7f8fda45e16f5ea655f3c1073eb170a1c35cc15d5997c551848ab7aa32e3fcfe
status: draft
summary: ''
title: '2026-05-14 Source: Promotion List/Export Filter Implementation'
updated_at: 2026-06-09 12:59
---

---
title: "2026-05-14 Source: Promotion List/Export Filter Implementation"
page_type: source_summary
status: active
summary: "Backend work adding group filter and fixing GET array parameter bug for promotion list and export endpoints."
sources:
  - file: "2026-05-14_1600_promotion_list_export_filter.md"
confidence: high
---

# Summary

This source documents the implementation of filter enhancements for promotion backend APIs:
- `POST /backend/promotion/list` added filters: `promotion_code` (fuzzy), `group` (fuzzy), `service`, `customer`, `region` (subquery), `created_at` (date range).
- `GET /backend/promotion/download` added `group` filter and corrected array parameter parsing.

## Key Facts

- **Bug**: Export button after list filtering returned all data because `dict(request.query_params)` truncated array parameters like `created_at[]`.
- **Fix**: Switched to `request.query_params.multi_items()` in the route handler.
- **Repository**: `PromotionRepo.paginate` now handles all list filters; `PromotionRepo.get_export_stmt` accepts `group`.
- **Subquery filters**: Service, customer, region filters use subqueries against the `PromotionCondition` table.
- **Date range**: `created_at[]` expects two values `[start, end]`.

## API Parameter Table

| Parameter       | Type   | Description                     |
|-----------------|--------|---------------------------------|
| `promotion_code`| string | Fuzzy code match                |
| `group`         | string | Fuzzy group match               |
| `service`       | string | Filter by category_id           |
| `customer`      | string | Filter by customer_id           |
| `region`        | string | Filter by region_id             |
| `created_at[]`  | array  | Date range [start, end]         |

## Open Questions
- Export of selected/filtered records only
- Export authentication/permissions
- Large dataset timeouts / memory risks

## Relationships
- Extends [[2026-05-13 Source- Promotion 列表导出 CSV 功能实现]]
- Supports [[Dynamic Search Options Loading (LoadingSearch Mechanism)]]
- References [[Promotion Index Page (Index.vue)]]
- Introduces [[URL Array Parameter Parsing in FastAPI]]