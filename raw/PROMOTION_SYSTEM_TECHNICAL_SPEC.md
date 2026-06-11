# Promotion 促销管理系统 - 技术说明文档

> 生成时间: 2025-06-02  
> 功能模块: 促销管理 (Promotion Management)  
> 涉及系统: qb2025 后端 + 前端

---

## 1. 功能概述

促销管理系统用于管理营销促销活动，支持多种折扣类型和复杂的促销条件配置。

### 1.1 核心功能

| 功能 | 说明 |
|------|------|
| 促销列表 | 分页展示所有促销活动，支持搜索过滤 |
| 创建促销 | 配置促销基本信息、折扣类型、条件规则 |
| 编辑促销 | 修改促销配置 |
| 复制促销 | 复制已有促销快速创建新促销 |
| 删除促销 | 删除未使用过的促销 |
| 激活/失效 | 通过 Switch 控制促销是否生效 |
| 导出CSV | 导出促销列表数据 |

### 1.2 促销类型 (promotion_type)

| 类型 | 值 | 说明 |
|------|-----|------|
| Promotion | `promotion` | 普通促销活动 |
| Referral Code | `referral_code` | 推荐码（用于老用户推荐新用户） |
| Coupon | `coupon_code` | 优惠券（发放给用户的优惠券） |

---

## 2. 数据模型

### 2.1 数据库表结构

```
┌─────────────────────────────────────────────────────────────────┐
│                      promotion                                   │
├─────────────────────────────────────────────────────────────────┤
│ id                 | int          | 主键                       │
│ code               | varchar(50)   | 促销代码（唯一标识）         │
│ name               | varchar(100)  | 促销名称/描述               │
│ group              | varchar(100)  | 分组                        │
│ promotion_type     | varchar(50)   | 促销类型                   │
│ discount_type      | varchar(20)   | 折扣类型                   │
│ discount_value     | decimal(8,2)  | 折扣值                     │
│ start_date         | date          | 开始日期                   │
│ end_date           | date          | 结束日期                   │
│ is_expired         | tinyint(1)    | 是否过期（0/1）           │
│ is_auto            | tinyint(1)    | 是否自动应用（0/1）        │
│ ui_data            | json          | UI配置数据                 │
│ quantity           | int           | 使用次数限制（0=无限）      │
│ inactive           | tinyint(1)    | 是否激活（1=激活,0=失效）  │
│ created_by         | int           | 创建人                     │
│ created_at         | datetime      | 创建时间                   │
│ updated_by         | int           | 更新人                     │
│ updated_at         | datetime      | 更新时间                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    promotion_condition                           │
├─────────────────────────────────────────────────────────────────┤
│ id                 | int          | 主键                       │
│ promotion_id       | int          | 关联促销ID（外键）         │
│ parent_id          | int          | 父节点ID（树形结构）        │
│ condition_type     | varchar(50)  | 条件类型                   │
│ condition_value    | json         | 条件值                     │
│ operator           | varchar(10)  | 操作符（AND/OR）           │
│ is_group           | tinyint(1)   | 是否为条件组（0/1）        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     promotion_tier                               │
├─────────────────────────────────────────────────────────────────┤
│ id                 | int          | 主键                       │
│ promotion_id       | int          | 关联促销ID（外键）         │
│ min_price          | decimal(8,2) | 最小金额门槛               │
│ max_price          | decimal(8,2) | 最大金额门槛               │
│ discount_type      | varchar(20)  | 折扣类型                   │
│ discount_value     | decimal(8,2) | 折扣值                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     promotion_usage                              │
├─────────────────────────────────────────────────────────────────┤
│ id                 | int          | 主键                       │
│ promotion_id       | int          | 关联促销ID（外键）         │
│ customer_id        | int          | 使用客户ID（外键）         │
│ order_id           | int          | 使用订单ID（外键）         │
│ use_data           | json         | 使用详情数据               │
│ created_at         | datetime     | 使用时间                   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 ORM 模型

**文件**: `qb2025_backend/backend/models/Promotion.py`

```python
class Promotion(AsyncBaseModel, TimestampMixin, table=True):
    __tablename__ = 'promotion'
    
    # 核心字段
    code: str                      # 促销代码
    name: str                       # 名称描述
    group: str                       # 分组
    promotion_type: str             # 促销类型
    discount_type: str               # 折扣类型
    discount_value: Decimal          # 折扣值
    start_date: date                 # 开始日期
    end_date: date                   # 结束日期
    is_auto: int                     # 是否自动应用
    quantity: int                    # 使用次数限制
    inactive: int = 1               # 激活状态（1=激活）
    
    # 关联
    promotion_conditions: List["PromotionCondition"]
    promotion_tiers: List["PromotionTier"]
