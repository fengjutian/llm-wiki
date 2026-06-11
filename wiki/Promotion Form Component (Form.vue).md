---
created_at: 2026-06-09 12:14
page_type: entity
sources:
- file: 2025-01-14_1035_vue-component-refactor-copy-mode-fix.md
  hash: e3ada7d6d1feba8a6d1435a450ce5ba44f26f065635faa64b371a682378f0e55
- file: 2025-05-20_1035_vue-component-refactor-copy-mode-fix.md
  hash: a59bfb2d9f3d1493f9b43ead5aeb1475bb2f11d133b65cdfdc22e33bfaacc922
- file: 消费金额分层（sales_amount tier）功能详细分析.md
  hash: 53e0fa680bf2cea2b76a04cf21c41351d17feffb1d0e01b3e56cc877c620cbcb
- file: 20260106_154500_promotion-copy-code-duplicate-bug.md
  hash: cc978571e75a7b9375e88ccfbda6cb3e851a5348b4809c412ff53295f2575a56
status: draft
summary: ''
title: Promotion Form Component (Form.vue)
updated_at: 2026-06-11 09:15
---

---
title: "Promotion Form Component (Form.vue)"
page_type: entity
status: active
summary: "Vue component for creating, editing, and copying promotions. Supports tiered discounts with tier_type sales_amount and tier_qty. Fixed copy mode bugs including id retention causing code duplicate."
confidence: high
sources:
  - file: "2025-01-14_1035_vue-component-refactor-copy-mode-fix.md"
    sections: ["背景与问题", "技术方案"]
  - file: "消费金额分层（sales_amount tier）功能详细分析.md"
    sections: ["前端交互流程", "数据转换流程"]
  - file: "20260106_154500_promotion-copy-code-duplicate-bug.md"
    sections: ["前端层问题", "数据流分析", "方案1"]
---

# Promotion Form Component

Located at `qb2025_frontend/src/views/admin/promotion/Form.vue`, this Vue component handles the creation, editing, and copying of promotional records.

## Mode Distinction

Three props control the form behavior:
- `editModel` (Boolean) – whether it is an edit/create modal.
- `rowId` (String?) – ID of the record being edited, or `null` for new/copy.
- `rowData` (Object?) – data used to pre‑fill the form for editing or copying.

| Mode   | editModel | rowId | rowData |
|--------|-----------|-------|---------|
| Create | true      | null  | null    |
| Edit   | true      | not null | not null |
| Copy   | true      | null  | not null |

Copy mode is specifically detected by: `rowId === null && rowData !== null`.

## Tier Configuration

When `discount_type` is set to `'tier'`, the component renders a tier builder. The `tier_type` field selects between two variants:

- **`sales_amount`** – [[Sales Amount Tier]] based on cumulative annual spending. Displays `min_price`/`max_price` price ranges.
- **`tier_qty`** – [[tier_qty Tier]] based on order item quantity. Uses `min_quantity`/`max_quantity`.

### Sales Amount Tier UI

Each tier row includes:
- A price threshold (USD)
- Three mutually exclusive discount fields: percentage (`discount_value1`), fixed amount (`discount_value2`), per‑item fixed (`discount_value3`)
- An opt‑in "Exceeding" (infinity) tier with `price` inherited from the highest normal tier and `max_price = null`. See [[Exceeding Tier]].

### Data Transformation

- **Before Submit** – `transformTierForSubmit()` converts frontend tier data into API format (`min_price`, `max_price`, `discount_type`, `discount_value`). See [[TransformTierForSubmit]].
- **After Fetch** – `transformTierData()` converts API tier data back to the form’s structure, including infinity flag and discount value mapping. See [[transform-tier-data]].

## Refactored `getData` Method

Originally 120 lines, now 45. The refactoring introduced:
- **Helper functions**: `transformTierData()`, `transformQuantityType()`, `transformToFormData()` that encapsulate transformation logic.
- **Constant**: `DEFAULT_FILTER_DATA` for default filter values.
- **Computed property**: `const isCopyMode = computed(() => props.editModel && props.rowData && !props.rowId)`.

## Bug Fixes

1. **Dialog title**: Now displays "Create" for copy mode: `:title="isCopyMode ? 'Create' : (editModel ? 'Edit' : 'Create')"`.
2. **API call**: The update endpoint is only called for edit mode: `if (props.editModel && !isCopyMode.value)`.

### Code Duplicate Bug (2026-01-06)

**Problem**: When copying a promotion, the original `code` was reused, leading to duplicate unique keys. The root cause was that `id` was retained in the copy data, bypassing the backend uniqueness check.

**Data Flow**: `rowData (id:5, code:SUMMER2025) → formDataCopy (deep clone) → add() sends id=5 → backend finds code=SUMMER2025 with id=5 → condition fails → duplicate allowed`.

**Solution**: Delete `id` from `formDataCopy` before submission:

```javascript
if (props.editModel && props.rowData && !props.rowId) {
  formDataCopy = JSON.parse(JSON.stringify(props.rowData));
  delete formDataCopy.id;  // clear id for new record
}
```

This fix ensures the new promotion is treated as a fresh record and forces the backend to generate a new id. It also prevents the uniqueness check bypass (see [[唯一性检查逻辑漏洞]]).

## Design Decision: Mode Detection

The decision to use `rowId === null && rowData !== null` for copy mode was taken over an alternative of adding an explicit `mode` prop (e.g., `type: 'create' | 'edit' | 'copy'`). The explicit approach is semantically clearer but requires modifying parent components and has a higher implementation cost. The current approach works with existing prop interfaces.

## Risk Assessment

| Risk | Description | Mitigation |
|------|-------------|------------|
| Props dependency | Depends on parent supplying correct values for `rowId` and `rowData`. | Clear documentation and future considerations for a dedicated mode prop. |
| Backward compatibility | Adding `isCopyMode` does not break existing create/edit flows. | Thorough testing of all three modes after changes. |
| Data isolation | Copy mode may still send original `id` and other sensitive fields (like `code`) if not properly cleared. | Implement the `delete id` fix; consider clearing unique fields. |

## Open Questions

- Should batch copy be supported?
- Should certain fields (e.g., `code`) be automatically cleared when copying?

## See Also
- [[vue-mode-pattern]] – the generic mode detection pattern.
- [[iscopymode-computed]] – the computed property for copy detection.
- [[id-保留问题]] – detailed analysis of id retention.
- [[唯一性检查逻辑漏洞]] – backend loophole.
- [[复制场景数据隔离模式]] – design pattern.
