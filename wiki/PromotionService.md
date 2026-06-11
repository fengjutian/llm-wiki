---
created_at: 2026-06-11 08:58
page_type: entity
sources:
- file: 消费金额分层（sales_amount tier）功能详细分析.md
  hash: 53e0fa680bf2cea2b76a04cf21c41351d17feffb1d0e01b3e56cc877c620cbcb
status: draft
summary: ''
title: PromotionService
updated_at: 2026-06-11 09:01
---

---
title: "PromotionService"
page_type: entity
status: active
summary: "Backend service class responsible for creating promotions and calculating discounts, including tier‑based logic (sales_amount tier)."
sources:
  - file: "消费金额分层（sales_amount tier）功能详细分析.md"
    sections: ["后端处理逻辑"]
confidence: high
---

# PromotionService

`PromotionService` is a Python class that handles the business logic for promotions in the backend. It is invoked by API endpoints such as `POST /backend/promotion/add` and during order discount calculation.

## Key Methods

### `create()`

- Receives a [[PromotionRequest]] validated object.
- Validates that if `discount_type` is `'tier'`, a non‑empty `tier` array is provided.
- Creates a `promotion` record.
- Iterates over the `tier` list and creates corresponding [[PromotionTier]] records.

### `calculate_discount()`

- For `discount_type == 'tier'`:
  - Sums the total of all matched products (`product_total_price`).
  - Iterates over the promotion's tier rules to find the one whose `min_price <= total <= max_price` (or `max_price is None`).
  - Applies the discount according to `tier.discount_type`:
    - `percent`: percentage off the matched product's sub‑total.
    - `fixed`: flat amount, distributed proportionally among matched products.
    - `per_fixed`: fixed amount per item (times quantity).
- Adjusts the payment and saving amounts for each order item.

The discount application logic (from source):

> **Percent**:
> ```python
> main_product_price = product_price * quantity
> item_saving = Decimal(main_product_price * tier.discount_value / 100)
> payment -= min(item_saving, payment)
> ```
>
> **Fixed** (distributed proportionally):
> ```python
> saving = min(tier.discount_value, product_subtotal) * (main_product_price / product_subtotal)
> ```
>
> **Per_fixed**:
> ```python
> if item.is_bp:
>     saving = tier.discount_value
> else:
>     saving = tier.discount_value * quantity
> ```

## Related
- [[Sales Amount Tier]] – the feature that relies on this logic.
- [[PromotionRequest]] – Pydantic model for request validation.
- [[PromotionTier]] – tier rule storage.
