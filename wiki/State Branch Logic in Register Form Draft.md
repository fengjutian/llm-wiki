---
created_at: 2026-06-11 09:09
page_type: concept
sources:
- file: 2025-05-20_1430_register_form_draft.md
  hash: 1108e878826e83e5dc13720aa9315d860f6ec0d4db3810d7a10bbcf82cf58630
status: draft
summary: ''
title: State Branch Logic in Register Form Draft
updated_at: 2026-06-11 09:09
---

---
title: "State Branch Logic in Register Form Draft"
page_type: concept
status: active
summary: "Logic that determines the registration step hint based on the existence of records in verify_email and user tables."
sources:
  - file: "2025-05-20_1430_register_form_draft.md"
    sections: ["核心功能"]
confidence: high
---

# State Branch Logic in Register Form Draft

When retrieving a draft, the backend determines the user's current registration stage and returns a `step_hint`.

## Decision Table

| state            | condition                        | step_hint   |
|------------------|----------------------------------|-------------|
| registered       | user table has record            | 完成注册     |
| verified         | is_verified=True, no user record  | step_2      |
| pending_verification | email exists, not verified    | verify_email|
| new              | no record in either table        | step_1      |

## Usage
- Frontend can use `step_hint` to automatically redirect the user to the appropriate registration step.
- Avoids issues like “passwordless verification” by keeping the user on Step 1 after draft recovery.
