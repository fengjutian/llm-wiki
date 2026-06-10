---
created_at: 2026-06-09 12:47
page_type: source_summary
sources:
- file: 2026-05-13_1100_promotion_dynamic_search_options.md
  hash: 0e570928bf7fb995b02abf4cd9ce5114de989be3d25b4a9ed16e8ae4af088571
status: draft
summary: ''
title: Promotion Index Dynamic Search Options Source
updated_at: 2026-06-09 12:47
---

---
title: "Promotion Index Dynamic Search Options Source"
page_type: source_summary
status: active
summary: "Source document describing implementation of dynamic search dropdown options for promotion index via condition_types API."
sources:
  - file: "2026-05-13_1100_promotion_dynamic_search_options.md"
    sections: ["全部"]
confidence: high
---

# Summary

This source details the changes needed to make the promotion list page's search fields (service, customer, region) load their dropdown options dynamically from a backend API.

## Key Claims
- The original search configuration had empty `options` arrays. Options are now fetched from `/backend/promotion/condition_types`.
- The implementation mirrors the pattern in `customer/Index.vue`: on mount, call API, map condition groups to select options, and set `loadingSearch = true` to force a UI re‑render via the `page-header` component.
- Mapping rules:
  - Customer group: fields become options with `id = field.name`, `label = field.label`.
  - Region group: same as customer.
  - Service group: fields become options with both `id` and `label` set to `field.name` (or `field.label` if present).
- API returns an array of condition group objects, each containing a `type`, `label`, and an array of `fields` with `name` and `label`.
- The frontend file `qb2025_frontend/src/views/admin/promotion/Index.vue` is modified to import the new `getCondition` API, add a `loadingSearch` ref, and bind it to the `page-header` component via `:loading-search`.

## Related
- [[Dynamic Search Options Loading (LoadingSearch Mechanism)]] – the general pattern used here.
- [[Promotion Index Page (Index.vue)]] – the specific page implementing this change.
