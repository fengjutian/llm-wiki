---
created_at: 2026-06-11 09:15
page_type: concept
sources:
- file: 20260106_154500_promotion-copy-code-duplicate-bug.md
  hash: cc978571e75a7b9375e88ccfbda6cb3e851a5348b4809c412ff53295f2575a56
status: draft
summary: ''
title: Copy Scenario Data Isolation Pattern (复制场景数据隔离模式)
updated_at: 2026-06-11 09:15
---

---
title: "Copy Scenario Data Isolation Pattern"
page_type: concept
status: active
summary: "General design pattern requiring that copy operations fully isolate the new record from the original, including clearing identifiers and regenerating unique fields."
confidence: high
sources:
  - file: "20260106_154500_promotion-copy-code-duplicate-bug.md"
    sections: ["根因分析", "解决方案"]
---

# Copy Scenario Data Isolation Pattern

When implementing a copy/clone feature for a record, the new record must be treated as a completely independent entity. The pattern dictates that:

- **All identifiers (`id`, UUID) must be cleared** to ensure the backend creates a new resource rather than accidentally updating the original.
- **String fields with unique constraints must be regenerated or left empty** to prompt user input.
- **Audit fields (`created_at`, `updated_at`) should be reset** to the current time.
- **Associated child records must be duplicated, not referenced**.

This bug case illustrates violation of the first two points: the original `id` was sent, causing the backend to skip the code uniqueness check, and the `code` field was copied verbatim.

## Application in Promotion Copy
- Frontend fix: delete `id` from the copied data before submission.
- Optionally, force the user to enter a new `code`.

## Related
- [[ID Retention in Copy Mode]]
- [[唯一性检查逻辑漏洞]]
