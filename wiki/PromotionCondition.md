---
created_at: 2026-06-11 09:01
page_type: entity
sources:
- file: 消费金额分层（sales_amount tier）功能详细分析.md
  hash: 53e0fa680bf2cea2b76a04cf21c41351d17feffb1d0e01b3e56cc877c620cbcb
status: draft
summary: ''
title: PromotionCondition
updated_at: 2026-06-11 09:01
---

---
title: "PromotionCondition"
page_type: entity
status: active
summary: "Database table storing the conditions under which a promotion applies, such as customer, category, or region IDs, with AND/OR logic."
sources:
  - file: "消费金额分层（sales_amount tier）功能详细分析.md"
    sections: ["数据库表结构"]
confidence: high
---

# PromotionCondition

The `promotion_condition` table stores the filtering conditions that determine which orders are eligible for a given promotion. It is stored alongside the promotion record and the tier rules.

## Schema
```sql
CREATE TABLE promotion_condition (
    id INT PRIMARY KEY AUTO_INCREMENT,
    promotion_id INT,
    parent_id INT DEFAULT 0,
    condition_type VARCHAR(50),   -- 'customer_id', 'category_id', 'region_id', etc.
    condition_value JSON,
    operator VARCHAR(10),         -- 'AND' or 'OR'
    is_group INT DEFAULT 0        -- 1 if this node is a logical group
);
```

## Usage
- Conditions are nested in a tree structure (`parent_id`) to support complex boolean logic.
- The API request body includes a `condition` object that mirrors this structure.
- Backend filters in [[Promotion List Endpoint]] and [[Promotion Export Endpoint]] use subqueries against this table (e.g., `service` filter checks `category_id`).

## Related
- [[PromotionService]] – creates conditions when a promotion is added.
- [[Promotion Request]] – the API model that accepts condition data.
- [[Promotion List Endpoint]]
