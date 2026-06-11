---
created_at: 2026-06-11 09:18
page_type: source_summary
sources:
- file: Product List 与 Product Category 分析.md
  hash: 06681690f68faa8a45d10285759f0b636f16a3156a14a3a2e24821202793c42c
status: draft
summary: ''
title: 'Source: Product List 与 Product Category 分析'
updated_at: 2026-06-11 09:18
---

---
title: "Source: Product List 与 Product Category 分析"
page_type: source_summary
status: active
summary: "Analysis document describing the Product List and Product Category modules, their database tables, field definitions, and the 1:N foreign-key relationship with a tree‑structured category model."
sources:
  - file: "Product List 与 Product Category 分析.md"
    hash: ""
    sections: ["全部"]
confidence: high
---

# Source: Product List 与 Product Category 分析

This source document provides a code‑level analysis of two Vue admin modules and their underlying database structures.

## Key Findings

1. **Module Identification**
   - Product List: API calls from `@/api/product` (`getList`, `setActive`, `del`, `sort`).
   - Product Category: API `getList` from `@/api/product-category`.

2. **Table Inference**
   - `products` table: id, business_line, service_line, name, catalog_num, price, turnaround, addons (list), is_active, sort, and `category_id`.
   - `product_categories` table: id, name, parent_category_id (self‑reference), sort, is_active.

3. **Relationship**
   - Products reference a category via `category_id` → 1 category : N products.
   - Category rows can form a tree through `parent_category_id`.

4. **ER Diagram**
   - A clear ER diagram is presented, illustrating the 1:N link and the self‑referential category hierarchy.

5. **Analogy**
   - Category = folder, Product = file.

## Implications for the Wiki

- Formalises two entities: [[Product-List]] and [[Product-Category]].
- Documents the tree structure concept for categories.
- Provides explicit field lists for future reference.
