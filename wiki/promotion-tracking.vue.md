---
created_at: 2026-06-11 09:11
page_type: entity
sources:
- file: 2026-05-13_1026_promotion_tracking_export.md
  hash: 9113bdb7c3815373c496fde7e69b66bfca8f409d3db01194732bd9ca8023c170
status: draft
summary: ''
title: promotion-tracking.vue
updated_at: 2026-06-11 09:11
---

---
title: "promotion-tracking.vue"
page_type: entity
status: active
summary: "Vue frontend page for promotion tracking, which uses window.open to trigger CSV export."
sources:
  - file: "2026-05-13_1026_promotion_tracking_export.md"
    hash: ""
    sections: ["核心功能", "修改文件"]
confidence: high
---

# promotion-tracking.vue

The Vue component implementing the promotion tracking view, likely at `src/views/admin/promotion/tracking.vue` or similar. It provides a filterable list of promotion usage data and an export button.

## Export Implementation
- When the user clicks the export button, the component constructs URL parameters matching the current filter state.
- It calls `window.open(url)` to initiate a file download; no frontend blob processing is used.
- The `params.csv = 1` parameter was added but is not utilized by the backend currently (potential technical debt).

## Related
- [[Promotion Tracking Export Endpoint]]
