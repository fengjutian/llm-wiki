现在我已经完整阅读了所有相关代码。下面是消费金额分层（sales_amount tier）功能的详细分析：

---

## 消费金额分层（sales_amount tier）功能详细分析

### 一、功能概述

消费金额分层是一种基于客户**年度累计消费金额**进行阶梯打折的促销机制。当客户的累计消费达到不同的金额门槛时，自动应用对应的折扣。

---

### 二、前端交互流程

#### 2.1 表单数据结构

```javascript
// 默认数据
const defaultFormData = {
  promotion_type: 'promotion',
  discount_type: 'tier',          // 必须是 'tier'
  tier_type: 'sales_amount',      // 消费金额分层类型
  tier: []                        // tier 数组
};
```

#### 2.2 Tier 条目结构（前端）

```javascript
// 每个 tier 条目包含：
{
  price: number,           // 金额阈值（USD）
  infinity: boolean,       // 是否为无限层级（超出最高金额）
  is_select: boolean,      // 是否选中（用于无限层级）
  discount_value1: number, // 百分比折扣 (%)
  discount_value2: number, // 固定金额折扣 (USD)
  discount_value3: number  // 每件固定金额折扣 (USD)
}
```

#### 2.3 UI 渲染逻辑（行 197-239）

```
┌─────────────────────────────────────────────────────────────────┐
│  Tier 1        $ [1500] USD,  [%] or [$ 50] USD or [$ 5] USD   │
│  [删除按钮]                                                        │
├─────────────────────────────────────────────────────────────────┤
│  Tier 2        $ [2000] USD,  [%] or [$ 100] USD or [$ 10] USD │
│  [删除按钮]                                                        │
├─────────────────────────────────────────────────────────────────┤
│  [✓] Exceeding  $ [2000] USD,  [%] or [$ 150] USD or [$ 15] USD│
└─────────────────────────────────────────────────────────────────┘
```

**关键特性：**
- 每个 Tier 有一个金额阈值（Price）
- 三种折扣方式互斥：百分比、固定金额、每件固定金额
- 最后一个"Exceeding"（超出）层级默认选中，`max_price = null`
- 金额输入框 `disabled`（不可编辑），值继承自最高 tier

---

### 三、数据转换流程

#### 3.1 提交前转换（前端 → API）

```javascript
// submitForm() 中的转换逻辑
const transformTierForSubmit = (res) => {
  // 1. 分离普通层级和无限层级
  const infinityItem = res.tier.find(item => item.infinity && item.is_select === true);
  const normalTiers = res.tier.filter(item => !(item.infinity && item.is_select === true));

  // 2. 按价格排序普通层级
  const sorted = [...normalTiers].sort((a, b) => a.price - b.price);

  // 3. 转换为 API 格式
  const tier_end = sorted.map((cur, idx) => {
    let discount_type = 'fixed';
    let discount_value = cur.discount_value2;
    
    if (cur.discount_value1) {
      discount_type = 'percent';
      discount_value = cur.discount_value1;
    }
    if (cur.discount_value3) {
      discount_type = 'per_fixed';
      discount_value = cur.discount_value3;
    }
    
    return {
      min_price: idx === 0 ? 0 : sorted[idx - 1].price,
      max_price: cur.price,
      discount_type,
      discount_value
    };
  });

  // 4. 添加无限层级（如果存在）
  if (infinityItem) {
    tier_end.push({
      min_price: Number(infinityItem.price),
      max_price: null,
      discount_type,
      discount_value
    });
  }

  return tier_end;
};
```

#### 3.2 数据回显转换（API → 前端）

