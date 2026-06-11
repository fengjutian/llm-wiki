---
created_at: 2026-06-11 09:09
page_type: concept
sources:
- file: 2025-05-20_1430_register_form_draft.md
  hash: 1108e878826e83e5dc13720aa9315d860f6ec0d4db3810d7a10bbcf82cf58630
status: draft
summary: ''
title: Frequency Limiting (60s per email)
updated_at: 2026-06-11 09:09
---

---
title: "Frequency Limiting (60s per email)"
page_type: concept
status: active
summary: "Rate limiting strategy: one draft save per email per 60 seconds, enforced with a row lock (with_for_update())."
sources:
  - file: "2025-05-20_1430_register_form_draft.md"
    sections: ["核心决策", "核心功能", "安全措施"]
confidence: high
---

# Frequency Limiting (60s per email)

To prevent abuse and reduce database load, the draft save endpoint enforces a **60‑second cooldown** per email address.

## Implementation
- On each save request, the current timestamp is compared with the draft's `updated_at`.
- If less than 60 seconds have passed, the request is rejected.
- Uses `with_for_update()` row lock to avoid race conditions.

## Rationale
- Draft changes are infrequent; a 60‑second window strikes a balance between user experience and protection.
- Prevents malicious rapid‑fire requests.

## Related
- Part of [[Register Form Draft API Endpoints]] (POST).
- Applied in [[Register Form Draft Service]].
