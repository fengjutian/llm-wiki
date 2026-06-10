---
created_at: 2026-06-09 12:49
page_type: source_summary
sources:
- file: 2026-05-13_1435_promotion_export_csv.md
  hash: 43df4f5e52a8c623c747ee6f7c4c19dff7cd0d42efa0366c0a5838c423530120
status: draft
summary: ''
title: '2026-05-13 Source: Promotion 列表导出 CSV 功能实现'
updated_at: 2026-06-09 12:49
---

---
title: "2026-05-13 Source: Promotion 列表导出 CSV 功能实现"
page_type: source_summary
status: active
summary: "Implementation of backend streaming CSV export for promotions, solving pagination limits and using GET /api/v1/backend/promotion/download."
sources:
  - file: "2026-05-13_1435_promotion_export_csv.md"
    hash: ""
    sections: ["全部"]
confidence: high
---

# Overview

This source documents the addition of a CSV export feature to the Promotion management page. The key decision was to implement a **backend streaming API** (`GET /api/v1/backend/promotion/download`) instead of a front‑end approach, because the existing `getList` API could only return up to 15 rows due to default pagination.

## Problem

- Front‑end attempted to fetch all data via `getList` but was limited by the backend’s default `paginate` size of 15.
- Even without `page`/`pagesize` params, only 15 records were returned.

## Solution

A new download endpoint that:
- Accepts the same search filters as the list page: `promotion_code`, `service`, `customer`, `region`, `created_at` (start/end).
- Streams results directly from the database using `iter_paged_export` and `streaming_export_response`.
- Returns `Content-Type: text/csv` with a filename like `promotion-YYYYMMDD_HHmmss.csv`.

## CSV Columns

| Header           | Content                        |
|------------------|--------------------------------|
| Type             | Promotion / Referral Code / Coupon |
| Group            | Group name                     |
| Code             | Promotion code                 |
| Name             | Description                    |
| Date from        | Start date (MM/DD/YYYY)        |
| Date to          | End date (MM/DD/YYYY)          |
| Usage            | Auto / No                      |
| Quantity         | Quantity or “Unlimited”        |
| Discount Type    | Discount type                  |
| Discount Value   | Discount value                 |
| Creator          | Created by                     |
| Updater          | Last updated by                |

## Architecture Decision

Three reasons for choosing backend streaming:
1. Front‑end could not retrieve all records due to pagination.
2. Streaming avoids large memory consumption on the server.
3. Consistent with the existing `promotion_tracking_download` pattern.

## Risks

- **Performance**: SQL `GROUP BY` and sub‑query filters may be slow for very large datasets.
- **Tier data**: Tier discount information is exported as raw JSON, which may not be user‑friendly.
- **Data volume**: No explicit row limit is set; may need one.

## Open Questions

- What should be the maximum number of exported records?
- Is the JSON representation of Tier discounts acceptable to business users?
- Should a progress indicator be added?

## Relationships
- Extends the [[Promotion Index Page]] by adding an export capability.
