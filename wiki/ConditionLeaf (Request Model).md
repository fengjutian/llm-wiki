---
created_at: 2026-06-11 09:23
page_type: entity
sources:
- file: PROMOTION_SYSTEM_TECHNICAL_SPEC.md
  hash: ea4a2957b396e3dc0ac9c5e597028c1e7e7b70124946d804cf62662ddb3b4a4a
status: draft
summary: ''
title: ConditionLeaf (Request Model)
updated_at: 2026-06-11 09:23
---

---
title: "ConditionLeaf (Request Model)"
page_type: entity
status: active
summary: "Strict Pydantic model for the condition tree node in the promotion request schema; recursive with operators, children, condition type, and value."
sources:
  - file: "PROMOTION_SYSTEM_TECHNICAL_SPEC.md"
    sections: ["7.2"]
confidence: high
---

# ConditionLeaf (Request Model)

Used inside [[PromotionRequest]] to represent the condition tree for a promotion. It is defined in `qb2025_backend/backend/schemas/promotion.py`.

```python
class ConditionLeaf(StrictModel):
    operator: Optional[str] = None          # 'AND' or 'OR'
    children: Optional[List['ConditionLeaf']] = None
    condition_type: Optional[str] = None    # e.g. 'category_id', 'customer_id'
    condition_value: Optional[Any] = None
    is_group: Optional[int] = 0             # 1 = group, 0 = leaf
```

## Distinction
This is the **input validation model** used in the API layer. It is distinct from the internal evaluator classes ([[LeafCondition]], [[GroupCondition]]) created by [[ConditionFactory]] for runtime discount evaluation.

## See Also
- [[PromotionRequest]]
- [[ConditionFactory]]
- [[PromotionCondition (Database Table)]]