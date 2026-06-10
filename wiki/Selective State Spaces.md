---
created_at: 2026-06-09 13:01
page_type: concept
sources:
- file: mamba-paper.md
  hash: 8195958ffb0591c265f9a5e11f3f04f1185797c21eb1685b30850b6b10bfbc07
status: draft
summary: ''
title: Selective State Spaces
updated_at: 2026-06-09 13:01
---

---
title: "Selective State Spaces"
page_type: concept
status: active
summary: "A mechanism that makes state space model parameters input-dependent, allowing selective information propagation or forgetting along a sequence."
sources:
  - file: "mamba-paper.md"
    sections: ["Key Contributions"]
confidence: high
---

# Selective State Spaces

Selective state spaces are a core innovation of the [[Mamba]] architecture. They transform traditional [[State Space Models]] by making key parameters functions of the input at each time step.

## Mechanism

- Instead of fixed state transition matrices, the model computes parameters based on the current token.
- This allows the model to **dynamically decide** which information to keep or discard as it processes the sequence.
- Enables content-aware reasoning without the quadratic cost of full self-attention.

## Impact

- Brings the quality benefits of attention mechanisms (selective focus) to recurrent models.
- Facilitates efficient long-sequence processing (O(N) complexity).
- Underpins Mamba’s strong performance across language, audio, and genomics tasks.