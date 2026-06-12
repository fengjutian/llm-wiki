---
created_at: 2026-06-11 09:23
page_type: entity
sources:
- file: PROMOTION_SYSTEM_TECHNICAL_SPEC.md
  hash: ea4a2957b396e3dc0ac9c5e597028c1e7e7b70124946d804cf62662ddb3b4a4a
status: draft
summary: ''
title: PromotionCondition (Database Table)
updated_at: 2026-06-11 09:23
---

---
title: "PromotionCondition (Database Table)"
page_type: entity
status: active
summary: "Database table that stores individual condition rules for a promotion, linked via promotion_id and organized in a tree structure with AND/OR grouping."
sources:
  - file: "PROMOTION_SYSTEM_TECHNICAL_SPEC.md"
    sections: ["2.1"]
confidence: high
---

# PromotionCondition (Database Table)

The `promotion_condition` table stores the rule tree that determines which items are eligible for a promotion. It supports hierarchical conditions with AND/OR logic.

## Schema

| Column           | Type         | Description                        |
|------------------|--------------|------------------------------------|
| `id`             | int          | Primary key                        |
| `promotion_id`   | int          | Foreign key to `promotion.id`      |
| `parent_id`      | int          | Parent node ID (null for root)     |
| `condition_type` | varchar(50)  | Type of condition (e.g., `category_id`, `customer_id`) |
| `condition_value`| json         | Value(s) to match against          |
| `operator`       | varchar(10)  | Logical operator for groups: `AND` or `OR` |
| `is_group`       | tinyint(1)   | 1 if this row represents a condition group, 0 for leaf |

## Condition Types
See the source for a list of supported types (e.g., `category_id`, `customer_id`, `region_id`, `new_reg_customer`, etc.).

## Usage
- Retrieved and assembled into a tree by [[ConditionFactory]] during discount calculation.
- Managed through the [[PromotionRequest]] model, which uses the [[ConditionLeaf]] recursive schema.

## See Also
- [[Promotion (Database Table)]]
- [[ConditionLeaf (Request Model)]]
- [[ConditionFactory]]