```javascript
// transformTierData() 函数
const transformTierData = (tier, tierType) => {
  if (!tier || tier.length === 0) return [];
  
  const hasInfinity = tier.some(item => item.max_price === null);
  
  const result = tier.map((item) => ({
    price: item.max_price === null ? item.min_price : item.max_price,
    infinity: item.max_price === null,
    is_select: item.max_price === null,
    discount_value1: item.discount_type === 'percent' ? item.discount_value : null,
    discount_value2: item.discount_type === 'fixed' ? item.discount_value : null,
    discount_value3: item.discount_type === 'per_fixed' ? item.discount_value : null
  }));
  
  // 如果没有无限层级，自动添加一个
  if (!hasInfinity && result.length > 0) {
    result.push({
      price: result[result.length - 1].price,
      infinity: true
    });
  }
  
  return result;
};
```

---

### 四、API 接口

#### 4.1 创建促销

```
POST /backend/promotion/add
```

**请求体结构：**

```json
{
  "code": "SUMMER2025",
  "name": "Summer Sales Tier",
  "group": "Seasonal",
  "promotion_type": "promotion",
  "discount_type": "tier",
  "start_date": "2025-06-01",
  "end_date": "2025-08-31",
  "is_auto": 1,
  "quantity": 0,
  "inactive": 1,
  "ui_data": {},
  "condition": {
    "operator": "AND",
    "is_group": 1,
    "children": [...]
  },
  "tier": [
    {
      "min_price": 0,
      "max_price": 1500,
      "discount_type": "percent",
      "discount_value": 5
    },
    {
      "min_price": 1500,
      "max_price": 2000,
      "discount_type": "fixed",
      "discount_value": 100
    },
    {
      "min_price": 2000,
      "max_price": null,
      "discount_type": "per_fixed",
      "discount_value": 10
    }
  ]
}
```

#### 4.2 更新促销

```
PUT /backend/promotion/update
```

#### 4.3 查询促销详情

```
POST /backend/promotion/edit?query_id={id}
```

---

### 五、后端处理逻辑

#### 5.1 Service 层 (`PromotionService.py`)

```python
async def create(self, query: PromotionRequest):
    # 1. 验证 tier 配置
    if query.discount_type == 'tier' and not query.tier:
        raise AppException(PromotionError.TIER_CONFIG_ERROR.value)
    
    # 2. 创建 promotion 记录
    promotion = await self.repo.create(promotion_valid.model_dump())
    
    # 3. 创建 tier 记录
    if promotion.discount_type in [DiscountType.tier.value, 'tier_qty']:
        for tier in query.tier:
            tier.promotion_id = promotion.id
            await self.tier_repo.create(tier.model_dump())
```

#### 5.2 折扣计算逻辑（核心）

```python
async def calculate_discount(self, items, promotion, ...):
    if promotion.get('discount_type') == 'tier':
        # 1. 计算匹配商品的总价
        product_total_price = sum([items[idx]['total'] for idx in matched_pid])
        
        # 2. 找到对应的 tier
        tier = None
        for v in promotion.get('tier'):
            if v.min_price <= product_total_price and \
               (v.max_price is None or v.max_price >= product_total_price):
                tier = v
                break
        
        if tier:
            if tier.discount_type == 'percent':
                # 百分比折扣
                for idx in matched_pid:
                    main_product_price = items[idx]['product_price'] * items[idx]['quantity']
                    item_saving = Decimal(main_product_price * tier.discount_value / 100)
                    # 确保不超过支付金额
                    items[idx]['payment'] -= min(item_saving, items[idx]['payment'])
                    
            elif tier.discount_type == 'fixed':
                # 固定金额折扣（按比例分配）
                for idx in matched_pid:
                    items[idx]['saving'] = min(tier.discount_value, product_subtotal) * \
                                           (main_product_price / product_subtotal)
                                           
            elif tier.discount_type == 'per_fixed':
                # 每件固定金额折扣
                for idx in matched_pid:
                    if items[idx].get('is_bp'):
                        items[idx]['saving'] = tier.discount_value
                    else:
                        items[idx]['saving'] = tier.discount_value * items[idx]['quantity']
```

---

### 六、数据库表结构

#### 6.1 `promotion` 表

