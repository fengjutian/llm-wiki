---
created_at: 2026-06-10 01:52
page_type: entity
sources:
- file: 2025-05-20_1035_vue-component-refactor-copy-mode-fix.md
  hash: b68218f954363745488cb4ba13d185953d6e2c113ae686a3c3b1468d7f2a69d3
status: draft
summary: ''
title: default-filter-data
updated_at: 2026-06-10 01:52
---

---
title: "default-filter-data"
page_type: entity
status: active
summary: "A constant defining the default filter structure used in the Promotion Form."
sources:
  - file: "2025-05-20_1035_vue-component-refactor-copy-mode-fix.md"
    hash: ""
    sections: ["重构方案", "核心问题"]
confidence: high
---

# default-filter-data

`default-filter-data` is a constant introduced during the Promotion Form refactoring to replace multiple hard-coded occurrences of the same filter structure.

## Value
```javascript
{
  id: 'root',
  type: 'group',
  operator: 'AND'
}
```

## Purpose
- Avoid magic values scattered in `getData` and other places.
- Provide a single source of truth for the initial filter configuration, improving consistency and maintainability.

## Related
- [[Promotion Form Component (Form.vue)]]
- [[Vue Component Refactoring Patterns]] – exemplifies the "Replace Magic Values with Constants" pattern