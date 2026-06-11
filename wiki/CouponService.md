---
created_at: 2026-06-11 09:11
page_type: entity
sources:
- file: 2026-05-13_1026_promotion_tracking_export.md
  hash: 9113bdb7c3815373c496fde7e69b66bfca8f409d3db01194732bd9ca8023c170
status: draft
summary: ''
title: CouponService
updated_at: 2026-06-11 09:11
---

---
title: "CouponService"
page_type: entity
status: active
summary: "Backend service class in services/Promotion.py containing promotion_tracking_download method for streaming export."
sources:
  - file: "2026-05-13_1026_promotion_tracking_export.md"
    hash: ""
    sections: ["技术要点", "架构决策"]
confidence: high
---

# CouponService

The service layer class responsible for coupon-related business logic, located in `services/Promotion.py`. It provides the `promotion_tracking_download` method that orchestrates streaming export of promotion usage data.

## Key Method

### `promotion_tracking_download()`
- Accepts filter parameters (same as the promotion tracking page).
- Retrieves the SQL statement via `CouponRepo.get_promotion_tracking_stmt`.
- Uses `iter_paged_export` to paginate through results in batches.
- Returns a generator yielding CSV rows via `streaming_export_response`.

## Architecture
The method ensures separation of concerns: SQL construction is delegated to `CouponRepo`, while the service coordinates pagination and streaming.

## Related
- [[CouponRepo]]
- [[Promotion Tracking Export Endpoint]]
- [[Iter Paged Export]]
- [[Streaming Export Response]]
