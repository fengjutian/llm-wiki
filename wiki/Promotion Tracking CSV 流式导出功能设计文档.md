---
created_at: 2026-06-11 09:11
page_type: source_summary
sources:
- file: 2026-05-13_1026_promotion_tracking_export.md
  hash: 9113bdb7c3815373c496fde7e69b66bfca8f409d3db01194732bd9ca8023c170
status: draft
summary: ''
title: Promotion Tracking CSV 流式导出功能设计文档
updated_at: 2026-06-11 09:11
---

---
title: "Promotion Tracking CSV 流式导出功能设计文档"
page_type: source_summary
status: active
summary: "Design document detailing the streaming CSV export feature for promotion tracking, including architecture, data flow, and implementation."
sources:
  - file: "2026-05-13_1026_promotion_tracking_export.md"
    hash: ""
    sections: ["全部"]
confidence: high
---

# Promotion Tracking CSV 流式导出功能设计文档

This source document describes the full technical design for adding a CSV streaming export feature to the promotion tracking page.

## Key Decisions
- Backend streaming API `GET /api/v1/backend/market/promotion_tracking/download` using `iter_paged_export` and `streaming_export_response`.
- Frontend triggers download via `window.open` with URL parameters, no blob handling.
- Repository layer split: SQL statement builder `get_promotion_tracking_stmt` extracted to share between list and export.

## Key Claims
- Export uses aggregated SQL: `COUNT(DISTINCT order_id)`, `SUM`, `GROUP_CONCAT`, `MAX`.
- Modifies files: `repository/Promotion.py`, `services/Promotion.py`, `routers/v1/backend/market.py`, `promotion-tracking.vue`.
- Risks: permission decorator, no progress feedback, unused `params.csv=1`.

## Relationships
- Introduces [[Promotion Tracking Export Endpoint]], [[CouponService]], [[CouponRepo]], [[promotion-tracking.vue]].
- Implements [[DRY Repository SQL Builder Pattern]] in CouponRepo.
- Uses [[Iter Paged Export]] and [[Streaming Export Response]].
