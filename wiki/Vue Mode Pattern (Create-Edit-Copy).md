---
created_at: 2026-06-11 09:13
page_type: concept
sources:
- file: 2025-05-20_1035_vue-component-refactor-copy-mode-fix.md
  hash: a59bfb2d9f3d1493f9b43ead5aeb1475bb2f11d133b65cdfdc22e33bfaacc922
status: draft
summary: ''
title: Vue Mode Pattern (Create/Edit/Copy)
updated_at: 2026-06-11 09:13
---

---
title: "Vue Mode Pattern (Create/Edit/Copy)"
page_type: concept
status: active
summary: "Pattern for distinguishing create, edit, and copy modes in Vue forms using a combination of editModel, rowId, and rowData props."
sources:
  - file: "2025-05-20_1035_vue-component-refactor-copy-mode-fix.md"
    hash: ""
    sections: ["背景与目标", "复制模式判断机制", "设计决策"]
confidence: high
---

# Vue Mode Pattern

A common pattern in Vue admin interfaces for differentiating between Create, Edit, and Copy modes within a single form component.

## Implementation

Three props control the mode:

| Mode   | editModel | rowId | rowData |
|--------|-----------|-------|---------|
| Create | true      | null  | null    |
| Edit   | true      | not null | not null |
| Copy   | true      | **null**  | not null |

**Copy detection logic**: `editModel && rowData && !rowId`

## Design Decision

The Promotion Form team chose this prop‑based approach over an explicit `mode` prop (`type: 'create' | 'edit' | 'copy'`). The explicit approach offers clearer semantics but requires modifying parent components and increases implementation cost. The prop‑based approach leverages existing data flow with minimal changes.

## Usage
- Used in [[Promotion Form Component (Form.vue)]] via the computed property [[iscopymode-computed]].

## Risk
- Depends on parent correctly passing `rowId` and `rowData`.

## See Also
- [[Vue Component Refactoring Patterns]]
- [[iscopymode-computed]]