```

---

## 3. 折扣类型详解

### 3.1 折扣类型枚举

**文件**: `qb2025_backend/backend/schemas/promotion.py`

```python
class DiscountType(Enum):
    percent = 'percent'      # 百分比折扣
    fixed = 'fixed'          # 固定金额折扣
    tier = 'tier'            # 分层折扣
    per_fixed = 'per_fixed'  # 每件固定金额
```

### 3.2 各折扣类型说明

| 折扣类型 | 值 | 计算方式 | 前端显示 |
|---------|-----|---------|---------|
| **percent** | `percent` | 按百分比减免 | `X %` |
| **fixed** | `fixed` | 固定金额减免（按商品比例分摊） | `$ X USD` |
| **per_fixed** | `per_fixed` | 每件商品减免固定金额 × 数量 | `$ X USD` |
| **tier** | `tier` | 按金额区间应用不同折扣 | 弹出层显示Tier列表 |

### 3.3 Tier 分层折扣数据结构

```javascript
// tier 数据结构
[
  {
    min_price: Decimal,      // 最小金额门槛
    max_price: Decimal,      // 最大金额门槛（null表示无上限）
    discount_type: string,    // 'percent' 或 'fixed' / 'per_fixed'
    discount_value: Decimal   // 折扣值
  },
  // ... 更多层级
]
```

### 3.4 前端折扣展示代码

**文件**: `qb2025_frontend/src/views/admin/promotion/Index.vue` (31-53行)

```vue
<template #discount="{ row }">
  <!-- 百分比折扣 -->
  <el-tag v-if="row.discount_type=='percent'" type="primary">
    {{row.discount_value}} %
  </el-tag>
  
  <!-- 固定金额折扣 -->
  <el-tag v-else-if="row.discount_type=='fixed'" type="success">
    $ {{row.discount_value}} USD
  </el-tag>
  
  <!-- 每件固定金额 -->
  <el-tag v-else-if="row.discount_type=='per_fixed'" type="success">
    $ {{row.discount_value}} USD
  </el-tag>
  
  <!-- 分层折扣 - 弹出层展示 -->
  <el-popover v-else-if="row.discount_type=='tier'" popper-style="width:unset;">
    <table class="show_tier">
      <tr v-for="(item,index) in row.tier">
        <td>
          <span>Tier {{ index+1 }}</span>
          <span>$ {{ item.max_price }} USD,</span>
          <span v-if="item.discount_type=='percent'"> {{ item.discount_value }}%</span>
          <span v-else>$ {{ item.discount_value }} USD</span>
        </td>
      </tr>
    </table>
    <template #reference>
      <el-link type="primary"><u><i>Tier Discount</i></u></el-link>
    </template>
  </el-popover>
</template>
```

---

## 4. API 接口

### 4.1 接口列表

| 方法 | 路径 | 功能 | 请求体/参数 |
|------|------|------|------------|
| POST | `/backend/promotion/list` | 获取促销列表 | `{page, pagesize, filters...}` |
| POST | `/backend/promotion/add` | 创建促销 | `PromotionRequest` |
| POST | `/backend/promotion/edit` | 编辑促销(获取详情) | `query_id` |
| PUT | `/backend/promotion/update` | 更新促销 | `PromotionRequest` |
| DELETE | `/backend/promotion/delete` | 删除促销 | `query_id` |
| POST | `/backend/promotion/inactive/{id}` | 设置激活状态 | `{inactive: 0|1}` |
| POST | `/backend/promotion/condition_types` | 获取条件类型配置 | - |
| GET | `/backend/promotion/download` | 导出CSV | query params |

### 4.2 请求/响应模型

**文件**: `qb2025_backend/backend/schemas/promotion.py`

```python
class PromotionRequest(StrictModel):
    id: Optional[int] = None
    condition: ConditionLeaf              # 条件树
    tier: Optional[List[TierCreate]] = None # Tier配置（仅tier类型）
    code: str                              # 促销代码
    name: str                               # 描述
    group: str                              # 分组
    promotion_type: str                     # 促销类型
    discount_type: DiscountType             # 折扣类型
    discount_value: Optional[Decimal] = None # 折扣值
    start_date: date                        # 开始日期
    end_date: date                          # 结束日期
    is_auto: int                            # 是否自动
    quantity: int                           # 数量限制
    inactive: Optional[int] = 1             # 是否激活
    ui_data: Dict[str, Any]                 # UI数据
