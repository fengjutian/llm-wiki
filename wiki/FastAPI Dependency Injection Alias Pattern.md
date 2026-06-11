---
created_at: 2026-06-11 09:07
page_type: concept
sources:
- file: UnitOfWork 解释.md
  hash: defbf23f1c2f7ca8a75cc58aaa510ff5ed054fd61d1c33a0d26988800e8251fd
status: draft
summary: ''
title: FastAPI Dependency Injection Alias Pattern
updated_at: 2026-06-11 09:07
---

---
title: "FastAPI Dependency Injection Alias Pattern"
page_type: concept
status: active
summary: "Using Python's typing.Annotated with FastAPI's Depends to create reusable dependency type aliases that reduce boilerplate in route signatures."
sources:
  - file: "UnitOfWork 解释.md"
    sections: ["3. `Annotated[AsyncUnitOfWork, Depends(get_uow)]` — 依赖注入类型别名"]
confidence: high
---

# FastAPI Dependency Injection Alias Pattern

This pattern leverages Python's `typing.Annotated` (introduced in Python 3.9) to embed FastAPI dependency information directly into a type alias. Instead of repeating `Depends(...)` in every route, the dependency is attached to the type.

## Structure
```python
MyDep = Annotated[BaseType, Depends(dependency_callable)]
```

## Usage
```python
@router.post("/items")
async def create_item(dep: MyDep):
    # dep is of type BaseType, injected via dependency_callable
    ...
```

## Benefits
- Reduces repetition in route signatures.
- Centralizes dependency definition.
- Improves readability when many routes use the same dependency.

## Example in This Project
- [[UnitOfWork type alias]]: `UnitOfWork = Annotated[AsyncUnitOfWork, Depends(get_uow)]`

## See Also
- [[AsyncUnitOfWork]]
- [[get_uow]]