---
created_at: 2026-06-09 12:14
page_type: entity
sources:
- file: 2025-01-14_1035_vue-component-refactor-copy-mode-fix.md
  hash: e3ada7d6d1feba8a6d1435a450ce5ba44f26f065635faa64b371a682378f0e55
- file: 2025-05-20_1035_vue-component-refactor-copy-mode-fix.md
  hash: a59bfb2d9f3d1493f9b43ead5aeb1475bb2f11d133b65cdfdc22e33bfaacc922
status: draft
summary: ''
title: Promotion Form Component (Form.vue)
updated_at: 2026-06-09 12:32
---

---
title: "Promotion Form Component (Form.vue)"
page_type: entity
status: active
summary: "Vue component for creating, editing, and copying promotions. Uses three props (editModel, rowId, rowData) and a computed isCopyMode to distinguish modes."
sources:
  - file: "2025-01-14_1035_vue-component-refactor-copy-mode-fix.md"
    sections: ["背景与问题", "技术方案"]
confidence: high
---

# Promotion Form Component

Located at `qb2025_frontend/src/views/admin/promotion/Form.vue`, this Vue component handles the creation, editing, and copying of promotional records.

## Mode Distinction

Three props control the form behavior:
- `editModel` (Boolean) – whether it is an edit/create modal.
- `rowId` (String?) – ID of the record being edited, or `null` for new/copy.
- `rowData` (Object?) – data used to pre‑fill the form for editing or copying.

| Mode   | editModel | rowId | rowData |
|--------|-----------|-------|---------|
| Create | true      | null  | null    |
| Edit   | true      | not null | not null |
| Copy   | true      | null  | not null |

Copy mode is specifically detected by: `rowId === null && rowData !== null`.

## Refactored `getData` Method

Originally 120 lines, now 45. The refactoring introduced:
- **Helper functions**: `transformTierData()`, `transformQuantityType()`, `transformToFormData()` that encapsulate transformation logic.
- **Constant**: `DEFAULT_FILTER_DATA` for default filter values.
- **Computed property**: `const isCopyMode = computed(() => props.editModel && props.rowData && !props.rowId)`.

## Bug Fixes

1. **Dialog title**: Now displays "Create" for copy mode: `:title="isCopyMode ? 'Create' : (editModel ? 'Edit' : 'Create')"`.
2. **API call**: The update endpoint is only called for edit mode: `if (props.editModel && !isCopyMode.value)`.

## Design Decision: Mode Detection

The decision to use `rowId === null && rowData !== null` for copy mode was taken over an alternative of adding an explicit `mode` prop (e.g., `type: 'create' | 'edit' | 'copy'`). The explicit approach is semantically clearer but requires modifying parent components and has a higher implementation cost. The current approach works with existing prop interfaces.

## Risk Assessment

| Risk | Description | Mitigation |
|------|-------------|------------|
| Props dependency | Depends on parent supplying correct values for `rowId` and `rowData`. | Clear documentation and future considerations for a dedicated mode prop. |
| Backward compatibility | Adding `isCopyMode` does not break existing create/edit flows. | Thorough testing of all three modes after changes. |

## Open Questions

- Should batch copy be supported?
- Should certain fields (e.g., `code`) be automatically cleared when copying?

## See Also
- [[vue-mode-pattern]] – the generic mode detection pattern.
- [[vue-component-refactor-patterns]] – best practices from this refactoring.