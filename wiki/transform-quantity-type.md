---
created_at: 2026-06-10 01:52
page_type: entity
sources:
- file: 2025-05-20_1035_vue-component-refactor-copy-mode-fix.md
  hash: b68218f954363745488cb4ba13d185953d6e2c113ae686a3c3b1468d7f2a69d3
status: draft
summary: ''
title: transform-quantity-type
updated_at: 2026-06-10 01:52
---

---
title: "transform-quantity-type"
page_type: entity
status: active
summary: "A helper function in the Promotion Form component that handles transformation of quantity type fields."
sources:
  - file: "2025-05-20_1035_vue-component-refactor-copy-mode-fix.md"
    hash: ""
    sections: ["重构方案"]
confidence: high
---

# transform-quantity-type

`transform-quantity-type` is a helper function extracted during the Promotion Form refactoring. It processes the `quantity_type` field (e.g., "limited" or "unlimited") and adjusts the form data accordingly.

## Purpose
- Remove duplicate logic for handling quantity type across Edit and Copy modes.
- Centralize the logic for setting quantity-related fields.

## Usage
Called within `transformToFormData()` or `getData`.

## Related
- [[Promotion Form Component (Form.vue)]]
- [[Vue Component Refactoring Patterns]]
- [[transform-tier-data]]
- [[transform-to-form-data]]