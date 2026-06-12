---
created_at: 2026-06-11 09:23
page_type: entity
sources:
- file: PROMOTION_SYSTEM_TECHNICAL_SPEC.md
  hash: ea4a2957b396e3dc0ac9c5e597028c1e7e7b70124946d804cf62662ddb3b4a4a
status: draft
summary: ''
title: PromotionService (Backend Service)
updated_at: 2026-06-11 09:23
---

---
title: "PromotionService (Backend Service)"
page_type: entity
status: active
summary: "Service class in qb2025_backend/backend/services/Promotion.py handling all promotion business logic: CRUD, activation, discount calculation, condition matching, and CSV export."
sources:
  - file: "PROMOTION_SYSTEM_TECHNICAL_SPEC.md"
    sections: ["5.1", "5.2", "5.3"]
confidence: high
---

# PromotionService

`PromotionService` is the main service class for the promotion module. It coordinates repositories, condition evaluation, and discount application.

## Methods

### Basic CRUD
- `paginate(query)`: Return a paginated list of promotions.
- `create(query: PromotionRequest)`: Create a new promotion, including conditions and tiers.
- `update(query: PromotionRequest)`: Update an existing promotion.
- `delete(id)`: Delete a promotion (if not used).
- `view(promotion_id)`: Get full details of a promotion.

### Activation
- `set_inactive(promotion_id, inactive)`: Toggle the `inactive` flag.

### Discount Application
- `get_promotion(...)`: Find automatically applied promotions.
- `get_coupon(...)`: Find available coupons.
- `use_code(...)`, `use_referral_code(...)`, `use_coupon_code(...)`: Apply a specific promotion code to an order.
- `calculate_discount(items, promotion, ...)`: Main discount calculation logic, dispatching by `discount_type`.
- `get_matched_pid(items, promotion, ...)`: Determine which cart items are eligible for a promotion using [[ConditionFactory]].

### Export
- `export_download(...)`: Generate a streaming CSV export.

## Discount Calculation Details
- **percent**: `item_price * discount_value / 100 * quantity`, respect `quantity` limit if finite.
- **fixed**: `min(discount_value, subtotal)`, distributed proportionally to item prices.
- **per_fixed**: `discount_value * quantity`; for `is_bp` products only counts once.
- **tier**: Match the subtotal to a tier in `promotion_tier` and apply its discount.

## See Also
- [[Promotion (Database Table)]]
- [[ConditionFactory]]
- [[PromotionRequest]]
- [[PromotionRepo]]