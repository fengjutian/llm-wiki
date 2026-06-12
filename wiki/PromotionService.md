---
created_at: 2026-06-11 08:58
page_type: entity
sources:
- file: 消费金额分层（sales_amount tier）功能详细分析.md
  hash: 53e0fa680bf2cea2b76a04cf21c41351d17feffb1d0e01b3e56cc877c620cbcb
- file: PROMOTION_BACKEND_LOGIC_DETAIL.md
  hash: ec6f66529438ef51e45d391c551d2567c639c49cc8d227500685141991e5bf3c
status: draft
summary: ''
title: PromotionService
updated_at: 2026-06-11 09:21
---

---
title: "PromotionService"
page_type: entity
status: active
summary: "Backend service class managing promotion creation and discount calculation. Handles entry routing (referral, coupon, manual), condition matching, tier (sales amount) and flat discounts."
sources:
  - file: "消费金额分层（sales_amount tier）功能详细分析.md"
    sections: ["后端处理逻辑"]
  - file: "PROMOTION_BACKEND_LOGIC_DETAIL.md"
    sections: ["2. 入口流程", "3. 促销匹配判断", "4. 折扣计算核心逻辑", "5. 四种折扣类型详细流程", "6. 促销条件评估"]
confidence: high
---

# PromotionService

`PromotionService` is the central business‑logic class for promotions in the backend. It is invoked by API endpoints and during order discount preview/placement. It resides in `services/Promotion.py`.

## Key Methods

### `usePromotion()`
Entry point for applying promotions to an order preview. Based on the [[OrderPreview]] input, it routes to one of:
1. `use_referral_code()` if `referral_code` is provided.
2. `use_coupon_code()` if `coupon_id` is provided.
3. `use_code()` if `promotion_code` is provided.
4. Otherwise, no discount is applied.

Each path updates the `saving` and `payment` totals and returns a discount list.

### `use_code()`
Manually validates and applies a promotion code.
- **Pre‑checks**: code not empty, promotion record exists, dates valid.
- **Data prep**: loads promotion, builds condition tree via `build_condition_json()`, obtains customer context (via `getContext()` and `productMappingByService`).
- **Discount calculation**: calls `calculate_discount()` with the prepared data.

### `get_matched_pid()`
Determines which items in the cart qualify for a promotion.
- Iterates over items, determines `is_new_service_customer` and `category_id`.
- Builds an [[EvaluationContext]] per item.
- Uses [[ConditionFactory]] to create a condition evaluator from `promotion['condition']` tree.
- Calls `evaluator.evaluate(context)` and collects indices where it returns `True`.
- Returns list of matching indices (`matched_pid`).

### `calculate_discount()`
Main discount application method.
- Calls `get_matched_pid()` to obtain eligible items.
- If no matches, skips discounting.
- If `discount_type == 'tier'`:
  - Computes total of matched items.
  - Finds the tier whose `min_price <= total <= max_price` (or `max_price is None`).
  - Applies the tier’s `discount_type` (`percent`, `fixed`, `per_fixed`) to the matched items.
- Otherwise (non‑tier):
  - Computes product subtotal for proportional distribution.
  - Iterates matched items and branches by `discount_type`:
    - **`percent`**: discount = price × discount_value / 100 × quantity (limited by `quantity` if set).
    - **`fixed`**: flat discount distributed proportionally across matched items.
    - **`per_fixed`**: per‑item fixed discount; for `is_bp` products only a single deduction is applied.
    - **Unsupported type**: raises `PromotionError.PROMOTION_UNSUPPORTED_DISCOUNT_TYPE`.
- After applying discounts, ensures `saving` does not exceed `payment` (cap).
- Recursively handles items with `addon_list`.
- Returns the modified items list and the applied `promotion_id`.

### `build_condition_json()`
Transforms the flat rows of `PromotionCondition` into a nested tree structure used by `get_matched_pid`. The tree contains `operator`, `is_group`, and `children` nodes.

### `create()` (as previously documented)
- Accepts a [[PromotionRequest]] and validates tier data.
- Creates the promotion record and related [[PromotionTier]] entries.

## See Also
- [[ConditionFactory]]
- [[EvaluationContext]]
- [[DiscountType]]
- [[PromotionTier]]
- [[PromotionRequest]]
- [[Sales Amount Tier]]
