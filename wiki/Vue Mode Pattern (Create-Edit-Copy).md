---
created_at: 2026-06-09 12:14
page_type: concept
sources:
- file: 2025-01-14_1035_vue-component-refactor-copy-mode-fix.md
  hash: e3ada7d6d1feba8a6d1435a450ce5ba44f26f065635faa64b371a682378f0e55
- file: 2025-05-20_1035_vue-component-refactor-copy-mode-fix.md
  hash: a59bfb2d9f3d1493f9b43ead5aeb1475bb2f11d133b65cdfdc22e33bfaacc922
status: draft
summary: ''
title: Vue Mode Pattern (Create/Edit/Copy)
updated_at: 2026-06-09 12:32
---

---
title: "Vue Mode Pattern (Create/Edit/Copy)"
page_type: concept
status: active
summary: "A pattern for distinguishing create, edit, and copy modes in Vue forms using three boolean/data props and a computed property (isCopyMode)."
sources:
  - file: "2025-01-14_1035_vue-component-refactor-copy-mode-fix.md"
    sections: ["背景与问题", "技术方案"]
confidence: high
---

# Vue Mode Pattern

When a form component needs to handle **create**, **edit**, and **copy** scenarios, a clear pattern is to use three props:
- `editModel` (Boolean, or a discriminator prop)
- `rowId` (ID of the record – `null` for create/copy)
- `rowData` (pre‑fill data – `null` for create)

Copy mode is identified by the unique combination `rowId === null && rowData !== null`. This is often extracted into a computed property:
```javascript
const isCopyMode = computed(() => props.editModel && props.rowData && !props.rowId)
```

This pattern was observed and formalised during the [[promotion-form-vue]] refactoring.

## Alternative Approach

An explicit `mode` prop (e.g., `type: 'create' | 'edit' | 'copy'`) was considered but not adopted due to the higher modification cost in parent components. The three‑prop method leverages existing interfaces while enabling the same distinction.

## Application
- Use in templates: `:title="isCopyMode ? 'Create' : (editModel ? 'Edit' : 'Create')"`
- Use in logic: conditionally call create vs. update APIs.