```

### 4.3 路由定义

**文件**: `qb2025_backend/routers/v1/backend/promotion.py`

```python
@router.post("/backend/promotion/list")
async def getPromotion(uow: UnitOfWork, query: dict | None = None):
    return await PromotionService(uow).paginate(query)

@router.post("/backend/promotion/add")
async def add(uow: UnitOfWork, query: PromotionRequest):
    return {'data': await PromotionService(uow).create(query)}

@router.post("/backend/promotion/edit")
async def edit(uow: UnitOfWork, query_id: int):
    return await PromotionService(uow).view(query_id)

@router.put("/backend/promotion/update")
async def add(uow: UnitOfWork, query: PromotionRequest):
    return await PromotionService(uow).update(query)

@router.delete("/backend/promotion/delete")
async def delete(uow: UnitOfWork, query_id: int):
    return await PromotionService(uow).delete(query_id)

@router.post("/backend/promotion/inactive/{promotion_id}")
async def set_promotion_inactive(promotion_id: int, uow: UnitOfWork, request: Request):
    body = await request.json()
    inactive = body.get("inactive")
    return await PromotionService(uow).set_inactive(promotion_id, inactive)
```

---

## 5. 业务逻辑

### 5.1 Service 层核心方法

**文件**: `qb2025_backend/backend/services/Promotion.py`

```python
class PromotionService:
    
    # === 基础CRUD ===
    async def paginate(self, query: Dict)           # 分页查询
    async def create(self, query: PromotionRequest)  # 创建促销
    async def update(self, query: PromotionRequest)  # 更新促销
    async def delete(self, id: str)                   # 删除促销
    async def view(self, promotion_id: int)          # 获取详情
    
    # === 状态控制 ===
    async def set_inactive(self, promotion_id, inactive)  # 设置激活状态
    
    # === 促销应用 ===
    async def get_promotion(...)                      # 获取适用的自动促销
    async def get_coupon(...)                         # 获取可用优惠券
    async def use_code(...)                           # 使用促销码
    async def use_referral_code(...)                  # 使用推荐码
    async def use_coupon_code(...)                   # 使用优惠券码
    
    # === 折扣计算 ===
    async def calculate_discount(...)                # 计算折扣
    async def get_matched_pid(...)                    # 获取匹配产品索引
    
    # === 导出 ===
    async def export_download(...)                    # 导出CSV
```

### 5.2 折扣计算逻辑

```python
async def calculate_discount(self, items, promotion, ...):
    """
    折扣计算主流程：
    
    1. 获取匹配的产品索引
    2. 根据 discount_type 应用不同折扣
    
    折扣类型处理:
    ┌─────────────────────────────────────────────────────────────┐
    │ percent:                                                    │
    │   - 计算: item_price × discount_value / 100 × quantity     │
    │   - 有限量: 按 quantity 限制                                 │
    │   - 无限量: 按商品全额折扣                                    │
    ├─────────────────────────────────────────────────────────────┤
    │ fixed:                                                      │
    │   - 计算: min(discount_value, subtotal)                    │
    │   - 按商品金额比例分摊到各产品                                │
    ├─────────────────────────────────────────────────────────────┤
    │ per_fixed:                                                  │
    │   - 计算: discount_value × quantity                         │
    │   - is_bp产品: 仅计算一次                                    │
    ├─────────────────────────────────────────────────────────────┤
    │ tier:                                                       │
    │   - 按金额区间匹配 tier                                     │
    │   - 应用匹配 tier 的折扣规则                                 │
    └─────────────────────────────────────────────────────────────┘
    """
