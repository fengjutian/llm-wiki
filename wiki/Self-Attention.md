---
created_at: 2026-06-09 13:04
page_type: concept
sources:
- file: transformer-paper.md
  hash: 4e976cef4098373d6b86120b179d0b44755ea24c874200d82b37d4362232f85e
status: draft
summary: ''
title: Self-Attention
updated_at: 2026-06-09 13:04
---

---
title: "Self-Attention"
page_type: concept
status: active
summary: "A mechanism that computes representations of a sequence by relating different positions of the same sequence, central to the Transformer architecture."
sources:
  - file: "transformer-paper.md"
    sections: ["Key Contributions"]
confidence: high
---

# Self-Attention
**Self-attention** (also called intra-attention) is an attention mechanism used in the [[Transformer]] architecture. It computes an output representation for each position in a sequence by relating that position to every other position in the same sequence.

## How It Works
The core idea is to allow each token to attend to all other tokens in the input, generating context-aware representations. Queries, keys, and values are all derived from the same input sequence.

## Role in the Transformer
- In the encoder, self-attention layers help each position attend to all positions in the input sentence.
- In the decoder, a masked variant prevents attending to future positions, preserving autoregressive generation.

## Significance
Self-attention replaces recurrent and convolutional layers, enabling parallel computation across positions and direct modeling of long-range dependencies.