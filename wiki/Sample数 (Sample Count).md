---
created_at: 2026-06-09 13:00
page_type: concept
sources:
- file: BP数 与 Sample数 详细解释.md
  hash: 4ec504778fe00741df1271c9daa2f8ad567b0b8517375e8bc3cb690c824e868b
status: draft
summary: ''
title: Sample数 (Sample Count)
updated_at: 2026-06-09 13:00
---

---
title: "Sample数 (Sample Count)"
page_type: concept
status: active
summary: "The count of DNA sample tubes or wells submitted for sequencing, computed from QuoteDetail items, and used for volume discount pricing."
sources:
  - file: "BP数-Sample数-detail.md"
    sections: ["全部"]
confidence: high
---

# Sample数 (Sample Count)

**Sample数** represents the number of DNA samples (tubes or wells) that a customer sends to the lab for sequencing. It is a key metric for [[数量阶梯折扣 | volume discount pricing]].

## Computation (Backend)

From `Quote.py`:

```python
def get_sample_count(quote_detail_list: List[QuoteDetail]):
    sample_num = 0
    for item in quote_detail_list:
        # Only main products (those with custom_data) count toward sample count
        if item.custom_data:
            # Non-gene-synthesis and non-plasmid-prep services: sum the quantity
            if item.quantity and item.service not in [constants.CATEGORY_ID_GENE, constants.CATEGORY_ID_PLASMID_DNAPREP]:
                sample_num += item.quantity or 0
            else:
                # Gene synthesis or plasmid preparation: each order item counts as 1 sample
                sample_num += 1
    return sample_num
```

### Rules
- Only order items with `custom_data` (main products) are considered.
- For services **other than** gene synthesis and plasmid DNA preparation: the item’s `quantity` is added.
- For gene synthesis or plasmid prep: each such item contributes exactly 1 sample, regardless of quantity.

## Frontend Display
- In `detail.vue`, the field `reaction_count` is displayed as "Sample Count".
- In `FormPrice.vue`, the field `sample_count` is used for the `rowspan` attribute to merge rows when a product has multiple reactions.

## Pricing Impact
Sample数 drives the **volume discount tiers** (see [[数量阶梯折扣]]). A higher sample count may unlock a lower unit price.

## Related
- [[BP数]] – the DNA length per sample.
- [[数量阶梯折扣]] – the discount tiers based on sample count.
