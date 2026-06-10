---
created_at: 2026-06-09 13:04
page_type: concept
sources:
- file: transformer-paper.md
  hash: 4e976cef4098373d6b86120b179d0b44755ea24c874200d82b37d4362232f85e
status: draft
summary: ''
title: Positional Encoding
updated_at: 2026-06-09 13:04
---

---
title: "Positional Encoding"
page_type: concept
status: active
summary: "A method to inject information about token position into a non-recurrent model using sinusoidal functions."
sources:
  - file: "transformer-paper.md"
    sections: ["Key Contributions"]
confidence: high
---

# Positional Encoding
Because the [[Transformer]] contains no recurrence, it has no inherent notion of token order. **Positional encodings**—added directly to the input embeddings—provide this information.

## Sinusoidal Encoding
The original Transformer uses fixed sinusoidal functions of different frequencies:

```
PE(pos, 2i)   = sin(pos / 10000^(2i/d_model))
PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))
```
where `pos` is the position and `i` indexes the dimension.

These encodings allow the model to reason about relative positions and learn sequence order without recurrence.