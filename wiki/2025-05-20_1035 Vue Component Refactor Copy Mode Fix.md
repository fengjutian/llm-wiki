---
created_at: 2026-06-10 01:52
page_type: source_summary
sources:
- file: 2025-05-20_1035_vue-component-refactor-copy-mode-fix.md
  hash: b68218f954363745488cb4ba13d185953d6e2c113ae686a3c3b1468d7f2a69d3
status: draft
summary: ''
title: 2025-05-20_1035 Vue Component Refactor Copy Mode Fix
updated_at: 2026-06-10 01:52
---

---
title: "2025-05-20_1035 Vue Component Refactor Copy Mode Fix"
page_type: source_summary
status: active
summary: "Source document detailing the refactoring of the Vue Promotion Form component to fix copy mode bugs and reduce code duplication."
sources:
  - file: "2025-05-20_1035_vue-component-refactor-copy-mode-fix.md"
    hash: ""
    sections: []
confidence: high
---

# 2025-05-20_1035 Vue Component Refactor Copy Mode Fix

This source document documents the refactoring of `qb2025_frontend/src/views/admin/promotion/Form.vue` to:
- Fix two bugs in copy mode
- Reduce code duplication by 62% in the `getData` method

## Bug Fixes
- Dialog title: changed from "Edit" to "Create" for copy mode using `:title="isCopyMode ? 'Create' : (editModel ? 'Edit' : 'Create')"`
- API submission: added `!isCopyMode.value` condition to prevent update API call for copy

## Mode Detection
Three props distinguish modes:
- `editModel` (boolean)
- `rowId` (id for edit, null for create/copy)
- `rowData` (pre-fill data for edit/copy)

Copy mode condition: `editModel && rowData && !rowId`.

## Refactoring
- Extracted helper functions: `transformTierData()`, `transformQuantityType()`, `transformToFormData()`
- Constant: `DEFAULT_FILTER_DATA` (value: `{id: 'root', type: 'group', operator: 'AND'}`)
- Computed property: `const isCopyMode = computed(() => props.editModel && props.rowData && !props.rowId)`
- `getData` line count reduced from 120 to 45 lines

## Design Decision
Rejected an explicit `mode` prop (`create|edit|copy`) due to higher modification cost; leveraged existing prop structure.

## Risks
- Depends on parent correct passing of `rowId`/`rowData`
- Thorough testing of all three modes required

## Open Questions
- Batch copy support?
- Auto-clear of fields like `code` on copy?

## See Also
- [[Promotion Form Component (Form.vue)]]
- [[Vue Mode Pattern (Create/Edit/Copy)]]
- [[Vue Component Refactoring Patterns]]
- [[transform-tier-data]]
- [[transform-quantity-type]]
- [[transform-to-form-data]]
- [[default-filter-data]]
- [[iscopymode-computed]]