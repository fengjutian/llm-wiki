---
created_at: 2026-06-11 09:11
page_type: concept
sources:
- file: 2026-05-13_1026_promotion_tracking_export.md
  hash: 9113bdb7c3815373c496fde7e69b66bfca8f409d3db01194732bd9ca8023c170
status: draft
summary: ''
title: DRY Repository SQL Builder Pattern
updated_at: 2026-06-11 09:11
---

---
title: "DRY Repository SQL Builder Pattern"
page_type: concept
status: active
summary: "Architecture pattern where the SQL statement builder is extracted into a separate method in the repository to be shared across multiple queries (list, export, etc.)."
sources:
  - file: "2026-05-13_1026_promotion_tracking_export.md"
    hash: ""
    sections: ["架构决策"]
confidence: high
---

# DRY Repository SQL Builder Pattern

To avoid code duplication, the repository layer separates the construction of the SQL statement (filtering, joins, aggregations) from the execution (pagination, streaming). The statement builder method returns a `Select` object that can be used by different consumers.

## Example
In the promotion tracking feature, `CouponRepo.get_promotion_tracking_stmt` builds the complete SQL with all filters. This statement is then used:
- By the list endpoint with `paginate()`.
- By the export endpoint with `iter_paged_export()`.

This ensures that filter logic is defined once and shared.

## Benefits
- Consistency: both list and export reflect the same filters.
- Maintainability: changing a filter only requires updating one place.
- Testability: the statement builder can be unit-tested independently.

## Related
- [[CouponRepo]]
- [[Iter Paged Export]]
