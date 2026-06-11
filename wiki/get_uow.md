---
created_at: 2026-06-11 09:07
page_type: entity
sources:
- file: UnitOfWork 解释.md
  hash: defbf23f1c2f7ca8a75cc58aaa510ff5ed054fd61d1c33a0d26988800e8251fd
status: draft
summary: ''
title: get_uow
updated_at: 2026-06-11 09:07
---

---
title: "get_uow"
page_type: entity
status: active
summary: "A FastAPI dependency provider function in utils/api/uow.py that yields an AsyncUnitOfWork and ensures transaction rollback on failure."
sources:
  - file: "UnitOfWork 解释.md"
    hash: ""
    sections: ["2. `get_uow` — FastAPI 依赖供应函数"]
confidence: high
---

# get_uow

`get_uow` is a FastAPI dependency function defined in `utils/api/uow.py`. It provides an `AsyncUnitOfWork` instance to request handlers, ensuring proper cleanup of transactions.

## Implementation
```python
async def get_uow(session: AsyncSession = Depends(get_session)):
    uow = AsyncUnitOfWork(session)
    try:
        yield uow
    finally:
        if uow.in_transaction:
            await uow.rollback()
```

## Key Points
- Receives an `AsyncSession` via `get_session` dependency.
- Yields the `AsyncUnitOfWork` for the request handler.
- In the `finally` block, if the transaction is still active (e.g., due to an unhandled exception), it is rolled back to prevent connection leakage.

## Usage
Used in combination with `Annotated` to create the `UnitOfWork` type alias.

## See Also
- [[AsyncUnitOfWork]]
- [[UnitOfWork type alias]]