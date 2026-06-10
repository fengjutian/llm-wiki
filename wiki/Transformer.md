---
created_at: 2026-06-09 13:04
page_type: entity
sources:
- file: transformer-paper.md
  hash: 4e976cef4098373d6b86120b179d0b44755ea24c874200d82b37d4362232f85e
status: draft
summary: ''
title: Transformer
updated_at: 2026-06-09 13:04
---

---
title: "Transformer"
page_type: entity
status: active
summary: "A neural network architecture based solely on attention mechanisms, introduced by Vaswani et al. (2017), achieving state-of-the-art on machine translation."
sources:
  - file: "transformer-paper.md"
    sections: ["Abstract", "Key Contributions", "Architecture", "Impact"]
confidence: high
---

# Transformer

The **Transformer** is a neural network architecture introduced in the paper "Attention Is All You Need" (Vaswani et al., 2017). It relies entirely on attention mechanisms, eliminating recurrence and convolution.

## Architecture
- **Encoder**: 6 identical layers, each consisting of a [[Multi-Head Attention|multi-head self-attention]] mechanism and a position-wise feed-forward network.
- **Decoder**: 6 identical layers, each with a masked multi-head self-attention, a multi-head cross-attention over the encoder output, and a feed-forward network.
- **Positional Encoding**: Since the model has no recurrence, it adds sinusoidal positional encodings to the input embeddings to capture sequence order.

## Key Features
- [[Self-Attention]]: Relates every position in a sequence to all other positions to compute a representation of the sequence.
- [[Multi-Head Attention]]: Performs attention in multiple representation subspaces, improving the model's ability to focus on different aspects of the input.
- [[Positional Encoding]]: Injects information about token positions.

## Results
- Achieved 28.4 BLEU on the WMT 2014 English-to-German translation task, surpassing the previous state of the art by more than 2 BLEU.
- Trained on 8 NVIDIA P100 GPUs for 12 hours (big model).

## Impact
The Transformer became the foundation for virtually all subsequent state-of-the-art NLP models, including BERT, GPT, T5, and their many variants. The original paper has been cited over 100,000 times.