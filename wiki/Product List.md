---
created_at: 2026-06-11 09:18
page_type: entity
sources:
- file: Product List 与 Product Category 分析.md
  hash: 06681690f68faa8a45d10285759f0b636f16a3156a14a3a2e24821202793c42c
status: draft
summary: ''
title: Product List
updated_at: 2026-06-11 09:18
---

---
title: "Product List"
page_type: entity
status: active
summary: "The database table and Vue admin module for managing specific products, containing fields like name, catalog_num, price, turnaround, and a foreign key to Product Category."
sources:
  - file: "Product List 与 Product Category 分析.md"
    hash: ""
    sections: ["2. 对应的表结构推测", "3. 关系分析"]
confidence: high
---

# Product List

The **Product List** module corresponds to the `products` database table and represents individual, sellable products. It is managed in the Vue admin via API calls from `@/api/product`, including `getList`, `setActive`, `del`, and `sort`.

## Table Schema (Inferred)

| Column         | Description                                |
|----------------|--------------------------------------------|
| `id`           | Primary key                                |
| `business_line`| Business line classification               |
| `service_line` | Service line classification                |
| `name`         | Product name                               |
| `catalog_num`  | Catalog number                             |
| `price`        | Unit price                                 |
| `turnaround`   | Turnaround time                            |
| `addons`       | JSON list of add-on items                  |
| `is_active`    | Active/inactive flag                       |
| `sort`         | Display order                              |
| `category_id`  | Foreign key to [[Product-Category]]        |

## Relationship with Product Category

- A product belongs to exactly one category via `category_id`.
- The search filter in the frontend uses this field to narrow down products by category.
- The ER diagram shows a 1:N relationship: one category can have many products.

## API

- `getList(···)` – retrieves a paginated list of products.
- `setActive(id, status)` – toggles product active status.
- `del(id)` – deletes a product.
- `sort(data)` – changes the display order.

## See Also
- [[Product-Category]] for category structure and tree details.
