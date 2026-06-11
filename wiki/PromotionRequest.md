---
created_at: 2026-06-11 09:01
page_type: entity
sources:
- file: 消费金额分层（sales_amount tier）功能详细分析.md
  hash: 53e0fa680bf2cea2b76a04cf21c41351d17feffb1d0e01b3e56cc877c620cbcb
status: draft
summary: ''
title: PromotionRequest
updated_at: 2026-06-11 09:01
---

---
title: "PromotionRequest"
page_type: entity
status: active
summary: "The Pydantic model used in the backend to validate and parse promotion creation/update API requests, containing tier and condition data."
sources:
  - file: "消费金额分层（sales_amount tier）功能详细分析.md"
    sections: ["API 接口"]
confidence: medium
---

# PromotionRequest

`PromotionRequest` is a Pydantic model that defines the structure and validation rules for the JSON body of `POST /backend/promotion/add` and `PUT /backend/promotion/update`. It is used by [[PromotionService]].

## Fields (inferred from API example)

- `code` (str): unique promotion code
- `name` (str): display name
- `group` (str): promotion group
- `promotion_type` (str): `'promotion'`, `'referral_code'`, or `'coupon_code'`
- `discount_type` (str): `'percent'`, `'fixed'`, `'tier'`, `'per_fixed'`, or `'tier_qty'`
- `start_date` (date), `end_date` (date)
- `is_auto` (int): 0 or 1
- `quantity` (int): usage limit (0 for unlimited)
- `inactive` (int): 1 = active, 0 = inactive
- `ui_data` (JSON / dict): frontend configuration
- `condition` (dict): a nested condition structure with `operator`, `is_group`, `children`
- `tier` (list of `TierRequest`): only required when `discount_type` is `'tier'` or `'tier_qty'`

## Validation
- If `discount_type` is `'tier'` and `tier` is empty, `[[PromotionError]].TIER_CONFIG_ERROR` is raised.

## See Also
- [[PromotionService]]
- [[PromotionTier]]
