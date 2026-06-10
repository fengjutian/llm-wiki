---
created_at: 2026-06-10 01:52
page_type: entity
sources:
- file: 2025-05-20_1035_vue-component-refactor-copy-mode-fix.md
  hash: b68218f954363745488cb4ba13d185953d6e2c113ae686a3c3b1468d7f2a69d3
status: draft
summary: ''
title: transform-tier-data
updated_at: 2026-06-10 01:52
---

---
title: "transform-tier-data"
page_type: entity
status: active
summary: "A helper function in the Promotion Form component that encapsulates tier data transformation logic."
sources:
  - file: "2025-05-20_1035_vue-component-refactor-copy-mode-fix.md"
    hash: ""
    sections: ["重构方案"]
confidence: high
---

# transform-tier-data

`transform-tier-data` is a helper function extracted during the refactoring of `Form.vue` in the Promotion module. It handles the transformation of tier-related data (e.g., tier discounts) from the raw format to the form format.

## Purpose
- Eliminate ~40 lines of duplicate transformation logic between the Edit and Copy modes in `getData`.
- Improve maintainability and testability.

## Usage
Called within `transformToFormData()` or directly in `getData` to process tier arrays.

## Related
- [[Promotion Form Component (Form.vue)]] – component where it is used
- [[Vue Component Refactoring Patterns]] – part of the "Extract Helper Functions" pattern
- [[transform-quantity-type]]
- [[transform-to-form-data]]