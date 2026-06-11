---
created_at: 2026-06-11 09:09
page_type: concept
sources:
- file: 2025-05-20_1430_register_form_draft.md
  hash: 1108e878826e83e5dc13720aa9315d860f6ec0d4db3810d7a10bbcf82cf58630
status: draft
summary: ''
title: SQLModel Index and sa_column Conflict
updated_at: 2026-06-11 09:09
---

---
title: "SQLModel Index and sa_column Conflict"
page_type: concept
status: active
summary: "Bug fix: when using sa_column=Column(...) in SQLModel, the index=True parameter must be placed inside Column() rather than Field()."
sources:
  - file: "2025-05-20_1430_register_form_draft.md"
    sections: ["Bug修复"]
confidence: high
---

# SQLModel Index and sa_column Conflict

A bug was encountered in the [[RegisterFormDraft]] model when specifying an index on an email column.

## Problem
- Using `Field(..., index=True, sa_column=Column(...))` caused an error because `index` conflicted with the explicit column definition.

## Solution
- Move `index=True` into the `Column()` call:
```python
sa_column=Column(..., index=True)
```

## Implication
- This is a known SQLModel behaviour: when `sa_column` is provided, all column‑level parameters must reside inside `Column()`, not in `Field()`.
