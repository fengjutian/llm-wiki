---
created_at: 2026-06-11 09:11
page_type: entity
sources:
- file: 2026-05-13_1026_promotion_tracking_export.md
  hash: 9113bdb7c3815373c496fde7e69b66bfca8f409d3db01194732bd9ca8023c170
status: draft
summary: ''
title: Promotion Tracking Export Endpoint
updated_at: 2026-06-11 09:11
---

---
title: "Promotion Tracking Export Endpoint"
page_type: entity
status: active
summary: "GET /api/v1/backend/market/promotion_tracking/download providing streaming CSV export of promotion usage data."
sources:
  - file: "2026-05-13_1026_promotion_tracking_export.md"
    hash: ""
    sections: ["核心功能", "技术要点"]
confidence: high
---

# Promotion Tracking Export Endpoint

API endpoint for downloading promotion tracking data as a CSV file via streaming.

- **Method**: GET
- **Path**: `/api/v1/backend/market/promotion_tracking/download`
- **Handler**: Defined in `routers/v1/backend/market.py`
- **Streaming**: Uses `streaming_export_response` to return CSV stream with `Content-Type: text/csv`.
- **Data Source**: Calls `CouponService.promotion_tracking_download`, which delegates to `CouponRepo.get_promotion_tracking_stmt` and `iter_paged_export`.
- **Client-side**: Frontend `promotion-tracking.vue` triggers download via `window.open` with query parameters.

## CSV Output
Columns include aggregated data: usage count, total price, discounted price, saving, service line, last used date.

## Related
- [[CouponService]]
- [[CouponRepo]]
- [[promotion-tracking.vue]]
- [[Iter Paged Export]]
- [[Streaming Export Response]]
