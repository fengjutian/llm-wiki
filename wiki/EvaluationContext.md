---
created_at: 2026-06-11 09:21
page_type: entity
sources:
- file: PROMOTION_BACKEND_LOGIC_DETAIL.md
  hash: ec6f66529438ef51e45d391c551d2567c639c49cc8d227500685141991e5bf3c
status: draft
summary: ''
title: EvaluationContext
updated_at: 2026-06-11 09:21
---

---
title: "EvaluationContext"
page_type: entity
status: active
summary: "Immutable (or data‑transfer) object that holds all customer and product attributes needed for condition evaluation."
sources:
  - file: "PROMOTION_BACKEND_LOGIC_DETAIL.md"
    sections: ["3. 促销匹配判断"]
confidence: high
---

# EvaluationContext

`EvaluationContext` is a data object constructed for each cart item during `get_matched_pid`. It contains:

- `customer_id`: the customer’s ID.
- `new_reg_customer`: whether the customer is a new registrant.
- `new_service_line_customer`: whether the customer is new to this service line (product category group).
- `new_product_customer`: whether the customer is new to this specific product.
- `product_id`: the current product ID.
- `category_id`: the product’s category ID.
- `region`, `country`, `state`, `city`: location information.
- `billgroup`: billing group.

The object is created from a `context_dict` and passed to the evaluator tree.

## See Also
- [[ConditionEvaluator]]
- [[ConditionFactory]]
- [[PromotionService]]
