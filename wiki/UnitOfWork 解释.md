---
created_at: 2026-06-11 09:07
page_type: source_summary
sources:
- file: UnitOfWork 解释.md
  hash: defbf23f1c2f7ca8a75cc58aaa510ff5ed054fd61d1c33a0d26988800e8251fd
status: draft
summary: ''
title: UnitOfWork 解释
updated_at: 2026-06-11 09:07
---

---
title: "UnitOfWork 解释"
page_type: source_summary
status: active
summary: "Explains the FastAPI dependency injection type alias `UnitOfWork = Annotated[AsyncUnitOfWork, Depends(get_uow)]` and its components."
sources:
  - file: "UnitOfWork 解释.md"
    hash: ""
confidence: high
---

# UnitOfWork 解释

This document describes the `UnitOfWork` type alias used in the backend for managing database transactions via FastAPI dependency injection.

## Explanation

- `AsyncUnitOfWork`: a class in `backend/core/uow.py` that holds an SQLModel `AsyncSession` and supports nested transactions.
- `get_uow`: a FastAPI dependency function in `utils/api/uow.py` that creates an `AsyncUnitOfWork`, yields it, and ensures rollback on failure.
- `UnitOfWork`: defined as `Annotated[AsyncUnitOfWork, Depends(get_uow)]`, allowing FastAPI to inject the unit of work into routes without repeating `Depends(get_uow)`.

## Key Points
- Pattern combines `typing.Annotated` with FastAPI's `Depends`.
- Simplifies route signatures: instead of `uow: AsyncUnitOfWork = Depends(get_uow)`, just write `uow: UnitOfWork`.
- Transaction safety: `finally` block in `get_uow` ensures rollback if transaction still open.

## See Also
- [[AsyncUnitOfWork]]
- [[get_uow]]
- [[UnitOfWork type alias]]
- [[FastAPI Dependency Injection Alias Pattern]]