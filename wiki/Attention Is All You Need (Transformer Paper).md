---
created_at: 2026-06-09 13:04
page_type: source_summary
sources:
- file: transformer-paper.md
  hash: 4e976cef4098373d6b86120b179d0b44755ea24c874200d82b37d4362232f85e
status: draft
summary: ''
title: Attention Is All You Need (Transformer Paper)
updated_at: 2026-06-09 13:04
---

---
title: "Attention Is All You Need (Transformer Paper)"
page_type: source_summary
status: active
summary: "The original paper by Vaswani et al. (2017) introducing the Transformer architecture based solely on attention mechanisms."
sources:
  - file: "transformer-paper.md"
    sections: ["全部"]
confidence: high
---

# Attention Is All You Need

**Authors:** Vaswani et al., 2017

## Abstract
> The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.

## Key Contributions
1. **Self-Attention**: The Transformer uses self-attention to compute representations of a sequence by relating different positions of the same sequence.
2. **Multi-Head Attention**: Instead of performing a single attention function, the model linearly projects queries, keys, and values h times, allowing the model to jointly attend to information from different representation subspaces.
3. **Positional Encoding**: Since the model contains no recurrence, it injects information about the relative or absolute position of tokens through sinusoidal position encodings.
4. **Results**: Achieved 28.4 BLEU on WMT 2014 English-to-German translation, outperforming the previous best results by over 2 BLEU.

## Architecture
- **Encoder**: 6 identical layers, each with a multi-head self-attention mechanism and a position-wise feed-forward network.
- **Decoder**: 6 identical layers, each with masked multi-head self-attention, multi-head cross-attention over encoder output, and feed-forward network.
- **Training**: Trained on 8 NVIDIA P100 GPUs for 12 hours (big model).

## Impact
The Transformer architecture became the foundation for virtually all subsequent state-of-the-art NLP models, including BERT, GPT, T5, and their variants. The paper has been cited over 100,000 times.