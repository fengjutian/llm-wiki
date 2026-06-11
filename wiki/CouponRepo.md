---
created_at: 2026-06-11 09:11
page_type: entity
sources:
- file: 2026-05-13_1026_promotion_tracking_export.md
  hash: 9113bdb7c3815373c496fde7e69b66bfca8f409d3db01194732bd9ca8023c170
status: draft
summary: ''
title: CouponRepo
updated_at: 2026-06-11 09:11
---

---
title: "CouponRepo"
page_type: entity
status: active
summary: "Repository class in repository/Promotion.py providing data access for coupons, including get_promotion_tracking_stmt."
sources:
  - file: "2026-05-13_1026_promotion_tracking_export.md"
    hash: ""
    sections: ["技术要点", "架构决策"]
confidence: high
---

# CouponRepo

The repository class in `repository/Promotion.py` that handles database queries for coupon and promotion tracking data. It follows the [[DRY Repository SQL Builder Pattern]] by separating the SQL statement builder from the pagination executor.

## Key Method

### `get_promotion_tracking_stmt()`
- Builds a SQLAlchemy statement for promotion tracking aggregation.
- Includes:
  - `COUNT(DISTINCT order_id)` for usage count.
  - `SUM` for total_price, discounted_price, saving.
  - `GROUP_CONCAT(DISTINCT Category.name)` for service lines.
  - `MAX(created_at)` for last used date.
- Supports filters identical to the list page.

This statement is reused by both the list endpoint (paginated) and the export endpoint (streaming via `iter_paged_export`).

## Related
- [[CouponService]]
- [[Promotion Tracking Export Endpoint]]
- [[DRY Repository SQL Builder Pattern]]
