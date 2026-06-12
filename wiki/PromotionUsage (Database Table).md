---
created_at: 2026-06-11 09:23
page_type: entity
sources:
- file: PROMOTION_SYSTEM_TECHNICAL_SPEC.md
  hash: ea4a2957b396e3dc0ac9c5e597028c1e7e7b70124946d804cf62662ddb3b4a4a
status: draft
summary: ''
title: PromotionUsage (Database Table)
updated_at: 2026-06-11 09:23
---

---
title: "PromotionUsage (Database Table)"
page_type: entity
status: active
summary: "Database table recording each use of a promotion by a customer on an order, used for tracking and usage limits."
sources:
  - file: "PROMOTION_SYSTEM_TECHNICAL_SPEC.md"
    sections: ["2.1"]
confidence: high
---

# PromotionUsage (Database Table)

The `promotion_usage` table tracks when and how a promotion is applied to a customer’s order.

## Schema

| Column           | Type      | Description                                |
|------------------|-----------|--------------------------------------------|
| `id`             | int       | Primary key                                |
| `promotion_id`   | int       | Foreign key to `promotion.id`              |
| `customer_id`    | int       | Foreign key to the customer                |
| `order_id`       | int       | Foreign key to the order                   |
| `use_data`       | json      | Details of the usage (e.g., items, discount) |
| `created_at`     | datetime  | Timestamp of usage                         |

## Usage
- Inserted when a promotion is redeemed.
- Checked for quantity limits (e.g., promotion can only be used N times).
- Cleared when an order is deleted (via `PromotionUsageRepo.delete_from_order`).

## See Also
- [[Promotion (Database Table)]]
- [[PromotionService]]
- [[PromotionUsageRepo]]