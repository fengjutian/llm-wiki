---
created_at: 2026-06-11 09:01
page_type: concept
sources:
- file: 消费金额分层（sales_amount tier）功能详细分析.md
  hash: 53e0fa680bf2cea2b76a04cf21c41351d17feffb1d0e01b3e56cc877c620cbcb
status: draft
summary: ''
title: Exceeding Tier
updated_at: 2026-06-11 09:01
---

---
title: "Exceeding Tier"
page_type: concept
status: active
summary: "The open-ended tier in a sales amount tier configuration that applies to all spending above the highest threshold, with max_price set to null."
sources:
  - file: "消费金额分层（sales_amount tier）功能详细分析.md"
    sections: ["前端交互流程", "数据转换流程"]
confidence: high
---

# Exceeding Tier

In the context of the [[Sales Amount Tier]] feature, the **exceeding tier** (also called the "infinity" tier) is the final, optional tier that covers any amount beyond the highest explicitly defined price threshold. It is characterized by `max_price: null` in the database and `infinity: true` in the frontend.

## Frontend Representation
- A checkbox "Exceeding" that, when checked, makes the last tier an open-ended one.
- The price field for this tier is automatically set to the highest normal tier's price (and is disabled for editing).
- Discount values are specified in the same way as other tiers (percent, fixed, or per_fixed).

## Data Transformation
- In `transform-tier-data` (API → form), if no tier with `max_price: null` exists in the backend data, one is auto‑created with `price` equal to the last tier's `max_price` and `infinity: true`.
- In `transform-tier-for-submit` (form → API), the infinity tier is sent as an entry with `max_price: null` and `min_price` equal to its `price`.

## Example
If tiers are:
- $0–1500: 5% off
- $1500–2000: $100 off
- Exceeding $2000: $15 per item

Then a spending of $2500 triggers the exceeding tier.

## See Also
- [[Sales Amount Tier]]
- [[transform-tier-data]]
- [[TransformTierForSubmit]]
