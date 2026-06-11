---
created_at: 2026-06-11 09:01
page_type: entity
sources:
- file: 消费金额分层（sales_amount tier）功能详细分析.md
  hash: 53e0fa680bf2cea2b76a04cf21c41351d17feffb1d0e01b3e56cc877c620cbcb
status: draft
summary: ''
title: TransformTierForSubmit
updated_at: 2026-06-11 09:01
---

---
title: "TransformTierForSubmit"
page_type: entity
status: active
summary: "A frontend function that converts the UI tier data (with price, infinity, discount_value1/2/3) into the API format (min_price, max_price, discount_type, discount_value) before submission."
sources:
  - file: "消费金额分层（sales_amount tier）功能详细分析.md"
    sections: ["提交前转换"]
confidence: high
---

# TransformTierForSubmit

`TransformTierForSubmit` is a function defined in `Form.vue` (within the Promotion Form component) that prepares tier data for the API `POST /backend/promotion/add` or `PUT /backend/promotion/update`.

## Input
An array of tier objects from the form state, each containing:
- `price` – the threshold amount
- `infinity` – boolean indicating the "exceeding" (open-ended) tier
- `is_select` – whether the infinity tier is selected
- `discount_value1`, `discount_value2`, `discount_value3` – the three possible discount values

## Output
An array of tier objects for the API, each with:
- `min_price` – lower bound (inclusive); 0 for the first tier, or the previous tier's `max_price`
- `max_price` – upper bound (inclusive); `null` for the infinity tier
- `discount_type` – `'percent'`, `'fixed'`, or `'per_fixed'` based on which discount value was provided
- `discount_value` – the numeric value of the discount

## Algorithm
1. Separate the infinity item from normal items.
2. Sort normal items by `price` ascending.
3. For each normal item, set `min_price` to 0 if first, else the previous item's `price`; set `max_price` to current `price`.
4. Determine `discount_type` and `discount_value` by checking which discount field is filled (priority: percent, then fixed, then per_fixed).
5. If an infinity item exists, add it with `min_price` = its `price`, `max_price: null`, and the same discount mapping.

## Usage
Called inside `submitForm()` of the Promotion Form component before sending the API request.

## See Also
- [[Sales Amount Tier]] – the feature that uses this transformation.
- [[Promotion Form Component (Form.vue)]] – the component where it is implemented.
- [[transform-tier-data]] – the inverse transformation for data loading.
