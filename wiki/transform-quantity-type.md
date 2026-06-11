---
created_at: 2026-06-11 09:13
page_type: entity
sources:
- file: 2025-05-20_1035_vue-component-refactor-copy-mode-fix.md
  hash: a59bfb2d9f3d1493f9b43ead5aeb1475bb2f11d133b65cdfdc22e33bfaacc922
status: draft
summary: ''
title: transform-quantity-type
updated_at: 2026-06-11 09:13
---

---
title: "transform-quantity-type"
page_type: entity
status: active
summary: "Helper function that determines the quantity type for a promotion based on the is_auto and quantity fields."
sources:
  - file: "2025-05-20_1035_vue-component-refactor-copy-mode-fix.md"
    hash: ""
    sections: ["重构方案"]
confidence: medium
---

# transform-quantity-type

A helper function extracted during the Promotion Form refactoring. It processes the `is_auto` and `quantity` flags to determine the appropriate quantity type value for the form (e.g., 'Auto', 'No', 'Unlimited').

## Details
- Input: `is_auto` (Boolean), `quantity` (Number).
- Output: A string representing the quantity mode.
- This logic was previously inlined in `getData`.

## Usage
Called within [[transform-to-form-data]] or directly during data preparation.

## Related
- [[Promotion Form Component (Form.vue)]]
- [[transform-to-form-data]]
