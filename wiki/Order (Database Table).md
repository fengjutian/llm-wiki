---
created_at: 2026-06-11 09:17
page_type: entity
sources:
- file: promotion 与 promotion code 两张表.md
  hash: 00a9bbc851c75142922ff770ca222dbbf57c01a69407fad0c4284240086cfca1
status: draft
summary: ''
title: Order (Database Table)
updated_at: 2026-06-11 09:17
---

---
title: "Order (Database Table)"
page_type: entity
status: active
summary: "The database table representing customer orders; it contains a promotion_code field that references the Promotion table's code field."
sources:
  - file: "promotion 与 promotion code 两张表.md"
    sections: ["全部"]
confidence: high
---

# Order (Database Table)

The **Order** table stores order records. While its full schema is not detailed in this source, it includes a key field:

- `promotion_code` (string): holds a value that matches the `code` column of a [[Promotion (Database Table)]] row. This is how the order records which promotion was applied.

## Relationship to Promotion
The `promotion_code` field acts as a foreign key (conceptual) to the Promotion table. No explicit database constraint is mentioned.

## Related
- [[Promotion (Database Table)]]
- [[PromotionUsage]]
