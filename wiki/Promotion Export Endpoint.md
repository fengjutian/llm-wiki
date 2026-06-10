---
created_at: 2026-06-09 12:59
page_type: entity
sources:
- file: 2026-05-14_1600_promotion_list_export_filter.md
  hash: 7f8fda45e16f5ea655f3c1073eb170a1c35cc15d5997c551848ab7aa32e3fcfe
status: draft
summary: ''
title: Promotion Export Endpoint
updated_at: 2026-06-09 12:59
---

---
title: "Promotion Export Endpoint"
page_type: entity
status: active
summary: "GET /backend/promotion/download providing streaming CSV export with filters including the new group filter and a fix for array parameter parsing."
sources:
  - file: "2026-05-14_1600_promotion_list_export_filter.md"
  - file: "2026-05-13_1435_promotion_export_csv.md"
confidence: high
---

# Promotion Export Endpoint

Endpoint: `GET /backend/promotion/download`

Streaming CSV export using `streaming_export_response` and `iter_paged_export`. Filters mirror the list endpoint.

## Filters (as of 2026-05-14)

- `promotion_code`
- **`group`** (newly added)
- `service`
- `customer`
- `region`
- `created_at[]` (array of two dates)

## Array Parameter Fix

Previously, `dict(request.query_params)` was used, which collapsed `created_at[]=val1&created_at[]=val2` to a single value. The fix uses `request.query_params.multi_items()` to correctly collect all values for a key (stripping `[]` suffix). This ensures date range filter works as an array `[start, end]`.

## Related
- [[Promotion List Endpoint]]
- [[URL Array Parameter Parsing in FastAPI]]
- [[2026-05-13 Source- Promotion 列表导出 CSV 功能实现]]