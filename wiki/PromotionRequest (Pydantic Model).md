---
created_at: 2026-06-11 09:23
page_type: entity
sources:
- file: PROMOTION_SYSTEM_TECHNICAL_SPEC.md
  hash: ea4a2957b396e3dc0ac9c5e597028c1e7e7b70124946d804cf62662ddb3b4a4a
status: draft
summary: ''
title: PromotionRequest (Pydantic Model)
updated_at: 2026-06-11 09:23
---

---
title: "PromotionRequest (Pydantic Model)"
page_type: entity
status: active
summary: "Pydantic StrictModel defining the request body for creating/updating a promotion, including condition tree, tier list, and all promotion fields."
sources:
  - file: "PROMOTION_SYSTEM_TECHNICAL_SPEC.md"
    sections: ["4.2"]
confidence: high
---

# PromotionRequest (Pydantic Model)

Defined in `qb2025_backend/backend/schemas/promotion.py`, this model is used for both `POST /backend/promotion/add` and `PUT /backend/promotion/update`.

```python
class PromotionRequest(StrictModel):
    id: Optional[int] = None
    condition: ConditionLeaf              # condition tree
    tier: Optional[List[TierCreate]] = None # Tier rules (only for tier discounts)
    code: str
    name: str
    group: str
    promotion_type: str                    # 'promotion' | 'referral_code' | 'coupon_code'
    discount_type: DiscountType
    discount_value: Optional[Decimal] = None
    start_date: date
    end_date: date
    is_auto: int                           # 0/1
    quantity: int
    inactive: Optional[int] = 1
    ui_data: Dict[str, Any]
```

## Key Fields
- **condition**: A recursive [[ConditionLeaf (Request Model) | ConditionLeaf]] structure representing the eligibility rules.
- **tier**: A list of tier configurations required when `discount_type` is `tier`. Each tier includes `min_price`, `max_price`, `discount_type`, and `discount_value`.
- **promotion_type**: Must be one of the three promotion type values.
- **ui_data**: Arbitrary JSON for frontend UI state.

## See Also
- [[PromotionService]]
- [[DiscountType]]
- [[Promotion (Database Table)]]