```

### 5.3 促销条件匹配

```python
async def get_matched_pid(self, items, promotion, ...):
    """
    匹配逻辑:
    
    1. 构建条件树（AND/OR 组合）
    2. 遍历购物车商品
    3. 构建上下文（客户信息、商品信息）
    4. 使用 ConditionFactory 评估条件
    5. 返回匹配的商品索引列表
    """
```

---

## 6. 前端实现

### 6.1 文件结构

```
qb2025_frontend/src/
├── api/
│   └── promotion.js          # API 调用
└── views/admin/
    └── promotion/
        ├── Index.vue         # 列表页（当前分析文件）
        ├── Form.vue          # 创建/编辑表单
        ├── FilterGroup.vue   # 筛选组件
        └── FieldChain.vue    # 字段链组件
```

### 6.2 API 调用

**文件**: `qb2025_frontend/src/api/promotion.js`

```javascript
export const getList = (data) => request.post("/backend/promotion/list", data);
export const add = (data) => request.post("/backend/promotion/add", data);
export const update = (data) => request.put("/backend/promotion/update", data);
export const getMsg = (id) => request.post(`/backend/promotion/edit?query_id=${id}`);
export const del = (id) => request.delete(`/backend/promotion/delete?query_id=${id}`);
export const setInactive = (id, inactive) => 
    request.post(`/backend/promotion/inactive/${id}`, { inactive });
export const getCondition = () => request.post("/backend/promotion/condition_types");
```

### 6.3 列表页核心功能

**文件**: `qb2025_frontend/src/views/admin/promotion/Index.vue`

```javascript
// 搜索字段配置
const search = [
  { field: 'promotion_code', label: 'Promotion Code' },
  { field: 'service', label: 'Service', type: 'el-select', options: [] },
  { field: 'customer', label: 'Customer', type: 'el-select', options: [] },
  { field: 'region', label: 'Region', type: 'el-select', options: [] },
  { type: 'el-date-picker-range', field: 'created_at', label: 'Date' },
  { field: 'group', label: 'Group' },
]

// 激活状态切换（带确认）
const handleInactiveClick = async (row) => {
  const targetInactive = row.inactive === 0 ? 1 : 0
  const actionText = targetInactive === 1 ? 'Active' : 'Inactive'
  
  await ElMessageBox.confirm(
    `Are you sure you want to ${actionText} this promotion?`,
    'Warning'
  )
  
  row.inactive = targetInactive
  await setInactive(row.id, targetInactive)
  ElMessage.success(`${actionText} completed`)
}
```

---

## 7. 促销条件系统

### 7.1 条件类型

| 条件类型 | 说明 | 条件值示例 |
|---------|------|-----------|
| `category_id` | 按服务类别 | `[1, 2, 3]` |
| `customer_id` | 按客户 | `[100]` |
| `region_id` | 按区域 | `[1, 2]` |
| `country` | 按国家 | `[1]` |
| `state` | 按州/省 | `[1]` |
| `city` | 按城市 | `[1]` |
| `new_reg_customer` | 新注册客户 | `true/false` |
| `new_service_line_customer` | 新服务线客户 | `true/false` |
| `new_product_customer` | 新产品客户 | `true/false` |

### 7.2 条件树结构

```python
class ConditionLeaf(StrictModel):
    operator: Optional[str] = None    # 'AND' / 'OR'
    children: Optional[List['ConditionLeaf']] = None
    condition_type: Optional[str] = None
    condition_value: Optional[Any] = None
    is_group: Optional[int] = 0      # 1=条件组，0=叶子节点
```

---

## 8. Repository 层

**文件**: `qb2025_backend/backend/repository/Promotion.py`

### 8.1 主要查询方法

```python
class PromotionRepo(BaseRepository[Promotion]):
    
    async def find(self, query: Dict)           # 按条件查找
    async def paginate(self, query: Dict)       # 分页查询（支持多条件过滤）
    async def find_coupon(self) -> Dict         # 获取优惠券规则
    async def find_referral(self)               # 获取推荐码规则
    async def all_auto_promotion()              # 获取所有自动应用促销
    async def get_export_stmt(self, query)      # 获取导出SQL语句
    
