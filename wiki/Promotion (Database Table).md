---
created_at: 2026-06-11 09:17
page_type: entity
sources:
- file: promotion 与 promotion code 两张表.md
  hash: 00a9bbc851c75142922ff770ca222dbbf57c01a69407fad0c4284240086cfca1
status: draft
summary: ''
title: Promotion (Database Table)
updated_at: 2026-06-11 09:17
---

---
title: "Promotion (Database Table)"
page_type: entity
status: active
summary: "The unified database table storing promotional configurations, with a promotion_type field distinguishing between promotion, referral_code, and coupon_code."
sources:
  - file: "promotion 与 promotion code 两张表.md"
    sections: ["全部"]
confidence: high
---

# Promotion (Database Table)

The **Promotion** table is the core database table for managing all promotional entities in the system. It centralizes what would otherwise be separate tables for different promotion types through the `promotion_type` field.

## Schema (key fields)
- `code` (PK or unique): the unique code string (e.g., "SUMMER2025").
- `promotion_type` (enum/string): one of `"promotion"`, `"referral_code"`, `"coupon_code"` indicating the nature of the promotion.
- Other fields include `name`, `group`, `discount_type`, `start_date`, `end_date`, `is_auto`, `quantity`, etc.

## Usage
- `promotion_type = "promotion"`: standard marketing promotions.
- `promotion_type = "referral_code"`: codes distributed for customer referrals.
- `promotion_type = "coupon_code"`: discount coupons.

The table is referenced by the `[[Order (Database Table)|Order]]` table through its `promotion_code` field.

## Code References
- Backend model: `class Promotion(AsyncBaseModel)` in the backend.
- Frontend: the dropdown `promotiontypeOps` in `Form.vue` reflects these types.

## Related Pages
- [[DiscountType]]
- [[Promotion Form Component (Form.vue)]]
- [[Promotion Index Page (Index.vue)]]
- [[Promotion List Endpoint]]
- [[Promotion Export Endpoint]]
- [[PromotionService]]
