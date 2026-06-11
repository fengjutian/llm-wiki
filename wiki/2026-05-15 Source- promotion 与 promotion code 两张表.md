---
created_at: 2026-06-11 09:17
page_type: source_summary
sources:
- file: promotion 与 promotion code 两张表.md
  hash: 00a9bbc851c75142922ff770ca222dbbf57c01a69407fad0c4284240086cfca1
status: draft
summary: ''
title: '2026-05-15 Source: promotion 与 promotion code 两张表'
updated_at: 2026-06-11 09:17
---

---
title: "2026-05-15 Source: promotion 与 promotion code 两张表"
page_type: source_summary
status: active
summary: "Clarification document describing that promotion_code is not a separate table but a field in the Order table referencing the unified Promotion table."
sources:
  - file: "promotion 与 promotion code 两张表.md"
    sections: ["全部"]
confidence: high
---

# 2026-05-15 Source: promotion 与 promotion code 两张表

This source clarifies a common misconception: promotion and promotion code are not two separate tables. Instead, there is a unified **Promotion** table and the **Order** table's `promotion_code` field that references it.

## Key Claims
- The Promotion table has a `promotion_type` field distinguishing three types: `promotion`, `referral_code`, `coupon_code`.
- The Order table contains a `promotion_code` field that holds a code matching the Promotion table's `code` field.
- Frontend Form.vue uses `promotiontypeOps` (three options) and backend Promotion model uses `promotion_type`.
- This relationship is analogous to a foreign-key reference, though not explicitly stated as a formal foreign key.

## Relationships
- Describes [[Promotion (Database Table)]], [[Order (Database Table)]], and the `promotion_code` field.
