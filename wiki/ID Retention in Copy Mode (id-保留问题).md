---
created_at: 2026-06-11 09:15
page_type: concept
sources:
- file: 20260106_154500_promotion-copy-code-duplicate-bug.md
  hash: cc978571e75a7b9375e88ccfbda6cb3e851a5348b4809c412ff53295f2575a56
status: draft
summary: ''
title: ID Retention in Copy Mode (id-保留问题)
updated_at: 2026-06-11 09:15
---

---
title: "ID Retention in Copy Mode"
page_type: concept
status: active
summary: "The defect where copy mode of the Promotion Form retains the original record's id in the submission payload, causing uniqueness checks to fail."
confidence: high
sources:
  - file: "20260106_154500_promotion-copy-code-duplicate-bug.md"
    sections: ["前端层问题", "数据流分析"]
---

# ID Retention in Copy Mode

When the Promotion Form component operates in copy mode (`editModel && rowData && !rowId`), it is supposed to create a new record. However, the current implementation deep‑clones `props.rowData` without removing the `id` field. This leads to the backend receiving a request that includes the original record's `id`, which in turn bypasses uniqueness checks for fields like `code`.

## Cause
In `Form.vue`'s `getData` method:

```javascript
if (props.editModel && props.rowData && !props.rowId) {
  formDataCopy = JSON.parse(JSON.stringify(props.rowData)); // retains id
}
```

The copied object contains all properties of `rowData`, including `id`, `code`, `created_at`, etc. The `id` is not reset to `null` or deleted.

## Impact
- The backend `PromotionService.create()` receives `query.id` equal to the original record's id.
- The uniqueness check logic for `code` is bypassed (see [[唯一性检查逻辑漏洞]]).
- Duplicate `code` values are allowed, violating business rules.

## Fix
Delete the `id` field before submission:

```javascript
delete formDataCopy.id;
```

## Related
- [[Promotion Form Component (Form.vue)]]
- [[唯一性检查逻辑漏洞]]
- [[复制场景数据隔离模式]]
