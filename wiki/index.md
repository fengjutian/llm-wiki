# Wiki Index
## other
- [[2025-01-14_1035_vue-component-refactor-copy-mode-fix.md]] – Source document: Vue Promotion Form refactoring and copy mode bug fix.
- [[2025-05-20_1035_vue-component-refactor-copy-mode-fix.md]] – Source document (2025-05-20) on refactoring the Promotion Form, including design decisions, risk assessment, and open questions.
- [[2026-05-13_1100_promotion_dynamic_search_options.md]] – Source: implementation of dynamic search dropdown options on the promotion list page via condition_types API.
- [[2026-05-13_1435_promotion_export_csv.md]] – Implementation of backend streaming CSV export for promotions, using GET /api/v1/backend/promotion/download.
- [[2026-05-14 Source: Promotion List/Export Filter Implementation]] – Source document describing filter additions and array parameter bug fix
- [[BP数-Sample数-detail.md]] – Source document explaining Sample数 (sample count) and BP数 (base pairs) in a biological sequencing order system.
- [[BP数.md]] – The length of the DNA template in base pairs, used for per-base-pair pricing in sequencing services.
- [[Dynamic-Search-Options-Loading.md]] – Concept: pattern for dynamically loading search filter options using a backend API and the loadingSearch flag in Vue pages.
- [[Hardware-Aware-SSM-Algorithm.md]] – Parallel scan CUDA kernel avoiding state matrix materialization for efficient SSM computation.
- [[Mamba.md]] – Architecture combining selective SSMs and hardware-aware algorithm to achieve O(N) sequence modeling.
- [[Multi-Head-Attention]] – Parallel attention projections enabling joint attention to different representation subspaces.
- [[Positional-Encoding]] – Sinusoidal encodings added to input embeddings to convey token position in non-recurrent models.
- [[Promotion Export Endpoint]] – GET /backend/promotion/download streaming CSV with group filter and array fix
- [[Promotion List Endpoint]] – POST /backend/promotion/list with fuzzy and subquery filters
- [[Promotion-Index-Page.md]] – Entity: the Vue list page for promotions (Index.vue) with dynamic search options for service, customer, and region.
- [[Sample数.md]] – The count of DNA samples sent for sequencing, computed from QuoteDetail items, used for volume discount pricing.
- [[Selective-State-Spaces.md]] – Input-dependent SSM parameters that enable dynamic information propagation.
- [[Self-Attention]] – Attention mechanism relating different positions of a single sequence to compute its representation.
- [[State-Space-Models.md]] – Recurrent models with linear state transitions, predecessors to Mamba.
- [[Transformer]] – Neural network architecture using self-attention, dispensing with recurrence, and achieving state-of-the-art on machine translation.
- [[URL Array Parameter Parsing in FastAPI]] – How to correctly parse repeated query parameters using multi_items()
- [[mamba-paper.md]] – Source document: Mamba paper introducing selective state spaces for linear-time sequence modeling.
- [[promotion-form-vue.md]] – Promotion Form.vue component, handling create/edit/copy modes with props editModel, rowId, rowData.
- [[vue-component-refactor-patterns.md]] – Refactoring patterns: extracting helper functions, constants, and computed properties for clarity.
- [[vue-mode-pattern.md]] – Pattern for distinguishing forms modes (create, edit, copy) using three props and computed isCopyMode.
- [[数量阶梯折扣.md]] – Tiered discount pricing based on sample count, with two levels triggered by volume thresholds.
## source_summary
- [[transformer-paper]] – Source summary of Vaswani et al. (2017) introducing the Transformer architecture and its foundations.
