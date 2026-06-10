---
created_at: 2026-06-09 12:47
page_type: concept
sources:
- file: 2026-05-13_1100_promotion_dynamic_search_options.md
  hash: 0e570928bf7fb995b02abf4cd9ce5114de989be3d25b4a9ed16e8ae4af088571
status: draft
summary: ''
title: Dynamic Search Options Loading (LoadingSearch Mechanism)
updated_at: 2026-06-09 12:47
---

---
title: "Dynamic Search Options Loading (LoadingSearch Mechanism)"
page_type: concept
status: active
summary: "Pattern to load select options for search filters dynamically using a condition_types API and the loadingSearch flag with the page-header component."
sources:
  - file: "2026-05-13_1100_promotion_dynamic_search_options.md"
    sections: ["技术分析", "文件变更"]
confidence: high
---

# Dynamic Search Options Loading (LoadingSearch Mechanism)

When a list page in the Vue frontend needs dropdown filters whose options come from a backend service (e.g., customer list, region list), the following pattern is used to load them dynamically after the component mounts.

## Pattern Steps

1. **Fetch data in `onMounted`** – Call a backend API (often named `getCondition`) that returns a list of condition groups.
   - Each group has a `type` (e.g., `"customer"`, `"region"`, `"service"`) and an array of `fields`.
2. **Map fields to select options** – For each group, transform the fields into `{ id, label }` objects suitable for the `options` prop of the search field.
   - The mapping depends on the group: some use `field.name` as the ID and `field.label` for the label; others may use `field.name` for both.
3. **Re‑trigger search field rendering** – The `page-header` component internally uses a `searchFieldsKey` ref to decide when to re‑build its search layout. By toggling a `loadingSearch` ref and passing it to `page-header` via `:loading-search`, the component will re‑render the search fields, now with the newly populated options.

## Example (Promotion Index)

```vue
// In <script setup>
import { getCondition } from '@/api/promotion';
const loadingSearch = ref(false);

onMounted(async () => {
  const res = await getCondition();
  // Map each group's fields to options, attach to search config
  res.data.forEach(group => {
    if (group.type === 'service') {
      // use field.name as both value and label
      searchConfig.value[group.type].options = group.fields.map(f => ({ id: f.name, label: f.label || f.name }));
    } else {
      searchConfig.value[group.type].options = group.fields.map(f => ({ id: f.name, label: f.label }));
    }
  });
  loadingSearch.value = true; // triggers page-header re‑render
});
```

## Usage
- [[Promotion Index Page (Index.vue)]] – uses this pattern for the promotion list.
- `customer/Index.vue` (internal reference) – the original implementation that this pattern was copied from.

## See Also
- [[Vue Component Refactoring Patterns]] (related patterns for component design)
