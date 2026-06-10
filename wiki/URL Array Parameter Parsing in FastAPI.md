---
created_at: 2026-06-09 12:59
page_type: concept
sources:
- file: 2026-05-14_1600_promotion_list_export_filter.md
  hash: 7f8fda45e16f5ea655f3c1073eb170a1c35cc15d5997c551848ab7aa32e3fcfe
status: draft
summary: ''
title: URL Array Parameter Parsing in FastAPI
updated_at: 2026-06-09 12:59
---

---
title: "URL Array Parameter Parsing in FastAPI"
page_type: concept
status: active
summary: "Avoiding the loss of repeated query parameters when using dict(request.query_params) by switching to multi_items() to correctly parse arrays."
sources:
  - file: "2026-05-14_1600_promotion_list_export_filter.md"
confidence: high
---

# URL Array Parameter Parsing in FastAPI

When a GET request sends repeated query parameters to indicate an array (e.g., `?created_at[]=2026-05-12&created_at[]=2026-05-14`), using `dict(request.query_params)` collapses the keys, keeping only the last value. This breaks array‑based filters.

## Correct Approach

Use `request.query_params.multi_items()` to iterate over all key‑value pairs:
```python
for key, value in request.query_params.multi_items():
    clean_key = key.replace('[]', '')
    # collect values into a list
```

This preserves all values and allows building a proper list for parameters like `created_at[]`.

## Application

Adopted in the [[Promotion Export Endpoint]] to fix the export button returning unfiltered data despite active list filters.

## Related
- [[Promotion Export Endpoint]]
- [[2026-05-14_1600_promotion_list_export_filter]]