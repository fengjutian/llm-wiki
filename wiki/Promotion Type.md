---
created_at: 2026-06-11 09:23
page_type: concept
sources:
- file: PROMOTION_SYSTEM_TECHNICAL_SPEC.md
  hash: ea4a2957b396e3dc0ac9c5e597028c1e7e7b70124946d804cf62662ddb3b4a4a
status: draft
summary: ''
title: Promotion Type
updated_at: 2026-06-11 09:23
---

---
title: "Promotion Type"
page_type: concept
status: active
summary: "The three categories of promotional entities stored in the unified promotion table: promotion, referral_code, coupon_code."
sources:
  - file: "PROMOTION_SYSTEM_TECHNICAL_SPEC.md"
    sections: ["1.2"]
confidence: high
---

# Promotion Type

Identified by the `promotion_type` field in the [[Promotion (Database Table) | Promotion]] table, the three types are:

| Value         | Description                              |
|---------------|------------------------------------------|
| `promotion`   | Standard marketing promotion             |
| `referral_code` | Code used for customer referral rewards |
| `coupon_code` | Discount coupon issued to users          |

The frontend displays these options via `promotiontypeOps` in `Form.vue` and the backend’s `Promotion` model uses the same string values.

## See Also
- [[Promotion (Database Table)]]
- [[PromotionRequest]]
- [[Promotion Form Component (Form.vue)]]