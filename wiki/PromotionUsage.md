---
created_at: 2026-06-11 09:01
page_type: entity
sources:
- file: 消费金额分层（sales_amount tier）功能详细分析.md
  hash: 53e0fa680bf2cea2b76a04cf21c41351d17feffb1d0e01b3e56cc877c620cbcb
status: draft
summary: ''
title: PromotionUsage
updated_at: 2026-06-11 09:01
---

---
title: "PromotionUsage"
page_type: entity
status: active
summary: "Database table logging each use of a promotion by a customer on an order, with optional use_data JSON."
sources:
  - file: "消费金额分层（sales_amount tier）功能详细分析.md"
    sections: ["数据库表结构"]
confidence: high
---

# PromotionUsage

The `promotion_usage` table records every instance a promotion is applied to an order.

## Schema
```sql
CREATE TABLE promotion_usage (
    id INT PRIMARY KEY AUTO_INCREMENT,
    promotion_id INT,
    customer_id INT,
    order_id INT,
    use_data JSON,
    created_at DATETIME
);
```

## Purpose
- Tracks usage count for promotions with a `quantity` limit.
- Stores metadata (`use_data`) about the specific application (e.g., tier matched, discount applied).

## See Also
- [[Promotion]]
