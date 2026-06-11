---
created_at: 2026-06-11 09:09
page_type: concept
sources:
- file: 2025-05-20_1430_register_form_draft.md
  hash: 1108e878826e83e5dc13720aa9315d860f6ec0d4db3810d7a10bbcf82cf58630
status: draft
summary: ''
title: RegisterFormDraft
updated_at: 2026-06-11 09:09
---

---
title: "RegisterFormDraft"
page_type: entity
status: active
summary: "SQLModel ORM model for the registration form draft, stored in the register_form_draft table. Supports soft delete and stores draft data as JSON."
sources:
  - file: "2025-05-20_1430_register_form_draft.md"
    sections: ["关键文件", "Bug修复", "安全措施"]
confidence: high
---

# RegisterFormDraft

The `RegisterFormDraft` model is defined in `backend/models/Customer.py` and represents a saved draft of the registration form.

## Fields
- `id`: primary key
- `email`: unique, the user's email address.
- `draft_data`: JSON field storing the form data.
- `is_deleted`: boolean flag for soft delete.
- `created_at`: timestamp of creation.
- `updated_at`: timestamp of last update.

## Soft Delete
When a user completes registration, the draft is soft-deleted (`is_deleted = True`). Cleanup of soft-deleted records (hard delete after 30 days) is planned.

## Bug Fix
When using `sa_column=Column(...)` in SQLModel, the `index=True` parameter must be placed **inside** `Column()`, not in `Field()`. Previously this caused conflicts.

## Relationships
- Managed by [[RegisterFormDraftRepo]].
- Exposed via [[Register Form Draft API Endpoints]].
- Uses [[Upsert Strategy for Drafts]] for conflict resolution.
