---
created_at: 2026-06-11 09:21
page_type: entity
sources:
- file: PROMOTION_BACKEND_LOGIC_DETAIL.md
  hash: ec6f66529438ef51e45d391c551d2567c639c49cc8d227500685141991e5bf3c
status: draft
summary: ''
title: ConditionEvaluator
updated_at: 2026-06-11 09:21
---

---
title: "ConditionEvaluator"
page_type: entity
status: active
summary: "Abstract base class (or interface) for condition evaluators in the promotion system."
sources:
  - file: "PROMOTION_BACKEND_LOGIC_DETAIL.md"
    sections: ["6.3 条件评估器工厂"]
confidence: high
---

# ConditionEvaluator

`ConditionEvaluator` is the base type for all condition evaluators in the promotion system. It defines an interface with an `evaluate(context: EvaluationContext) -> bool` method.

## Subclasses
- [[GroupCondition]] – evaluates a group of conditions joined by AND/OR.
- [[LeafCondition]] – evaluates a single atomic condition.

## Usage
Instantiated by [[ConditionFactory]] and called by `get_matched_pid` during item filtering.

## See Also
- [[ConditionFactory]]
- [[EvaluationContext]]
