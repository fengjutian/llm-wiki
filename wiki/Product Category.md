---
created_at: 2026-06-11 09:18
page_type: entity
sources:
- file: Product List 与 Product Category 分析.md
  hash: 06681690f68faa8a45d10285759f0b636f16a3156a14a3a2e24821202793c42c
status: draft
summary: ''
title: Product Category
updated_at: 2026-06-11 09:18
---

---
title: "Product Category"
page_type: entity
status: active
summary: "A self-referencing database table (product_categories) supporting a tree structure for product classification, referenced by products via category_id."
sources:
  - file: "Product List 与 Product Category 分析.md"
    hash: ""
    sections: ["2. 对应的表结构推测", "4. ER 关系图"]
confidence: high
---

# Product Category

The **Product Category** module corresponds to the `product_categories` database table and is used to organise products into a hierarchical tree. Its API is imported from `@/api/product-category` and currently provides `getList`.

## Table Schema (Inferred)

| Column             | Description                         |
|--------------------|-------------------------------------|
| `id`               | Primary key                         |
| `name`             | Category name                       |
| `parent_category_id` | Self‑referencing foreign key; `NULL` for root nodes |
| `sort`             | Display order within parent         |
| `is_active`        | Active/inactive flag                |

## Tree Structure

- `parent_category_id` references `id` in the same table, allowing unlimited nesting.
- Used for navigation, search filters, and building breadcrumbs in the UI.

## Relationship with Product List

- One category can contain many products (1:N).
- The `category_id` column in the [[Product-List]] table acts as the foreign key.

## API

- `getList(···)` – returns all categories (likely in a flat list or nested format for tree building).

## See Also
- [[Product-List]] for the product entity.
