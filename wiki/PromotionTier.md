---
created_at: 2026-06-11 08:58
page_type: entity
sources:
- file: 消费金额分层（sales_amount tier）功能详细分析.md
  hash: 53e0fa680bf2cea2b76a04cf21c41351d17feffb1d0e01b3e56cc877c620cbcb
status: draft
summary: ''
title: PromotionTier
updated_at: 2026-06-11 08:58
---

---
title: "PromotionTier"
page_type: entity
status: active
summary: "Database table storing tiered discount rules for promotions, supporting both sales_amount and tier_qty tier types."
sources:
  - file: "消费金额分层（sales_amount tier）功能详细分析.md"
    hash: ""
    sections: ["数据库表结构"]
confidence: high
---

# PromotionTier

The `promotion_tier` table holds the tier configuration for promotions with `discount_type` of `'tier'` or `'tier_qty'`.

## Schema

```sql
CREATE TABLE promotion_tier (
    id INT PRIMARY KEY AUTO_INCREMENT,
    promotion_id INT,
    min_price DECIMAL(8,2),
    max_price DECIMAL(8,2),
    min_quantity INT,
    max_quantity INT,
    discount_type VARCHAR(20),
    discount_value DECIMAL(8,2)
);
```

## Fields

| Field | Usage |
|-------|-------|
| `promotion_id` | Foreign key to the `promotion` table. |
| `min_price` | Lower bound for cumulative spending (inclusive). Used only when `tier_type = 'sales_amount'`. |
| `max_price` | Upper bound (inclusive). `NULL` means no upper limit. |
| `min_quantity` | Lower bound for order quantity. Used only when `tier_type = 'tier_qty'`. |
| `max_quantity` | Upper quantity bound; `NULL` means unlimited. |
| `discount_type` | One of `'percent'`, `'fixed'`, or `'per_fixed'`. |
| `discount_value` | Numeric value of the discount. |

## Relationship to Tiers

- For [[Sales Amount Tier]], the `min_price`/`max_price` columns define the spending range that triggers the discount.
- For [[tier_qty Tier]], the `min_quantity`/`max_quantity` columns are used instead.

## Backend Usage

- [[PromotionService]] queries this table during discount calculation to find the matching tier rule.

## Related
- [[Promotion Form Component (Form.vue)]]