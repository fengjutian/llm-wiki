---
created_at: 2026-06-11 09:09
page_type: concept
sources:
- file: 2025-05-20_1430_register_form_draft.md
  hash: 1108e878826e83e5dc13720aa9315d860f6ec0d4db3810d7a10bbcf82cf58630
status: draft
summary: ''
title: Field Whitelist
updated_at: 2026-06-11 09:09
---

---
title: "Field Whitelist"
page_type: concept
status: active
summary: "Server-side filtering via Pydantic schema that excludes sensitive fields (password, password2, code) before persisting the draft."
sources:
  - file: "2025-05-20_1430_register_form_draft.md"
    sections: ["安全措施"]
confidence: high
---

# Field Whitelist

When saving a registration draft, a Pydantic schema is used to selectively filter out sensitive fields, ensuring they are never stored in `draft_data`.

## Excluded Fields
- `password`
- `password2`
- `code` (verification code)

## Implementation
- The schema defines only the allowed fields using Pydantic's `BaseModel` and applies it during request parsing in the service layer.
- This prevents accidental exposure of secrets in the database.

## Related
- Applied in [[Register Form Draft Service]] and enforced by the API endpoints.
