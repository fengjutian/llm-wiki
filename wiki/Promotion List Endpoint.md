---
created_at: 2026-06-09 12:59
page_type: entity
sources:
- file: 2026-05-14_1600_promotion_list_export_filter.md
  hash: 7f8fda45e16f5ea655f3c1073eb170a1c35cc15d5997c551848ab7aa32e3fcfe
status: draft
summary: ''
title: Promotion List Endpoint
updated_at: 2026-06-09 12:59
---

---
title: "Promotion List Endpoint"
page_type: entity
status: active
summary: "POST /backend/promotion/list with multi-field filtering: fuzzy code/group, subquery associations, date range."
sources:
  - file: "2026-05-14_1600_promotion_list_export_filter.md"
confidence: high
---

# Promotion List Endpoint

Endpoint: `POST /backend/promotion/list`

## Supported Filters

| Parameter       | Type   | Description                            |
|-----------------|--------|----------------------------------------|
| `promotion_code`| string | Fuzzy match on promotion code          |
| `group`         | string | Fuzzy match on group name              |
| `service`       | string | Filters by category_id via subquery on PromotionCondition |
| `customer`      | string | Filters by customer_id via subquery on PromotionCondition |
| `region`        | string | Filters by region_id via subquery on PromotionCondition   |
| `created_at[]`  | array  | Date range `[start_date, end_date]`    |

## Implementation

The repository method `PromotionRepo.paginate` applies the filters:
- Code and group use `like` with wildcards.
- Association filters (service, customer, region) use a subquery that joins the `PromotionCondition` table.
- Date range uses the array parameter parsed from the request.

## Related
- [[Promotion Export Endpoint]]
- [[Dynamic Search Options Loading (LoadingSearch Mechanism)]]
- [[Promotion Index Page (Index.vue)]]