---
created_at: 2026-06-10 01:52
page_type: entity
sources:
- file: 2025-05-20_1035_vue-component-refactor-copy-mode-fix.md
  hash: b68218f954363745488cb4ba13d185953d6e2c113ae686a3c3b1468d7f2a69d3
status: draft
summary: ''
title: iscopymode-computed
updated_at: 2026-06-10 01:52
---

---
title: "iscopymode-computed"
page_type: entity
status: active
summary: "A Vue computed property that detects whether the Promotion Form is in copy mode based on the editModel, rowId, and rowData props."
sources:
  - file: "2025-05-20_1035_vue-component-refactor-copy-mode-fix.md"
    hash: ""
    sections: ["复制模式判断机制", "修复"]
confidence: high
---

# iscopymode-computed

`isCopyMode` is a computed property added to `Form.vue` to encapsulate the logic for distinguishing copy mode from create/edit modes.

## Implementation
```javascript
const isCopyMode = computed(() => props.editModel && props.rowData && !props.rowId)
```

## Usage
- **Dialog title**: `:title="isCopyMode ? 'Create' : (editModel ? 'Edit' : 'Create')"`
- **API submission**: `if (props.editModel && !isCopyMode.value) { /* call update API */ } else { /* call create API */ }`

## Rationale
Extracting this condition into a named computed improves readability and reduces duplication in template and logic.

## Related
- [[Vue Mode Pattern (Create/Edit/Copy)]] – conforms to this pattern
- [[Promotion Form Component (Form.vue)]] – where it is implemented
- [[Vue Component Refactoring Patterns]] – example of "Computed Properties for Conditionals"