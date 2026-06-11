---
created_at: 2026-06-11 09:01
page_type: concept
sources:
- file: 消费金额分层（sales_amount tier）功能详细分析.md
  hash: 53e0fa680bf2cea2b76a04cf21c41351d17feffb1d0e01b3e56cc877c620cbcb
status: draft
summary: ''
title: DiscountType
updated_at: 2026-06-11 09:01
---

---
title: "DiscountType"
page_type: concept
status: active
summary: "The classification of discount types supported by the promotion system: percent, fixed, per_fixed, tier, and tier_qty."
sources:
  - file: "消费金额分层（sales_amount tier）功能详细分析.md"
    sections: ["API 接口", "后端处理逻辑"]
confidence: high
---

# DiscountType

Within the promotion system, `discount_type` is a field that determines how the discount is applied. The possible values are:

| Value      | Description                                                                 | Used In                                 |
|------------|-----------------------------------------------------------------------------|-----------------------------------------|
| `percent`  | Percentage off the order/subtotal                                           | Simple promotions, tier items           |
| `fixed`    | Flat currency amount off                                                    | Simple promotions, tier items           |
| `per_fixed`| Fixed amount deducted per line item (times quantity)                        | Tier items only                         |
| `tier`     | Tiered discount based on cumulative spending (sales amount) or quantity    | [[Sales Amount Tier]]                   |
| `tier_qty` | Tiered discount based on item quantity, with per-unit price replacement    | [[tier_qty Tier]]                       |

When `discount_type` is `'tier'`, the actual discount is determined at runtime by matching the order total to a [[PromotionTier]] rule, and the tier itself specifies one of `percent`, `fixed`, or `per_fixed`.

## See Also
- [[Sales Amount Tier]]
- [[tier_qty Tier]]
- [[PromotionTier]]
