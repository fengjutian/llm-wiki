---
created_at: 2026-06-11 09:21
page_type: entity
sources:
- file: PROMOTION_BACKEND_LOGIC_DETAIL.md
  hash: ec6f66529438ef51e45d391c551d2567c639c49cc8d227500685141991e5bf3c
status: draft
summary: ''
title: ConditionFactory
updated_at: 2026-06-11 09:21
---

---
title: "ConditionFactory"
page_type: entity
status: active
summary: "Factory class in utils/service/promotion.py that creates a tree of ConditionEvaluator instances (GroupCondition or LeafCondition) from a JSON‑like condition tree."
sources:
  - file: "PROMOTION_BACKEND_LOGIC_DETAIL.md"
    sections: ["6.3 条件评估器工厂"]
confidence: high
---

# ConditionFactory

`ConditionFactory` is a Python class responsible for constructing the condition evaluation tree used in [[PromotionService]].get_matched_pid() to determine which cart items are eligible for a promotion. It resides in `utils/service/promotion.py`.

## Method

- `create(condition_tree: dict) -> ConditionEvaluator`
  - Recursively builds evaluators. If the node has `is_group` set, creates a [[GroupCondition]] with the specified `operator` (`AND` or `OR`) and recursively creates children. Otherwise, creates a [[LeafCondition]] using the node's `condition_type` and `condition_value`.

## See Also
- [[GroupCondition]]
- [[LeafCondition]]
- [[ConditionEvaluator]]
- [[EvaluationContext]]
