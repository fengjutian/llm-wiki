---
created_at: 2026-06-11 09:15
page_type: source_summary
sources:
- file: 20260106_154500_promotion-copy-code-duplicate-bug.md
  hash: cc978571e75a7b9375e88ccfbda6cb3e851a5348b4809c412ff53295f2575a56
status: draft
summary: ''
title: '2026-01-06 Source: Promotion Copy Code Duplicate Bug'
updated_at: 2026-06-11 09:15
---

---
title: "2026-01-06 Source: Promotion Copy Code Duplicate Bug"
page_type: source_summary
status: active
summary: "Analysis of a bug where copying a promotion retained the original code, causing duplicate unique keys."
confidence: high
sources:
  - file: "20260106_154500_promotion-copy-code-duplicate-bug.md"
    hash: ""
    sections: ["全部"]
---

# 2026-01-06 Source: Promotion Copy Code Duplicate Bug

This source documents a critical bug discovered on 2026-01-06 in the promotion management module: copying a promotion did not generate a new unique code; instead the original code was reused, violating the code uniqueness constraint.

## Key Findings

1. **Frontend**: In copy mode (`editModel && rowData && !rowId`), the `getData` method deep‑clones `props.rowData`, which includes the original `id`. The `id` is not removed before submitting to the backend.
2. **Backend**: The uniqueness check in `PromotionService.create` (`services/Promotion.py`) skips the duplicate check when `query.id` is present and equals the record found by `code`. Since copy mode sends the original `id`, the condition fails and duplicate creation is allowed.
3. **Data Flow**: The chain `rowData (with id) → formDataCopy → add() → backend` leads to the loophole.

## Solutions

### Frontend (Recommended)
In `Form.vue`, after cloning `rowData`, delete the `id` property:

```javascript
if (props.editModel && props.rowData && !props.rowId) {
  formDataCopy = JSON.parse(JSON.stringify(props.rowData));
  delete formDataCopy.id;  // clear id for copy
}
```

### Backend
Remove the `id` comparison, always reject duplicate codes regardless of request `id`:

```python
has_promotion = await self.repo.find(dict(code=query.code))
if has_promotion:
    raise AppException(PromotionError.EXIST.value, ...)
```

## Involved Files
- `qb2025_frontend/src/views/admin/promotion/Form.vue`
- `qb2025_frontend/src/views/admin/promotion/Index.vue`
- `qb2025_backend/backend/services/Promotion.py`
- `qb2025_backend/routers/v1/backend/promotion.py`

## Relationships
- Extends [[Promotion Form Component (Form.vue)]] with a new bug and fix.
- References [[iscopymode-computed]], [[vue-mode-pattern]], [[id-保留问题]], [[唯一性检查逻辑漏洞]], [[promotion-service]], [[promotion-request-model]].
- Introduces [[复制场景数据隔离模式]] as a design pattern.
