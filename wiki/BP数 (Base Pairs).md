---
created_at: 2026-06-09 13:00
page_type: concept
sources:
- file: BP数 与 Sample数 详细解释.md
  hash: 4ec504778fe00741df1271c9daa2f8ad567b0b8517375e8bc3cb690c824e868b
status: draft
summary: ''
title: BP数 (Base Pairs)
updated_at: 2026-06-09 13:00
---

---
title: "BP数 (Base Pairs)"
page_type:概念
status: active
summary: "The length of the DNA template in base pairs, used for per‑base‑pair pricing in sequencing services."
sources:
  - file: "BP数-Sample数-detail.md"
    sections: ["全部"]
confidence: high
---

# BP数 (Base Pairs)

**BP数** (Base Pairs) is the length of the DNA template per sample, measured in base pairs. It determines pricing for services that charge per base pair (e.g., gene synthesis).

## Definition
- From `Business.py`: the field `template_size` is a `Optional[Decimal]` representing the DNA template size.
- From `Category.py`: the `unit` field can be `"bp"` indicating per‑base‑pair pricing.

## Usage
- Certain products (like gene synthesis) are priced based on BP数.
- The pricing model combines BP数 with [[Sample数]] and [[数量阶梯折扣 | volume discounts]] to calculate the final price.

## Related
- [[Sample数]] – the number of samples.
- [[数量阶梯折扣]] – discount tiers.
