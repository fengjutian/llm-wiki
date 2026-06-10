---
created_at: 2026-06-09 13:00
page_type: source_summary
sources:
- file: BP数 与 Sample数 详细解释.md
  hash: 4ec504778fe00741df1271c9daa2f8ad567b0b8517375e8bc3cb690c824e868b
status: draft
summary: ''
title: BP数 与 Sample数 详细解释 (Source Summary)
updated_at: 2026-06-09 13:00
---

---
title: "BP数 与 Sample数 详细解释 (Source Summary)"
page_type: source_summary
status: active
summary: "Explains Sample数 (sample count) and BP数 (base pairs) in a biological sequencing order system, with code snippets from Quote.py, Business.py, Category.py, and Vue components."
sources: []
confidence: high
---

# Source Summary

This source document from the lab sequencing order system (date unknown) details two core metrics:

- **[[Sample数]]** – the number of DNA samples sent by the customer, used to calculate volume discounts.
- **[[BP数]]** – the length of the DNA template per sample, used for per‑base‑pair pricing.

It also explains the **[[数量阶梯折扣]]** (volume discount tiers) applied in quotation pricing.

## Key Facts

1. Sample count calculation (Quote.py `get_sample_count`):
   - For products with `custom_data`, if the service is not gene synthesis or plasmid DNA prep, sum the `quantity` fields.
   - Otherwise, count each order item as 1 sample.

2. BP number (Business.py `template_size` field) is a `Decimal` value representing the DNA template size in base pairs.

3. Tiered pricing in `catalog_to_price`:
   - `seq_discount2_volume` triggers second‑tier discount if `sample_num` reaches that threshold.
   - Otherwise, `seq_discount_volume` triggers first‑tier discount.

4. Frontend usage:
   - `detail.vue` displays `reaction_count` as "Sample Count".
   - `FormPrice.vue` uses `sample_count` to merge rows (`rowspan`).

## Relationships
- Describes [[Sample数]]
- Describes [[BP数]]
- Describes [[数量阶梯折扣]]
