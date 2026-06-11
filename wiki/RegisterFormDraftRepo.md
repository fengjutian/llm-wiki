---
created_at: 2026-06-11 09:09
page_type: concept
sources:
- file: 2025-05-20_1430_register_form_draft.md
  hash: 1108e878826e83e5dc13720aa9315d860f6ec0d4db3810d7a10bbcf82cf58630
status: draft
summary: ''
title: RegisterFormDraftRepo
updated_at: 2026-06-11 09:09
---

---
title: "RegisterFormDraftRepo"
page_type: entity
status: active
summary: "Repository class for RegisterFormDraft, providing data access methods for draft save, get, and soft delete."
sources:
  - file: "2025-05-20_1430_register_form_draft.md"
    sections: ["关键文件"]
confidence: high
---

# RegisterFormDraftRepo

The `RegisterFormDraftRepo` is defined in `backend/repository/Customer.py` and implements data access for the [[RegisterFormDraft]] model.

## Methods (inferred)
- `save_draft(email, draft_data)`: inserts or updates a draft using upsert logic.
- `get_draft(email)`: retrieves a non‑deleted draft by email.
- `delete_draft(email)`: performs a soft delete (sets `is_deleted=True`).

## Usage
- Called by the service layer (`backend/services/User.py`) to perform draft CRUD operations.
- Utilized by the public API endpoints.
