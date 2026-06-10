---
created_at: 2026-06-10 01:52
page_type: entity
sources:
- file: 2025-05-20_1035_vue-component-refactor-copy-mode-fix.md
  hash: b68218f954363745488cb4ba13d185953d6e2c113ae686a3c3b1468d7f2a69d3
status: draft
summary: ''
title: transform-to-form-data
updated_at: 2026-06-10 01:52
---

---
title: "transform-to-form-data"
page_type: entity
status: active
summary: "The main data transformation function in the Promotion Form component that orchestrates the conversion of raw promotion data into the form data structure."
sources:
  - file: "2025-05-20_1035_vue-component-refactor-copy-mode-fix.md"
    hash: ""
    sections: ["重构方案"]
confidence: high
---

# transform-to-form-data

`transform-to-form-data` is a unified entry point for all data transformations in the Promotion Form. It calls subsidiary helpers (`transformTierData`, `transformQuantityType`, etc.) and applies the `DEFAULT_FILTER_DATA` constant.

## Purpose
- Reduce the size of `getData` by moving all transformation steps into a single, composable function.
- Ensure consistent transformation between Edit and Copy flows.

## Usage
```javascript
const formData = transformToFormData(rowData);
```

## Related
- [[Promotion Form Component (Form.vue)]]
- [[transform-tier-data]]
- [[transform-quantity-type]]
- [[default-filter-data]]
- [[Vue Component Refactoring Patterns]]