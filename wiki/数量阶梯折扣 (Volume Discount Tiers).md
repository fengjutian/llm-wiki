---
created_at: 2026-06-09 13:00
page_type: concept
sources:
- file: BP数 与 Sample数 详细解释.md
  hash: 4ec504778fe00741df1271c9daa2f8ad567b0b8517375e8bc3cb690c824e868b
status: draft
summary: ''
title: 数量阶梯折扣 (Volume Discount Tiers)
updated_at: 2026-06-09 13:00
---

---
title: "数量阶梯折扣 (Volume Discount Tiers)"
page_type: concept
status: active
summary: "Tiered discount pricing based on sample count; two discount levels triggered by seq_discount_volume and seq_discount2_volume thresholds."
sources:
  - file: "BP数-Sample数-detail.md"
    sections: ["全部"]
confidence: high
---

# 数量阶梯折扣 (Volume Discount Tiers)

The sequencing service pricing model includes volume discounts based on the [[Sample数]]. The system supports two tiers:

## Pricing Logic (Quote.py)

```python
def catalog_to_price(row: Quotation, sample_num) -> dict:
    # Second-tier discount: sample_num meets or exceeds seq_discount2_volume
    if row.seq_discount2_volume and 0 < row.seq_discount2_volume <= sample_num:
        item_dict['premixed_price'] = row.seq_discount2_price
        item_dict['nonpremixed_price'] = row.seq_discount2_price
    # First-tier discount: sample_num meets or exceeds seq_discount_volume
    elif row.seq_discount_volume and 0 < row.seq_discount_volume <= sample_num:
        item_dict['premixed_price'] = row.seq_discount_price
        item_dict['nonpremixed_price'] = row.seq_discount_price
```

## Tier Definitions

| Tier | Threshold Field | Price Applied |
|------|----------------|---------------|
| Second (higher discount) | `seq_discount2_volume` | `seq_discount2_price` |
| First (lower discount) | `seq_discount_volume` | `seq_discount_price` |

### Example
- If `seq_discount_volume = 10` and `seq_discount2_volume = 50`:
  - 1–9 samples → regular price
  - 10–49 samples → first‑tier discount price
  - 50+ samples → second‑tier discount price

## Related
- [[Sample数]] – drives the discount tier.
- [[BP数]] – may interact with per‑bp pricing alongside discounts.
