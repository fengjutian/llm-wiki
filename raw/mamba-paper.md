# Mamba: Linear-Time Sequence Modeling with Selective State Spaces

**Authors:** Gu and Dao, 2023

## Abstract

Foundation models are built on attention mechanisms, which scale quadratically with sequence length. We propose Mamba, a new architecture that achieves linear-time sequence modeling through selective state space models (SSMs). Mamba matches or exceeds Transformer performance across language, audio, and genomics while maintaining O(N) complexity.

## Key Contributions

1. **Selective State Spaces**: Unlike prior SSMs which used time-invariant dynamics, Mamba introduces a selection mechanism that makes SSM parameters input-dependent, allowing the model to selectively propagate or forget information along the sequence.

2. **Hardware-Aware Algorithm**: A custom CUDA kernel that avoids materializing the full state matrix, instead computing results through a parallel scan, achieving 3-5x faster training than Transformers on long sequences.

3. **Linear Scaling**: Mamba scales linearly with sequence length (O(N)) compared to the quadratic (O(N^2)) scaling of standard attention, enabling processing of extremely long sequences (up to 1M tokens).

4. **Results**: Matches or exceeds Transformers of the same size on language modeling, with 5x higher throughput during inference for long sequences.

## Relationship to Transformers

- Mamba belongs to the family of State Space Models (SSMs), which are recurrent models with linear state transitions.
- Unlike Transformers which attend to all past tokens, Mamba's selection mechanism dynamically decides what to remember.
- The architecture can be seen as combining the best of RNNs (fast inference) and Transformers (high quality).

## Limitations

- Mamba is purely recurrent during inference, making it less flexible for tasks that benefit from direct token-to-token attention.
- The selection mechanism adds complexity compared to simpler SSM variants like S4.
- Still an active area of research; no clear winner vs. Transformers across all tasks.
