---
created_at: 2026-06-09 13:01
page_type: entity
sources:
- file: mamba-paper.md
  hash: 8195958ffb0591c265f9a5e11f3f04f1185797c21eb1685b30850b6b10bfbc07
status: draft
summary: ''
title: Mamba
updated_at: 2026-06-09 13:01
---

---
title: "Mamba"
page_type: entity
status: active
summary: "A linear-time sequence modeling architecture using selective state space models and a hardware-aware parallel scan, matching Transformer performance with O(N) complexity."
sources:
  - file: "mamba-paper.md"
    sections: ["Abstract", "Key Contributions", "Relationship to Transformers", "Limitations"]
confidence: high
---

# Mamba

Mamba is a neural network architecture for sequence modeling introduced by Gu and Dao (2023). It leverages [[Selective State Spaces]] to achieve linear time complexity while matching or exceeding the performance of Transformers on various modalities.

## Core Innovations

- **Selective State Spaces**: Unlike traditional [[State Space Models]] with time-invariant dynamics, Mamba's parameters are input-dependent. This allows the model to selectively retain or discard information as it processes a sequence.
- **Hardware-Aware Algorithm**: A custom CUDA kernel uses a parallel scan to compute outputs without materializing the full state matrix, leading to 3-5x faster training than Transformers on long sequences.

## Performance

- Scales linearly with sequence length (O(N)), enabling sequences of up to 1 million tokens.
- Achieves 5x higher inference throughput for long sequences compared to Transformers.
- Matches or surpasses Transformer language models of similar size.

## Limitations

- Recurrence during inference limits direct token-to-token attention capabilities.
- Increased complexity over simpler SSMs like S4.
- Research is ongoing, and it is not yet a universal replacement for Transformers.