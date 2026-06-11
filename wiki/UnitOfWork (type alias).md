---
created_at: 2026-06-11 09:07
page_type: entity
sources:
- file: UnitOfWork 解释.md
  hash: defbf23f1c2f7ca8a75cc58aaa510ff5ed054fd61d1c33a0d26988800e8251fd
status: draft
summary: ''
title: UnitOfWork (type alias)
updated_at: 2026-06-11 09:07
---

---
title: "UnitOfWork (type alias)"
page_type: entity
status: active
summary: "A FastAPI dependency injection type alias: `Annotated[AsyncUnitOfWork, Depends(get_uow)]`, used to inject a unit of work into routes."
sources:
  - file: "UnitOfWork 解释.md"
    hash: ""
    sections: ["3. `Annotated[AsyncUnitOfWork, Depends(get_uow)]` — 依赖注入类型别名"]
confidence: high
---

# UnitOfWork (type alias)

`UnitOfWork` is defined as:
```python
UnitOfWork = Annotated[AsyncUnitOfWork, Depends(get_uow)]
```

This combines the base type `AsyncUnitOfWork` with FastAPI's dependency injection metadata, allowing use in route handlers as:
```python
async def create_order(uow: UnitOfWork):
    ...
```

## Rationale
Without this alias, every route would need to write:
```python
async def create_order(uow: AsyncUnitOfWork = Depends(get_uow)):
    ...
```
Using `Annotated` encapsulates the dependency, making routes cleaner and DRY.

## See Also
- [[AsyncUnitOfWork]]
- [[get_uow]]
- [[FastAPI Dependency Injection Alias Pattern]]