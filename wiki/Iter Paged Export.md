---
created_at: 2026-06-11 09:11
page_type: concept
sources:
- file: 2026-05-13_1026_promotion_tracking_export.md
  hash: 9113bdb7c3815373c496fde7e69b66bfca8f409d3db01194732bd9ca8023c170
status: draft
summary: ''
title: Iter Paged Export
updated_at: 2026-06-11 09:11
---

---
title: "Iter Paged Export"
page_type: concept
status: active
summary: "Utility for iterating over database query results in fixed-size pages, used for streaming exports to prevent memory overload."
sources:
  - file: "2026-05-13_1026_promotion_tracking_export.md"
    hash: ""
    sections: ["技术要点"]
confidence: high
---

# Iter Paged Export

`iter_paged_export` is a reusable utility (likely in `utils` or `core`) that executes a SQLAlchemy statement in batches (pages). It yields chunks of results, allowing large datasets to be processed without loading all records into memory at once.

## Usage
- Called by `CouponService.promotion_tracking_download` to stream rows for CSV export.
- Works with `[[Streaming Export Response]]` to encode rows incrementally.
- Prevents memory saturation when exporting thousands of records.

## Pattern
A typical implementation uses `limit`/`offset` or keyset pagination to fetch a fixed number of rows per iteration, yielding them to a generator.

## Related
- [[Streaming Export Response]]
- [[Promotion Tracking Export Endpoint]]
