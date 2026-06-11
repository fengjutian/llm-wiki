---
created_at: 2026-06-11 09:07
page_type: entity
sources:
- file: UnitOfWork 解释.md
  hash: defbf23f1c2f7ca8a75cc58aaa510ff5ed054fd61d1c33a0d26988800e8251fd
status: draft
summary: ''
title: AsyncUnitOfWork
updated_at: 2026-06-11 09:07
---

---
title: "AsyncUnitOfWork"
page_type: entity
status: active
summary: "A class in backend/core/uow.py that encapsulates an SQLModel AsyncSession for database operations, supporting nested transactions."
sources:
  - file: "UnitOfWork 解释.md"
    hash: ""
    sections: ["1. `AsyncUnitOfWork` — 工作单元封装"]
confidence: high
---

# AsyncUnitOfWork

`AsyncUnitOfWork` is a Python class that implements the Unit of Work pattern for managing database transactions in an asynchronous context. It holds a reference to an SQLModel `AsyncSession`.

## Attributes and Methods
- `self.session`: the SQLModel `AsyncSession`.
- `self._tx`: tracks the current transaction.
- `self._depth`: tracks nested transaction depth.
- `begin()`: starts a transaction (supports nesting).
- `commit()`: commits the current level transaction.
- `rollback()`: rolls back the current transaction.

## Usage
Instances are created by the `get_uow` dependency function and injected into FastAPI routes via the [[UnitOfWork type alias]].

## See Also
- [[get_uow]]
- [[UnitOfWork type alias]]
- [[FastAPI Dependency Injection Alias Pattern]]