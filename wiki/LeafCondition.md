---
created_at: 2026-06-11 09:21
page_type: entity
sources:
- file: PROMOTION_BACKEND_LOGIC_DETAIL.md
  hash: ec6f66529438ef51e45d391c551d2567c639c49cc8d227500685141991e5bf3c
status: draft
summary: ''
title: LeafCondition
updated_at: 2026-06-11 09:21
---

---
title: "LeafCondition"
page_type: entity
status: active
summary: "Concrete evaluator that checks a single condition against an EvaluationContext, e.g., category_id membership."
sources:
  - file: "PROMOTION_BACKEND_LOGIC_DETAIL.md"
    sections: ["6.3 条件评估器工厂"]
confidence: high
---

# LeafCondition

A `LeafCondition` represents a single atomic condition in the promotion rule tree. It holds:
- `condition_type`: a string like `'category_id'`, `'new_reg_customer'`, `'region_id'`, etc.
- `condition_value`: the expected value/list to match.

## evaluate(context)
- Checks whether the context’s attribute corresponding to `condition_type` satisfies the condition. For example, for `'category_id'`, it checks if `context.category_id` is in `condition_value`.
- Returns `True` or `False`.

## See Also
- [[GroupCondition]]
- [[EvaluationContext]]
- [[ConditionFactory]]
