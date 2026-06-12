---
created_at: 2026-06-11 09:17
page_type: entity
sources:
- file: promotion 与 promotion code 两张表.md
  hash: 00a9bbc851c75142922ff770ca222dbbf57c01a69407fad0c4284240086cfca1
- file: PROMOTION_SYSTEM_TECHNICAL_SPEC.md
  hash: ea4a2957b396e3dc0ac9c5e597028c1e7e7b70124946d804cf62662ddb3b4a4a
status: draft
summary: ''
title: Promotion (Database Table)
updated_at: 2026-06-11 09:23
---

---
title: "Promotion (Database Table)"
page_type: entity
status: active
summary: "The unified database table storing promotional configurations, with a promotion_type field distinguishing between promotion, referral_code, and coupon_code."
sources:
  - file: "promotion 与 promotion code 两张表.md"
    sections: ["全部"]
  - file: "PROMOTION_SYSTEM_TECHNICAL_SPEC.md"
    sections: ["2.1"]
confidence: high
---

# Promotion (Database Table)

The **Promotion** table is the core database table for managing all promotional entities in the system. It centralizes what would otherwise be separate tables for different promotion types through the `promotion_type` field.

## Schema (detailed)

| Column          | Type         | Description                         |
|----------------|--------------|-------------------------------------|
| `id`           | int          | Primary key                         |
| `code`         | varchar(50)  | Unique promotion code               |
| `name`         | varchar(100) | Name/description                     |
| `group`        | varchar(100) | Grouping label                       |
| `promotion_type` | varchar(50)  | Type: `promotion`, `referral_code`, or `coupon_code` |
| `discount_type`  | varchar(20) | Discount calculation method: `percent`, `fixed`, `per_fixed`, or `tier` |
| `discount_value` | decimal(8,2) | Discount amount (for simple types)   |
| `start_date`   | date         | Validity start                       |
| `end_date`     | date         | Validity end                         |
| `is_expired`   | tinyint(1)   | 1 if expired                         |
| `is_auto`      | tinyint(1)   | 1 if automatically applied           |
| `ui_data`      | json         | UI‑specific configuration            |
| `quantity`     | int          | Max uses (0 = unlimited)             |
| `inactive`     | tinyint(1)   | 1 = active, 0 = inactive             |
| `created_by`   | int          | User who created                     |
| `created_at`   | datetime     | Creation timestamp                   |
| `updated_by`   | int          | User who last updated                |
| `updated_at`   | datetime     | Last update timestamp                |

## Usage
- `promotion_type = "promotion"`: standard marketing promotions.
- `promotion_type = "referral_code"`: codes distributed for customer referrals.
- `promotion_type = "coupon_code"`: discount coupons.

The table is referenced by the [[Order (Database Table)]] through its `promotion_code` field.

## Code References
- Backend model: `class Promotion(AsyncBaseModel)` in `backend/models/Promotion.py`.
- Frontend: the dropdown `promotiontypeOps` in `Form.vue` reflects these types.

## Related Pages
- [[DiscountType]]
- [[Promotion Form Component (Form.vue)]]
- [[Promotion Index Page (Index.vue)]]
- [[Promotion List Endpoint]]
- [[Promotion Export Endpoint]]
- [[PromotionService]]