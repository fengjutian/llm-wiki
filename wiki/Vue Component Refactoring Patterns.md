---
created_at: 2026-06-09 12:14
page_type: concept
sources:
- file: 2025-01-14_1035_vue-component-refactor-copy-mode-fix.md
  hash: e3ada7d6d1feba8a6d1435a450ce5ba44f26f065635faa64b371a682378f0e55
status: draft
summary: ''
title: Vue Component Refactoring Patterns
updated_at: 2026-06-09 12:14
---

---
title: "Vue Component Refactoring Patterns"
page_type: concept
status: active
summary: "A set of practical refactoring techniques observed in Vue components: extract transformation functions, replace magic values with named constants, and encapsulate conditions in computed properties."
sources:
  - file: "2025-01-14_1035_vue-component-refactor-copy-mode-fix.md"
    sections: ["技术方案"]
confidence: high
---

# Vue Component Refactoring Patterns

From the [[2025-01-14_1035_vue-component-refactor-copy-mode-fix]] refactoring of the Promotion Form, the following patterns emerged:

1. **Extract Helper Functions** – Move repeated transformation logic (e.g., `transformTierData()`, `transformQuantityType()`, `transformToFormData()`) into named functions. This reduces method duplication and improves testability.

2. **Replace Magic Values with Constants** – Define constants like `DEFAULT_FILTER_DATA` to avoid scattered, unexplained literal values.

3. **Computed Properties for Conditionals** – Wrap multi‑prop mode checks into a computed property (e.g., `isCopyMode`) to centralise the logic and keep templates declarative.

These patterns reduced the `getData` method from 120 to 45 lines and eliminated two ~40‑line code blocks.
