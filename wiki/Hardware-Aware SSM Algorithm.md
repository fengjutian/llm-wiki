---
created_at: 2026-06-09 13:01
page_type: concept
sources:
- file: mamba-paper.md
  hash: 8195958ffb0591c265f9a5e11f3f04f1185797c21eb1685b30850b6b10bfbc07
status: draft
summary: ''
title: Hardware-Aware SSM Algorithm
updated_at: 2026-06-09 13:01
---

---
title: "Hardware-Aware SSM Algorithm"
page_type: concept
status: active
summary: "A custom CUDA kernel that computes state space model outputs via parallel scan without materializing the full state matrix, achieving 3-5x faster training on long sequences."
sources:
  - file: "mamba-paper.md"
    sections: ["Key Contributions"]
confidence: high
---

# Hardware-Aware SSM Algorithm

To realize the theoretical efficiency of selective state spaces, Mamba employs a hardware-aware algorithm implemented as a custom CUDA kernel.

## Key Idea

- Instead of storing the full state matrix (size proportional to sequence length × state dimension), the algorithm uses a **parallel scan** to compute outputs.
- This avoids large memory allocations and exploits GPU parallelism.

## Performance

- Achieves 3–5× faster training than standard Transformer implementations on long sequences.
- Enables the practical use of extremely long contexts (up to 1 million tokens) that are infeasible with quadratic attention.

## Relation to Mamba

This algorithm is an integral part of the [[Mamba]] architecture, making its linear-time theoretical property realizable in practice.