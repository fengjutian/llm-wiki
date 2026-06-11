---
created_at: 2026-06-11 08:58
page_type: concept
sources:
- file: 消费金额分层（sales_amount tier）功能详细分析.md
  hash: 53e0fa680bf2cea2b76a04cf21c41351d17feffb1d0e01b3e56cc877c620cbcb
status: draft
summary: ''
title: Sales Amount Tier
updated_at: 2026-06-11 09:01
---

---
title: "Sales Amount Tier"
page_type: concept
status: active
summary: "Promotional discount mechanism that applies tiered discounts based on the customer's cumulative annual spending amount."
sources:
  - file: "消费金额分层（sales_amount tier）功能详细分析.md"
    sections: ["全部"]
confidence: high
---

# Sales Amount Tier

The **sales amount tier** is a promotional strategy where discounts are automatically applied based on the customer's **cumulative annual spending**. It is triggered when `discount_type` is set to `'tier'` and `tier_type` to `'sales_amount'` in the [[Promotion Form Component (Form.vue)]].

## How It Works

1. **Frontend Configuration** – Administrators define a list of tiers. Each tier has a price threshold and a discount type (% or fixed amount). An optional "exceeding" tier (with `max_price = null`) applies to amounts above the highest threshold.
2. **Data Transformation** – Before submission, the frontend converts tier data to API format via [[TransformTierForSubmit]](). Each tier becomes a `min_price`/`max_price` range and a `discount_type`/`discount_value` pair.
3. **Backend Discount Calculation** – During order placement, [[PromotionService]].`calculate_discount()` sums the total of matched products, finds the tier whose range includes the total, and applies the corresponding discount (percent, fixed, or per‑fixed).
4. **Database Storage** – Tier rules are stored in the [[PromotionTier]] table, linked to a `promotion` record.

### UI Layout
The tier builder in the form renders each tier as:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Tier N        $[threshold] USD,  [%] or [$ amt] USD or [$ per item] USD│
│  [Remove]                                                              │
└──────────────────────────────────────────────────────────────────────────┘
```
The final row is an optional “Exceeding” checkbox that, when selected, sends `max_price: null` to the API. See [[Exceeding Tier]] for details.

### Data Flow
[[TransformTierForSubmit]] handles the form-to-API mapping; [[transform-tier-data]] handles the API-to-form mapping. Together they ensure consistent conversion of price ranges and discount values.

## Discount Types
- **percent**: Percentage off the total amount (e.g., 10% off).
- **fixed**: Flat amount deducted (e.g., $50 off).
- **per_fixed**: Fixed amount deducted per item (e.g., $5 per item).

## Related Features
- [[tier_qty Tier]] – the quantity‑based counterpart.
- [[Exceeding Tier]] – the open‑ended infinity tier.
- [[Promotion Form Component (Form.vue)]] – where tiers are configured.
- [[TransformTierForSubmit]] – frontend submission helper.
- [[transform-tier-data]] – frontend data loading helper.
- [[PromotionService]] – backend discount calculation.
- [[PromotionTier]] – database persistence.
