---
created_at: 2026-06-11 09:23
page_type: entity
sources:
- file: PROMOTION_SYSTEM_TECHNICAL_SPEC.md
  hash: ea4a2957b396e3dc0ac9c5e597028c1e7e7b70124946d804cf62662ddb3b4a4a
status: draft
summary: ''
title: PromotionTier (Database Table)
updated_at: 2026-06-11 09:23
---

---
title: "PromotionTier (Database Table)"
page_type: entity
status: active
summary: "Database table storing tiered discount rules for a promotion, with price range and discount parameters."
sources:
  - file: "PROMOTION_SYSTEM_TECHNICAL_SPEC.md"
    sections: ["2.1"]
confidence: high
---

# PromotionTier (Database Table)

The `promotion_tier` table defines the tiers used when a promotion’s `discount_type` is `tier`. Each row specifies a price range and the corresponding discount.

## Schema

| Column           | Type         | Description                                     |
|------------------|--------------|-------------------------------------------------|
| `id`             | int          | Primary key                                     |
| `promotion_id`   | int          | Foreign key to `promotion.id`                   |
| `min_price`      | decimal(8,2) | Lower bound of spending amount (inclusive)      |
| `max_price`      | decimal(8,2) | Upper bound (null for no upper limit)           |
| `discount_type`  | varchar(20)  | Discount type for this tier (`percent`, `fixed`, `per_fixed`) |
| `discount_value` | decimal(8,2) | Discount amount/value                            |

## Usage
- Used when `promotion.discount_type == 'tier'`.
- During discount calculation, the order’s subtotal determines which tier is applied.
- Managed via [[PromotionRequest]] and [[PromotionTierRepo]].

## See Also
- [[Promotion (Database Table)]]
- [[DiscountType]]
- [[PromotionTierRepo]]