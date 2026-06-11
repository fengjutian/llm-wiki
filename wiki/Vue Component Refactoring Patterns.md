---
created_at: 2026-06-11 09:13
page_type: overview
sources:
- file: 2025-05-20_1035_vue-component-refactor-copy-mode-fix.md
  hash: a59bfb2d9f3d1493f9b43ead5aeb1475bb2f11d133b65cdfdc22e33bfaacc922
status: draft
summary: ''
title: Vue Component Refactoring Patterns
updated_at: 2026-06-11 09:13
---

---
title: "Vue Component Refactoring Patterns"
page_type: overview
status: active
summary: "Collection of patterns used in the Promotion Form refactoring: extract helper functions, magic values to constants, computed properties for conditionals."
sources:
  - file: "2025-05-20_1035_vue-component-refactor-copy-mode-fix.md"
    hash: ""
    sections: ["核心问题", "重构方案"]
confidence: high
---

# Vue Component Refactoring Patterns

During the Promotion Form refactoring, several reusable patterns emerged:

## 1. Extract Helper Functions
- Repeated logic (e.g., tier data transformation) is moved into standalone functions ([[transform-tier-data]], [[transform-quantity-type]]).
- This follows the [[dry-principle]] and reduces main method length from 120→45 lines.

## 2. Replace Magic Values with Constants
- Often‑repeated default objects (e.g., filter structure `{ id: 'root', type: 'group', operator: 'AND' }`) are extracted into named constants ([[default-filter-data]]).
- Improves consistency and readability.

## 3. Computed Properties for Conditionals
- Complex mode detection logic is encapsulated in a computed property ([[iscopymode-computed]]) rather than repeated in template and script.
- Simplifies conditional rendering and API branching.

## Benefits
- Code maintainability
- Reduced duplication
- Easier testing

## Related
- [[Promotion Form Component (Form.vue)]]
- [[vue-mode-pattern]]
