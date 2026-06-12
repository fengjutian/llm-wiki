---
created_at: 2026-06-11 09:23
page_type: concept
sources:
- file: PROMOTION_SYSTEM_TECHNICAL_SPEC.md
  hash: ea4a2957b396e3dc0ac9c5e597028c1e7e7b70124946d804cf62662ddb3b4a4a
status: draft
summary: ''
title: Promotion Error Codes
updated_at: 2026-06-11 09:23
---

---
title: "Promotion Error Codes"
page_type: concept
status: active
summary: "List of error codes defined in config/error_code/promotion.py for the promotion system."
sources:
  - file: "PROMOTION_SYSTEM_TECHNICAL_SPEC.md"
    sections: ["9"]
confidence: high
---

# Promotion Error Codes

The following error codes are raised by the promotion service and repository:

| Code                          | Message                      |
|-------------------------------|------------------------------|
| `PROMOTION_NOT_FOUND`         | Promotion not found           |
| `PROMOTION_EXPIRED`           | Promotion is expired          |
| `PROMOTION_DATE_ERROR`        | Date range error              |
| `PROMOTION_PERCENT_ERROR`     | Percent value exceeds 100     |
| `TIER_CONFIG_ERROR`           | Tier configuration error      |
| `PROMOTION_HAS_BEEN_USED`     | Promotion has been used       |
| `EXIST`                       | Promotion code already exists |
| `NO_CONDITION`                | No condition configured       |
| `UNSUPPORTED_DISCOUNT_TYPE`   | Unsupported discount type     |

## Usage
These codes are used with [[AppException]] to provide user‑friendly error messages through the API.