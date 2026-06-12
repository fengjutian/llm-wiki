---
created_at: 2026-06-11 09:21
page_type: entity
sources:
- file: PROMOTION_BACKEND_LOGIC_DETAIL.md
  hash: ec6f66529438ef51e45d391c551d2567c639c49cc8d227500685141991e5bf3c
status: draft
summary: ''
title: GroupCondition
updated_at: 2026-06-11 09:21
---

---
title: "GroupCondition"
page_type: entity
status: active
summary: "Evaluator that combines multiple child conditions with AND or OR logic."
sources:
  - file: "PROMOTION_BACKEND_LOGIC_DETAIL.md"
    sections: ["6.3 条件评估器工厂"]
confidence: high
---

# GroupCondition

A `GroupCondition` represents a logical group of sub‑conditions. It holds:
- `operator`: `'AND'` or `'OR'`.
- `children`: a list of [[ConditionEvaluator]] instances (other groups or leaves).

## evaluate(context)
- Recursively evaluates all children and applies the operator:
  - AND → `all()` children evaluate to `True`.
  - OR → `any()` child evaluates to `True`.

## See Also
- [[LeafCondition]]
- [[ConditionFactory]]
