---
created_at: 2026-06-09 12:32
page_type: source_summary
sources:
- file: 2025-05-20_1035_vue-component-refactor-copy-mode-fix.md
  hash: a59bfb2d9f3d1493f9b43ead5aeb1475bb2f11d133b65cdfdc22e33bfaacc922
status: draft
summary: ''
title: '2025-05-20 Source: Vue Promotion Form 重构与复制模式修复'
updated_at: 2026-06-09 12:32
---

---
title: "2025-05-20 Source: Vue Promotion Form 重构与复制模式修复"
page_type: source_summary
status: active
summary: "Source document (2025-05-20) covering the Promotion Form refactoring, mode detection, bug fixes, and design decisions."
sources: []
confidence: high
---

# Summary

This source is a later revision of the earlier 2025-01-14 document. It contains the same core information but adds:
- A clear **decision rationale** for using `rowId`/`rowData` combination over an explicit `mode` prop.
- **Risk assessment** table covering prop dependency and backward compatibility.
- **Open questions** about batch copy and field clearing.

It also reiterates the key facts: 120-line `getData` reduced to 45, three helper functions, default filter constant, computed `isCopyMode`.

## Key Claims
- Copy mode detected by `rowId === null && rowData !== null`
- Bug: copy showed "Edit" title and called update API
- Fix: added `isCopyMode` computed and conditional logic
- Decision: rejected separate `mode` prop due to modification cost
- Risks: prop dependency from parent, backward compatibility
- Open: batch copy, clearing fields like `code`

## Relationships
- References [[promotion-form-vue]], [[vue-mode-pattern]], [[vue-component-refactor-patterns]]