```sql
CREATE TABLE promotion (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50),           -- 促销代码
    name VARCHAR(100),          -- 描述名称
    group VARCHAR(100),         -- 分组
    promotion_type VARCHAR(50),  -- 'promotion'/'referral_code'/'coupon_code'
    discount_type VARCHAR(20),   -- 'percent'/'fixed'/'tier'/'per_fixed'/'tier_qty'
    discount_value DECIMAL(8,2), -- 单值折扣（tier 模式下为 null）
    start_date DATE,
    end_date DATE,
    is_auto INT DEFAULT 0,       -- 0=手动, 1=自动
    quantity INT DEFAULT 0,      -- 使用次数限制
    inactive INT DEFAULT 1,      -- 1=激活, 0=失效
    ui_data JSON,               -- 前端 UI 配置
    created_at DATETIME,
    updated_at DATETIME
);
```

#### 6.2 `promotion_tier` 表（核心）

```sql
CREATE TABLE promotion_tier (
    id INT PRIMARY KEY AUTO_INCREMENT,
    promotion_id INT,           -- 外键关联 promotion
    
    -- 价格阶梯字段（sales_amount 模式）
    min_price DECIMAL(8,2),     -- 最低价格（含）
    max_price DECIMAL(8,2),     -- 最高价格（含），NULL=无上限
    
    -- 数量阶梯字段（tier_qty 模式）
    min_quantity INT,           -- 最低数量
    max_quantity INT,           -- 最高数量，NULL=无上限
    
    -- 折扣配置
    discount_type VARCHAR(20),  -- 'percent'/'fixed'/'per_fixed'
    discount_value DECIMAL(8,2) -- 折扣值
);
```

#### 6.3 关联表

```sql
-- 促销适用条件
CREATE TABLE promotion_condition (
    id INT PRIMARY KEY AUTO_INCREMENT,
    promotion_id INT,
    parent_id INT DEFAULT 0,
    condition_type VARCHAR(50),  -- 'customer_id'/'category_id'/'region_id'
    condition_value JSON,
    operator VARCHAR(10),         -- 'AND'/'OR'
    is_group INT DEFAULT 0
);

-- 促销使用记录
CREATE TABLE promotion_usage (
    id INT PRIMARY KEY AUTO_INCREMENT,
    promotion_id INT,
    customer_id INT,
    order_id INT,
    use_data JSON,
    created_at DATETIME
);
```

---

### 七、数据流转图

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           前端表单 (Form.vue)                                │
│  ┌─────────────┐  ┌──────────────────────────────────────────────────┐     │
│  │ Tier 1      │  │ $ 1500 USD,  [10] % or [$ 50] USD or [$ 5] USD   │     │
│  └─────────────┘  └──────────────────────────────────────────────────┘     │
│  ┌─────────────┐  ┌──────────────────────────────────────────────────┐     │
│  │ Tier 2      │  │ $ 2000 USD,  [15] % or [$ 100] USD or [$ 10] USD  │     │
│  └─────────────┘  └──────────────────────────────────────────────────┘     │
│  ┌─────────────┐  ┌──────────────────────────────────────────────────┐     │
│  │ Exceeding   │  │ $ 2000 USD,  [20] % or [$ 150] USD or [$ 15] USD │     │
│  └─────────────┘  └──────────────────────────────────────────────────┘     │
└────────────────────────────┬─────────────────────────────────────────────────┘
                             │ transformTierForSubmit()
                             ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              API 请求体                                       │
