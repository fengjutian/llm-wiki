---
created_at: 2026-06-09 13:04
page_type: concept
sources:
- file: transformer-paper.md
  hash: 4e976cef4098373d6b86120b179d0b44755ea24c874200d82b37d4362232f85e
status: draft
summary: ''
title: Multi-Head Attention
updated_at: 2026-06-09 13:04
---

---
title: "Multi-Head Attention"
page_type: concept
status: active
summary: "A mechanism that linearly projects queries, keys, and values h times, allowing the model to jointly attend to information from different representation subspaces."
sources:
  - file: "transformer-paper.md"
    sections: ["Key Contributions"]
confidence: high
---

# Multi-Head Attention
**Multi-head attention** is an extension of attention in the [[Transformer]] that runs multiple attention operations in parallel. Instead of a single attention function, the model first linearly projects the queries, keys, and values *h* times, then applies attention in each of these *h* subspaces, and finally concatenates and projects the results.

## Purpose
By using multiple heads, the model can simultaneously focus on different aspects of the input (e.g., short‑range syntax, long‑range semantics) and learn different representation subspaces.

## Standard Form
```
MultiHead(Q,K,V) = Concat(head_1, ..., head_h) W^O
where head_i = Attention(Q W_i^Q, K W_i^K, V W_i^V)
```

## Application
Present in both the encoder's self-attention layers and the decoder's cross-attention layers.