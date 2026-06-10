---
created_at: 2026-06-09 12:14
page_type: source_summary
sources:
- file: 2025-01-14_1035_vue-component-refactor-copy-mode-fix.md
  hash: e3ada7d6d1feba8a6d1435a450ce5ba44f26f065635faa64b371a682378f0e55
status: draft
summary: ''
title: Vue Promotion Form 重构与复制模式修复 (Source Summary)
updated_at: 2026-06-09 12:14
---

---
title: "Vue Promotion Form 重构与复制模式修复 (Source Summary)"
page_type: source_summary
status: active
summary: "Source document describing the refactoring of the Promotion Form.vue component to reduce code duplication and fix copy mode bugs."
sources:
  - file: "2025-01-14_1035_vue-component-refactor-copy-mode-fix.md"
    hash: ""
confidence: high
---

# Summary

This source documents a refactoring of the Vue component `promotion/Form.vue` that:
- Fixed two bugs in the copy mode (title showing "Edit", wrong API called).
- Reduced code duplication by 62% (from 120 to 45 lines) in the `getData` method.
- Introduced a reusable pattern for distinguishing create/edit/copy modes using three props and a computed property.

## Key Facts

- **Bugs addressed**: Copy mode erroneously displayed "Edit" as the dialog title and submitted to the update endpoint instead of create.
- **Mode detection mechanism**: The three props `editModel`, `rowId`, `rowData` are used. Copy mode is identified when `rowId === null && rowData !== null`.
- **Refactoring actions**:
  - Extracted helper functions `transformTierData()`, `transformQuantityType()`, `transformToFormData()`.
  - Defined constant `DEFAULT_FILTER_DATA` to replace magic values.
  - Added computed property `isCopyMode` to encapsulate the mode check.
- **Fixes**:
  - Title: `:title="isCopyMode ? 'Create' : (editModel ? 'Edit' : 'Create')"`
  - API submission: `if (props.editModel && !isCopyMode.value)` (skip update for copy).
- **Affected file**: Only `qb2025_frontend/src/views/admin/promotion/Form.vue`.
- **Key outcomes**: `getData` lines reduced by 62%, two repetitive blocks (~40 lines each) eliminated, and a reusable mode‑check pattern established.

## Related Entities & Concepts
- [[promotion-form-vue]] – the Form.vue component.
- [[vue-mode-pattern]] – the mode detection pattern.
- [[vue-component-refactor-patterns]] – general refactoring lessons from this case.
