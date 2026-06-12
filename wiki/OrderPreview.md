---
created_at: 2026-06-11 09:21
page_type: entity
sources:
- file: PROMOTION_BACKEND_LOGIC_DETAIL.md
  hash: ec6f66529438ef51e45d391c551d2567c639c49cc8d227500685141991e5bf3c
status: draft
summary: ''
title: OrderPreview
updated_at: 2026-06-11 09:21
---

---
title: "OrderPreview"
page_type: entity
status: active
summary: "A Pydantic model or request object that carries the customer’s chosen promotion identifiers (referral_code, coupon_id, promotion_code) for order preview."
sources:
  - file: "PROMOTION_BACKEND_LOGIC_DETAIL.md"
    sections: ["2.2 入口选择逻辑"]
confidence: medium
---

# OrderPreview

`OrderPreview` is a data structure (likely a Pydantic model) used by `PromotionService.usePromotion()` to decide which promotion application path to take. It contains at least:

- `referral_code` (optional string)
- `coupon_id` (optional int)
- `promotion_code` (optional string)

## Usage
Passed to `usePromotion` to determine whether to apply a referral code, a coupon, or a manual promotion code.

## See Also
- [[PromotionService]]
