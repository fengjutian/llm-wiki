---
created_at: 2026-06-11 09:09
page_type: concept
sources:
- file: 2025-05-20_1430_register_form_draft.md
  hash: 1108e878826e83e5dc13720aa9315d860f6ec0d4db3810d7a10bbcf82cf58630
status: draft
summary: ''
title: verify_email Table
updated_at: 2026-06-11 09:09
---

---
title: "verify_email Table"
page_type: entity
status: active
summary: "Database table used to track email verification status; queried in registration draft state logic."
sources:
  - file: "2025-05-20_1430_register_form_draft.md"
    sections: ["核心功能"]
confidence: high
---

# verify_email Table

The `verify_email` table stores information about email verification attempts, including whether the email has been verified (`is_verified`). It is used by the [[State Branch Logic in Register Form Draft]] to determine the `verified` or `pending_verification` states.

## Role
- When retrieving a draft, the backend checks this table to see if the email is verified and whether it has an active verification code.