class PromotionConditionRepo(BaseRepository[PromotionCondition]):
    async def delete_by_promotion_id(promotion_id)  # 删除条件
    
class PromotionTierRepo(BaseRepository[PromotionTier]):
    async def delete_by_promotion_id(promotion_id)  # 删除Tier配置
    
class PromotionUsageRepo(BaseRepository[PromotionUsage]):
    async def delete_from_order(order_id)       # 订单删除时清理
```

---

## 9. 错误处理

**文件**: `qb2025_backend/config/error_code/promotion.py`

| 错误码 | 消息 | 说明 |
|-------|------|------|
| `PROMOTION_NOT_FOUND` | Promotion not found | 促销不存在 |
| `PROMOTION_EXPIRED` | Promotion is expired | 促销已过期 |
| `PROMOTION_DATE_ERROR` | Date error | 日期范围错误 |
| `PROMOTION_PERCENT_ERROR` | Percent error | 百分比超100 |
| `TIER_CONFIG_ERROR` | Tier config error | Tier配置错误 |
| `PROMOTION_HAS_BEEN_USED` | Promotion has been used | 促销已被使用 |
| `EXIST` | Promotion code is exist | 代码已存在 |
| `NO_CONDITION` | No condition | 缺少条件配置 |
| `UNSUPPORTED_DISCOUNT_TYPE` | Unsupported discount type | 不支持的折扣类型 |

---

## 10. 使用流程

### 10.1 创建促销

```
1. 填写基本信息
   ├── Code (促销代码)
   ├── Name (名称描述)
   ├── Group (分组)
   ├── Promotion Type (促销类型)
   ├── Discount Type (折扣类型) ← 关键选择
   ├── Discount Value (折扣值)  ← 百分比/固定金额
   └── Tier Config (分层配置)  ← 仅tier类型
   
2. 设置有效期
   ├── Start Date
   └── End Date
   
3. 配置条件
   └── 树形条件组合 (AND/OR)

4. 设置应用范围
   ├── Is Auto (是否自动应用)
   └── Quantity (使用次数限制)
```

### 10.2 应用促销

```
订单流程中的促销应用:
                                    
  Order Create ──┬── 自动促销 (is_auto=1)
                 │
                 ├── 推荐码 (referral_code)
                 │
                 ├── 优惠券 (coupon_code)
                 │
                 └── 促销码 (promotion)
```

---

## 11. 相关文件清单

### 后端

| 文件路径 | 说明 |
|---------|------|
| `qb2025_backend/backend/models/Promotion.py` | ORM 模型定义 |
| `qb2025_backend/backend/schemas/promotion.py` | Pydantic Schema |
| `qb2025_backend/backend/services/Promotion.py` | 业务逻辑服务 |
| `qb2025_backend/backend/repository/Promotion.py` | 数据访问层 |
| `qb2025_backend/routers/v1/backend/promotion.py` | API 路由 |
| `qb2025_backend/config/error_code/promotion.py` | 错误码定义 |
| `qb2025_backend/utils/service/promotion.py` | 条件工厂/评估器 |

### 前端

| 文件路径 | 说明 |
|---------|------|
| `qb2025_frontend/src/api/promotion.js` | API 调用封装 |
| `qb2025_frontend/src/views/admin/promotion/Index.vue` | 列表页 |
| `qb2025_frontend/src/views/admin/promotion/Form.vue` | 表单页 |
| `qb2025_frontend/src/views/admin/promotion/FilterGroup.vue` | 筛选组件 |
| `qb2025_frontend/src/views/admin/promotion/FieldChain.vue` | 字段链组件 |

---

## 12. 总结

### 核心特性

1. **多种折扣类型**: percent / fixed / per_fixed / tier
2. **灵活的促销条件**: 树形 AND/OR 条件组合
3. **自动促销**: 可设置自动应用的促销
4. **状态控制**: inactive 字段控制激活/失效
5. **使用追踪**: promotion_usage 记录使用历史
6. **分层折扣**: tier 支持按金额区间应用不同折扣

### 开发注意事项

1. Tier 类型促销必须配置 tier 数据
2. 百分比折扣值不能超过 100
3. 已使用的促销不能删除
4. 日期范围校验：start_date <= end_date
5. 复制促销需要生成新的 code