---
created_at: 2026-06-11 09:09
page_type: concept
sources:
- file: 2025-05-20_1430_register_form_draft.md
  hash: 1108e878826e83e5dc13720aa9315d860f6ec0d4db3810d7a10bbcf82cf58630
status: draft
summary: ''
title: Soft Delete Drafts
updated_at: 2026-06-11 09:09
---

---
title: "Soft Delete Drafts"
page_type: concept
status: active
summary: "Soft deletion strategy for registration drafts: set is_deleted flag instead of physical removal, allowing traceability and potential recovery."
sources:
  - file: "2025-05-20_1430_register_form_draft.md"
    sections: ["核心决策", "核心功能"]
confidence: high
---

# Soft Delete Drafts

Registration drafts are soft‑deleted by setting an `is_deleted` flag to `True`, rather than physically removing the record.

## Rationale
- Provides an audit trail for completed registrations.
- Enables future “undo” or recovery features.
- The delete API endpoint ([Register Form Draft API Endpoints]]) triggers soft deletion.

## Cleanup
- Soft‑deleted records older than 30 days are scheduled for hard deletion (planned).

## Related
- [[RegisterFormDraft]] model includes the `is_deleted` field.
