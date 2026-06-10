---
created_at: 2026-06-09 13:01
page_type: concept
sources:
- file: mamba-paper.md
  hash: 8195958ffb0591c265f9a5e11f3f04f1185797c21eb1685b30850b6b10bfbc07
status: draft
summary: ''
title: State Space Models
updated_at: 2026-06-09 13:01
---

---
title: "State Space Models"
page_type: concept
status: active
summary: "Recurrent models with linear state transitions used for sequence modeling; prior to Mamba, SSMs used time-invariant dynamics."
sources:
  - file: "mamba-paper.md"
    sections: ["Abstract", "Relationship to Transformers"]
confidence: high
---

# State Space Models

State Space Models (SSMs) are a class of recurrent neural network models defined by linear state transitions. They are used for sequence modeling tasks, offering theoretical advantages in capturing long-range dependencies.

## Characteristics

- Recurrent nature: each step's state is computed from the previous state and the current input.
- Traditional SSMs (e.g., S4) employ time-invariant dynamics: the transition parameters are fixed across sequence positions.
- They serve as the foundation for [[Mamba]] and its [[Selective State Spaces]].

## Relation to Mamba

Mamba extends SSMs by introducing input-dependent parameters (selectivity), addressing limitations of fixed dynamics while retaining the efficient linear scaling.