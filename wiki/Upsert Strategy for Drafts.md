---
created_at: 2026-06-11 09:09
page_type: concept
sources:
- file: 2025-05-20_1430_register_form_draft.md
  hash: 1108e878826e83e5dc13720aa9315d860f6ec0d4db3810d7a10bbcf82cf58630
status: draft
summary: ''
title: Upsert Strategy for Drafts
updated_at: 2026-06-11 09:09
---

---
title: "Upsert Strategy for Drafts"
page_type: concept
status: active
summary: "Conflict resolution: on save, existing draft for the same email is upserted (updated or inserted), with last write winning."
sources:
  - file: "2025-05-20_1430_register_form_draft.md"
    sections: ["核心决策"]
confidence: high
---

# Upsert Strategy for Drafts

To support multi-device synchronization, the draft save operation uses an **upsert** (update or insert) approach.

## Logic
- If a draft for the given email already exists, it is updated with the new `draft_data`.
- Otherwise, a new draft record is inserted.
- This naturally implements a **last‑write‑wins** conflict resolution, suitable for registration drafts where the latest data is presumed correct.

## Benefits
- No need to synchronize devices; any device can overwrite the draft.
- Simplifies implementation and avoids complex merge logic.

## Related
- Used in [[RegisterFormDraftRepo]] and called from [[Register Form Draft API Endpoints]] POST.
