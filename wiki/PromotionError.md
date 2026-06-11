---
created_at: 2026-06-11 09:01
page_type: entity
sources:
- file: 消费金额分层（sales_amount tier）功能详细分析.md
  hash: 53e0fa680bf2cea2b76a04cf21c41351d17feffb1d0e01b3e56cc877c620cbcb
status: draft
summary: ''
title: PromotionError
updated_at: 2026-06-11 09:01
---

---
title: "PromotionError"
page_type: entity
status: active
summary: "An enumeration of error codes used in the promotion module for validation failures, such as TIER_CONFIG_ERROR."
sources:
  - file: "消费金额分层（sales_amount tier）功能详细分析.md"
    sections: ["后端处理逻辑"]
confidence: medium
---

# PromotionError

`PromotionError` is a Python `Enum` that defines error codes for promotion-related exceptions raised by the backend.

## Known Members
- `TIER_CONFIG_ERROR`: Raised when `discount_type` is `'tier'` but no tier data is provided.

Additional members likely exist for other validation scenarios.

## Usage
In [[PromotionService]], an `AppException` is raised with `PromotionError.TIER_CONFIG_ERROR.value` if the tier list is missing.

## See Also
- [[PromotionService]]
