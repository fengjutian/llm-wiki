## `UnitOfWork` 解释

```python
UnitOfWork = Annotated[AsyncUnitOfWork, Depends(get_uow)]
```

这是一个 **FastAPI 依赖注入类型别名**，其作用和含义如下：

---

### 1. `AsyncUnitOfWork` — 工作单元封装

`AsyncUnitOfWork` 是一个封装数据库会话的事务管理器，位于 `backend/core/uow.py`：

| 核心属性/方法 | 作用 |
|---|---|
| `self.session` | 持有 SQLModel 的 `AsyncSession`，用于所有数据库操作 |
| `self._tx` / `self._depth` | 跟踪嵌套事务，支持嵌套 `begin()`/`commit()` |
| `begin()` | 开始事务（支持嵌套） |
| `commit()` | 提交当前层级事务 |
| `rollback()` | 回滚事务 |

---

### 2. `get_uow` — FastAPI 依赖供应函数

```python python utils/api/uow.py
async def get_uow(session: AsyncSession = Depends(get_session)):
    uow = AsyncUnitOfWork(session)
    try:
        yield uow
    finally:
        if uow.in_transaction:
            await uow.rollback()
```

**关键点**：当请求结束后，无论成功还是异常，`finally` 块都会确保事务被回滚，防止数据库连接泄漏。

---

### 3. `Annotated[AsyncUnitOfWork, Depends(get_uow)]` — 依赖注入类型别名

这是 **Python `typing.Annotated`** + **FastAPI `Depends`** 的组合：

```
┌─────────────────────────────────────────────────────┐
│  Annotated[AsyncUnitOfWork, Depends(get_uow)]        │
│  │           │                  │                    │
│  │           │                  └── FastAPI 依赖提供者 │
│  │           │                      自动解析 session   │
│  │           └── 基础类型 = "当作 AsyncUnitOfWork 用"    │
│  └── 允许添加元数据的类型包装器                         │
└─────────────────────────────────────────────────────┘
```

**实际效果**：

```python
# 在 FastAPI 路由中直接注入使用
@router.post("/orders")
async def create_order(uow: UnitOfWork):  # ✅ 自动注入
    repo = OrderRepo(uow.session)         # ✅ 类型是 AsyncUnitOfWork
    await repo.create(...)
```

**对比不使用 Annotated 的写法**：
```python
# 传统写法
async def create_order(uow: AsyncUnitOfWork = Depends(get_uow)):
    ...

# 使用 TypeAlias（少了 Depends 的类型信息）
UnitOfWork: TypeAlias = AsyncUnitOfWork
async def create_order(uow: UnitOfWork = Depends(get_uow)):
    ...
```

---

### 总结

| 概念 | 说明 |
|---|---|
| **`UnitOfWork`** | 暴露给路由/服务层的类型别名 |
| **`AsyncUnitOfWork`** | 核心工作单元类，管理 session 和事务 |
| **`get_uow`** | FastAPI 依赖函数，自动获取 session 并保证事务安全 |
| **`Annotated[ ..., Depends(...)]`** | FastAPI 类型注解，告诉路由"自动注入什么依赖" |

这是典型的 **Repository + Unit of Work** 模式在 FastAPI 异步应用中的实现。