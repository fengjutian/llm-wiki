---
created_at: 2026-06-11 09:09
page_type: concept
sources:
- file: 2025-05-20_1430_register_form_draft.md
  hash: 1108e878826e83e5dc13720aa9315d860f6ec0d4db3810d7a10bbcf82cf58630
status: draft
summary: ''
title: user Table (Registration Context)
updated_at: 2026-06-11 09:09
---

---
title: "user Table (Registration Context)"
page_type: entity
status: active
summary: "The user table queried to determine if the email is fully registered, used in registration draft state branching."
sources:
  - file: "2025-05-20_1430_register_form_draft.md"
    sections: ["核心功能"]
confidence: high
---

# user Table (Registration Context)

In the registration draft feature, the `user` table is consulted to check if a record exists for the given email. If present, the user is considered **registered** and the `step_hint` becomes `完成注册`.

## Role
- Part of the [[State Branch Logic in Register Form Draft]].
- Prevents duplicate registration flows.
