---
created_at: 2026-06-11 09:09
page_type: concept
sources:
- file: 2025-05-20_1430_register_form_draft.md
  hash: 1108e878826e83e5dc13720aa9315d860f6ec0d4db3810d7a10bbcf82cf58630
status: draft
summary: ''
title: Register Form Draft API Endpoints
updated_at: 2026-06-11 09:09
---

---
title: "Register Form Draft API Endpoints"
page_type: entity
status: active
summary: "Three public API endpoints for registration form drafts: POST save, GET retrieve, DELETE soft-delete."
sources:
  - file: "2025-05-20_1430_register_form_draft.md"
    sections: ["核心功能", "安全措施"]
confidence: high
---

# Register Form Draft API Endpoints

All endpoints are prefixed with `/api/v1/public/register_form_draft`.

- **POST** `/` – Save draft. Requires JSON body with form data. Applies [[Frequency Limiting (60s per email)]] and [[Field Whitelist]].
- **GET** `/` – Retrieve draft. Returns saved data and registration state ([[State Branch Logic in Register Form Draft]]).
- **DELETE** `/` – Soft‑delete draft (sets `is_deleted=True`).

## Implementation
Routes are defined in `routers/v1/public/public.py`. They rely on [[Register Form Draft Service]] for business logic and [[RegisterFormDraftRepo]] for persistence.
