---
created_at: 2026-06-11 09:13
page_type: entity
sources:
- file: 2025-05-20_1035_vue-component-refactor-copy-mode-fix.md
  hash: a59bfb2d9f3d1493f9b43ead5aeb1475bb2f11d133b65cdfdc22e33bfaacc922
status: draft
summary: ''
title: transform-tier-data
updated_at: 2026-06-11 09:13
---

---
title: "transform-tier-data"
page_type: entity
status: active
summary: "Helper function in Promotion Form that converts API tier data into the form's tier structure."
sources:
  - file: "2025-05-20_1035_vue-component-refactor-copy-mode-fix.md"
    hash: ""
    sections: ["重构方案"]
confidence: high
---

# transform-tier-data

A helper function extracted during the Promotion Form refactoring. It converts backend tier data (from the API) into the form's tier configuration object. 

## Input
- Array of tier objects from the backend, each containing `min_price`, `max_price`, `discount_type`, `discount_value`.

## Output
- Frontend tier structure with:
  - `infinity` flag when `max_price` is `null`.
  - Discount types mapped to `discount_value1` (percent), `discount_value2` (fixed), `discount_value3` (per_fixed).

## Rationale
This logic was originally duplicated in both Copy and Edit paths (about 40 lines). Extracting it into a reusable function eliminated duplication and made the `getData` method shrink from 120 to 45 lines.

## See Also
- [[transform-quantity-type]]
- [[transform-to-form-data]]
- [[Promotion Form Component (Form.vue)]]
- [[Sales Amount Tier]]
- [[TransformTierForSubmit]]
