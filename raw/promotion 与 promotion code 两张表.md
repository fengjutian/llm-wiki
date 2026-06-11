**Promotion 表** 是统一的促销表，通过 `promotion_type` 字段区分三种类型：
1. `promotion` - 普通促销
2. `referral_code` - 推荐码
3. `coupon_code` - 优惠券

用户问的 "promotion 与 promotion code 两张表" 实际上是：
- **Promotion 表** - 统一的促销配置表
- **Promotion Code** - 不是独立的表，而是 Order 表中的字段 `promotion_code`，用于记录订单使用的促销码

代码中的体现：
1. 前端 Form.vue 中通过 `promotiontypeOps` 定义了三种类型
2. 后端 Promotion 模型中的 `promotion_type` 字段区分类型
3. Order 表通过 `promotion_code` 字段引用 Promotion 表中的 `code` 字段

让我给出清晰的回答。
</think>

根据代码分析，这是 **两张表** 的关系，不是两张独立的表：

## 表结构关系

### 1. **Promotion 表** (统一促销表)
这是核心表，通过 `promotion_type` 字段区分 **三种业务类型**：

| promotion_type 值 | 业务含义 | 说明 |
|---|---|---|
| `promotion` | 普通促销 | 标准促销活动 |
| `referral_code` | 推荐码 | 用户推荐奖励 |
| `coupon_code` | 优惠券 | 优惠券/兑换码 |

### 2. **Order 表** 中的 `promotion_code` 字段
Order 表通过 `promotion_code` 字段 **引用** Promotion 表的 `code` 字段：

```sql
-- Order 表结构 (来自 config_tables.py)
order.promotion_code  -->  Promotion.code
```

## 代码中的体现

### 后端模型 (Promotion.py)
```python
class Promotion(AsyncBaseModel, table=True):
    __tablename__ = 'promotion'
    
    code: Optional[str] = Field(...)           # 促销代码
    promotion_type: Optional[str] = Field(...) # 区分类型: promotion/referral_code/coupon_code
    # ... 其他字段
```

### 前端配置 (Form.vue)
```javascript
const promotiontypeOps = [
    {label:'Promotion', value:'promotion'},
    {label:'Referral Code', value:'referral_code'},
    {label:'Coupon', value:'coupon_code'},
]
```

### 业务逻辑处理 (Promotion.py)
```python
# 根据 promotion_type 查询不同类型的促销
if promotion_type == 'coupon_code':
    # 处理优惠券
elif promotion_type == 'referral_code':
    # 处理推荐码
```

## 关系图

```
┌─────────────────────────────────────────────────────────┐
│                    Promotion 表                          │
│  ┌──────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │   code   │  │  promotion_type │  │  discount_type │  │
│  │  (主键)  │  │   (类型标识)     │  │   (折扣方式)    │  │
│  └────┬─────┘  └────────┬────────┘  └────────────────┘  │
│       │                  │                                │
│       │  ┌────────────────┼────────────────┐             │
│       │  │                │                │             │
│       ▼  ▼                ▼                ▼             │
│   "PROMO1"      ┌─────────┬─────────┬──────────┐        │
│                 │promotion│referral_│ coupon   │        │
│                 │         │ code    │ _code    │        │
│                 └─────────┴─────────┴──────────┘        │
└─────────────────────────────────────────────────────────┘
                         ▲
                         │  order.promotion_code
                         │
┌─────────────────────────────────────────────────────────┐
│                      Order 表                             │
│  │  id  │  customer_id  │  promotion_code  │  ... │    │
└─────────────────────────────────────────────────────────┘
```

## 总结

- **Promotion** 是统一表，**promotion_code** 是 Order 表的引用字段
- 通过 `promotion_type` 字段区分三种促销业务模式
- 使用时通过 Promotion 表的 `code` 字段与 Order 表的 `promotion_code` 字段关联