---
created_at: 2026-06-11 09:09
page_type: concept
sources:
- file: 2025-05-20_1430_register_form_draft.md
  hash: 1108e878826e83e5dc13720aa9315d860f6ec0d4db3810d7a10bbcf82cf58630
status: draft
summary: ''
title: Register Form Draft Service
updated_at: 2026-06-11 09:09
---

---
title: "Register Form Draft Service"
page_type: concept
status: active
summary: "Business logic for draft CRUD, including rate limiting and state determination, implemented in backend/services/User.py."
sources:
  - file: "2025-05-20_1430_register_form_draft.md"
    sections: ["核心功能", "安全措施"]
confidence: high
---

# Register Form Draft Service

Located in `backend/services/User.py`, this layer contains the business logic for managing registration form drafts.

## Functions
- **Save draft**: Validates input, applies [[Frequency Limiting (60s per email)]], performs upsert via [[RegisterFormDraftRepo]].
- **Get draft**: Returns draft data along with the user’s registration state ([[State Branch Logic in Register Form Draft]]).
- **Delete draft**: Soft‑deletes the draft.

## Integration
- Enforces the [[Field Whitelist]] by stripping sensitive fields before storage.
- Communicates with `verify_email` and `user` tables to determine the `step_hint`.
