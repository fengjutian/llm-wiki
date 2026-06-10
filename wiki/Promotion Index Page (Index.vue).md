---
created_at: 2026-06-09 12:47
page_type: entity
sources:
- file: 2026-05-13_1100_promotion_dynamic_search_options.md
  hash: 0e570928bf7fb995b02abf4cd9ce5114de989be3d25b4a9ed16e8ae4af088571
status: draft
summary: ''
title: Promotion Index Page (Index.vue)
updated_at: 2026-06-09 12:47
---

---
title: "Promotion Index Page (Index.vue)"
page_type: entity
status: active
summary: "Vue list page for promotions at qb2025_frontend/src/views/admin/promotion/Index.vue, featuring dynamic search option loading."
sources:
  - file: "2026-05-13_1100_promotion_dynamic_search_options.md"
    sections: ["文件变更"]
confidence: high
---

# Promotion Index Page (Index.vue)

This is the main list page for viewing and searching promotions in the Vue admin frontend. It uses the `page-header` component to render a search bar and a table of promotion records.

## Dynamic Search Options

As of 2026-05-13, the page loads search filter dropdown options (service, customer, region) dynamically from the backend endpoint `/backend/promotion/condition_types` using the `getCondition` API. This replaces the previous hard‑coded empty `options` arrays.

**Implementation Details**
- **API**: `getCondition` – a POST request to the above endpoint.
- **Lifecycle**: In `onMounted`, the API is called, its response is mapped into the respective search field configurations, and then `loadingSearch` is set to `true`.
- **Refresh trigger**: The `page-header` component is passed `:loading-search="loadingSearch"`, causing it to rebuild the search UI when `loadingSearch` toggles.

**Mapping**
- Customer and Region groups: `{ id: field.name, label: field.label }`
- Service group: `{ id: field.name, label: field.label || field.name }`

## Related
- [[Dynamic Search Options Loading (LoadingSearch Mechanism)]] – the pattern that makes this work.
- [[Promotion Form Component (Form.vue)]] – the form used to create/edit promotions.
- [[2026-05-13_1100_promotion_dynamic_search_options]] – the source document detailing this feature.