│  "tier": [                                                                  │
│    { "min_price": 0,     "max_price": 1500, "discount_type": "percent",     │
│      "discount_value": 10 },                                                 │
│    { "min_price": 1500, "max_price": 2000, "discount_type": "fixed",        │
│      "discount_value": 100 },                                                │
│    { "min_price": 2000, "max_price": null,  "discount_type": "per_fixed",   │
│      "discount_value": 15 }                                                  │
│  ]                                                                          │
└────────────────────────────┬─────────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                            数据库 (promotion_tier)                            │
│  ┌──────────────┬──────────────┬──────────────┬─────────────────┬──────────────┐│
│  │ promotion_id│  min_price  │  max_price  │ discount_type  │discount_value││
│  ├──────────────┼──────────────┼──────────────┼─────────────────┼──────────────┤│
│  │     42      │     0       │   1500.00   │    percent     │    10.00     ││
│  │     42      │   1500.00   │   2000.00   │    fixed       │   100.00     ││
│  │     42      │   2000.00   │    NULL     │   per_fixed    │    15.00     ││
│  └──────────────┴──────────────┴──────────────┴─────────────────┴──────────────┘│
└────────────────────────────┬─────────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         折扣计算逻辑                                          │
│  客户累计消费 $1800 → 命中 Tier 2 (1500-2000)                                │
│  如果 discount_type = 'fixed':                                               │
│    折扣 = $100 (固定金额)                                                    │
│  如果 discount_type = 'percent':                                             │
│    折扣 = $1800 × 15% = $270                                                 │
│  如果 discount_type = 'per_fixed':                                           │
│    折扣 = $15 × 商品数量                                                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### 八、验证规则（前端）

```javascript
// 1. 价格验证
itemRules.price = [
  { required: true, message: 'Please Enter Price', trigger: 'blur' }
];

// 2. 折扣值互斥验证（discount_value1）
{
  validator: (rule, value, callback) => {
    // 如果填写了 discount_value1，不能同时填写 discount_value2
    if (value && itemData.discount_value2) {
      callback(new Error('Price percentage AND fixed price can only be filled in one'));
      return;
    }
    // 如果都为空，至少填写一种
    if (!value && !itemData.discount_value2 && !itemData.discount_value3) {
      callback(new Error('Please enter at least one discount value'));
      return;
    }
    callback();
  }
}

// 3. discount_value3 特殊验证（每件固定金额）
{
  validator: (rule, value, callback) => {
    // 不能与 discount_value1 或 discount_value2 同时填写
    if (value && (itemData.discount_value1 || itemData.discount_value2)) {
      callback(new Error('Per fixed amount cannot be combined with other discount types'));
      return;
    }
    callback();
  }
}
```

---

### 九、完整功能流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. 管理员创建促销                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  Form.vue 加载默认值                                                          │
│    ↓                                                                        │
│  tier_type = 'sales_amount'                                                 │
│    ↓                                                                        │
│  添加 Tier 条目 → 填写金额和折扣 → 提交                                       │
│    ↓                                                                        │
│  transformTierForSubmit() 数据转换                                           │
│    ↓                                                                        │
│  API POST /backend/promotion/add                                             │
│    ↓                                                                        │
│  PromotionService.create() → 保存到 promotion_tier 表                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. 客户使用促销                                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  客户下单时，系统计算符合条件的促销                                           │
│    ↓                                                                        │
│  calculate_discount() 计算总金额                                             │
│    ↓                                                                        │
│  遍历 tier 找到匹配的金额区间                                                 │
│    ↓                                                                        │
│  根据 discount_type 应用折扣                                                 │
│    ↓                                                                        │
│  更新订单价格和节省金额                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 十、与其他分层类型的区别

| 特性 | `sales_amount` | `tier_qty` |
|------|---------------|-----------|
| **UI 标识** | Institution Sales Amount (Current Year) | Order Items |
| **判断维度** | 累计消费金额 | 订购商品数量 |
| **字段** | `min_price` / `max_price` | `min_quantity` / `max_quantity` |
| **折扣方式** | percent / fixed / per_fixed | 单价替换 |
| **数据模型** | `PromotionTier.min_price/max_price` | `PromotionTier.min_quantity/max_quantity` |
| **应用场景** | 消费满 $1500 打 9 折 | 订购 100 件以上 $5/件 |

这就是消费金额分层功能的完整技术分析。如需进一步了解某个具体环节，请告诉我！