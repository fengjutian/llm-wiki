# 促销系统后端代码判断过程详解

> 生成时间: 2025-06-02  
> 文档类型: 后端逻辑流程分析  
> 核心文件: `qb2025_backend/backend/services/Promotion.py`

---

## 目录

1. [整体架构](#1-整体架构)
2. [入口流程](#2-入口流程)
3. [促销匹配判断](#3-促销匹配判断)
4. [折扣计算核心逻辑](#4-折扣计算核心逻辑)
5. [四种折扣类型详细流程](#5-四种折扣类型详细流程)
6. [促销条件评估](#6-促销条件评估)
7. [代码执行时序图](#7-代码执行时序图)

---

## 1. 整体架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              外部调用层                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │ use_code()  │  │ use_referral│  │ use_coupon_ │  │ get_promotion()    │   │
│  │             │  │ _code()     │  │ code()      │  │ (自动促销)         │   │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬────────┘   │
└─────────┼────────────────┼───────────────┼────────────────────┼─────────────┘
          │                │               │                    │
          ▼                ▼               ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            核心处理层                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     calculate_discount()                             │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌──────────────────────┐  │   │
│  │  │ get_matched_pid│→ │ 匹配产品索引    │→ │ 按 discount_type     │  │   │
│  │  │ ()             │  │ (条件过滤)     │  │ 应用折扣计算         │  │   │
│  │  └────────────────┘  └────────────────┘  └──────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            折扣类型分支                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────────────┐       │
│  │ percent  │  │ fixed    │  │per_fixed │  │ tier                     │       │
│  │ 百分比   │  │ 固定金额 │  │ 每件固定 │  │ 分层折扣                 │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 入口流程

### 2.1 促销码使用入口 (`use_code`)

**方法**: `PromotionService.use_code()`

```python
async def use_code(self, items: List[dict], code: str, customer_id: int, 
                    no_check: bool = False, order_id: int = None):
    """手动验证并应用促销码"""
    
    # ═══════════════════════════════════════════════════════════════
    # 步骤1: 基础校验
    # ═══════════════════════════════════════════════════════════════
    
    # ① 检查促销码是否为空
    if not code:
        return items, None  # 空码直接返回原数据
    
    # ② 查找促销记录
    promotion = await self.repo.find(dict(code=code))
    if not promotion and not no_check:
        raise AppException(PromotionError.PROMOTION_NOT_FOUND.value)
    
    # ③ 检查促销有效期
    if ((promotion.start_date and promotion.start_date > date.today()) or 
        (promotion.end_date and promotion.end_date < date.today())) and not no_check:
        raise AppException(PromotionError.PROMOTION_EXPIRED.value)
    
    # ═══════════════════════════════════════════════════════════════
    # 步骤2: 数据预处理
    # ═══════════════════════════════════════════════════════════════
    
    # ④ 转换为字典格式
    promotion = self.repo.info(promotion)
    
    # ⑤ 构建条件树（将 conditions 表数据转为树形结构）
    promotion = await self.build_condition_json(promotion)
    
    # ⑥ 获取客户上下文信息
    service_mapping = await self.prod_repo.productMappingByService()
    new_service_line_customer, new_product_customer, context_dict = \
        await self.getContext(customer_id=customer_id, 
                             service_mapping=service_mapping,
                             exclude_order_id=order_id)
    
    # ═══════════════════════════════════════════════════════════════
    # 步骤3: 计算折扣
    # ═══════════════════════════════════════════════════════════════
    
    data = await self.calculate_discount(
        items=items, 
        promotion=promotion, 
        customer_id=customer_id,
        service_mapping=service_mapping,
        new_service_line_customer=new_service_line_customer,
        new_product_customer=new_product_customer,
        context_dict=context_dict
    )
    
    return data
```

### 2.2 入口选择逻辑 (`usePromotion`)

**方法**: `PromotionService.usePromotion()`

```python
async def usePromotion(self, query: OrderPreview, lists: List[dict], 
                       customer_id: int, saving: Decimal, payment: Decimal,
                       pass_check_used: bool = False, order_id: int = None):
    """
    促销应用入口选择器
    
    判断优先级:
    ① referral_code (推荐码)
    ② coupon_id    (优惠券)
    ③ promotion_code (促销码)
    """
    
    promotion_id = None
    
    # ═══════════════════════════════════════════════════════════════
    # 分支1: 推荐码
    # ═══════════════════════════════════════════════════════════════
    if query.referral_code is not None:
        # 调用推荐码处理
        discount_list, promotion = await self.use_referral_code(
            customer_id=customer_id,
            items=lists,
            code=query.referral_code,
            pass_check_used=pass_check_used
        )
        # 更新金额
        saving += self.calculate_saving(discount_list)
        payment -= saving
        promotion_id = promotion
    
    # ═══════════════════════════════════════════════════════════════
    # 分支2: 优惠券
    # ═══════════════════════════════════════════════════════════════
    elif query.coupon_id is not None:
        discount_list, promotion = await self.use_coupon_code(
            customer_id=customer_id, 
            items=lists,
            coupon_id=query.coupon_id,
            pass_check_used=pass_check_used
        )
        saving += self.calculate_saving(discount_list)
        payment -= saving
        promotion_id = promotion
    
    # ═══════════════════════════════════════════════════════════════
    # 分支3: 促销码
    # ═══════════════════════════════════════════════════════════════
    elif query.promotion_code is not None:
        discount_list, promotion = await self.use_code(
            customer_id=customer_id, 
            items=lists,
            code=query.promotion_code,
            no_check=pass_check_used,
            order_id=order_id
        )
        saving += self.calculate_saving(discount_list)
        payment -= saving
        promotion_id = promotion
    
    # ═══════════════════════════════════════════════════════════════
    # 分支4: 无优惠
    # ═══════════════════════════════════════════════════════════════
    else:
        discount_list = lists
    
    return discount_list, promotion_id, saving, payment
```

---

## 3. 促销匹配判断

### 3.1 获取匹配产品索引 (`get_matched_pid`)

**方法**: `PromotionService.get_matched_pid()`

```python
@staticmethod
async def get_matched_pid(items: List[Dict], promotion: Dict,
                          new_service_line_customer, new_product_customer,
                          context_dict, service_mapping):
    """
    判断哪些购物车商品符合促销条件
    
    返回: matched_pid (匹配的购物车项索引列表)
    """
    
    matched_pid = []
    
    # ═══════════════════════════════════════════════════════════════
    # 步骤1: 创建条件评估器
    # ═══════════════════════════════════════════════════════════════
    # 将树形条件转换为可执行的评估器对象
    evaluator = ConditionFactory.create(promotion['condition'])
    
    # ═══════════════════════════════════════════════════════════════
    # 步骤2: 遍历购物车商品
    # ═══════════════════════════════════════════════════════════════
    for idx, item in enumerate(items):
        
        # ① 判断是否是新服务线客户
        is_new_service_customer = False
        for k, v in new_service_line_customer.items():
            for m in k:  # k 是 product_id 元组
                if str(item['product_id']) in m:
                    is_new_service_customer = v
        
        # ② 获取商品所属类别
        category_id = None
        for service_id, category_dict in service_mapping.items():
            for k, v in category_dict.items():
                if str(item['product_id']) in v:
                    category_id = k
        
        # ═══════════════════════════════════════════════════════════
        # 步骤3: 构建商品上下文
        # ═══════════════════════════════════════════════════════════
        context_dict.update({
            'product_id': item['product_id'],
            'category_id': category_id,
            'new_service_line_customer': is_new_service_customer,
            'new_product_customer': new_product_customer.get(item['product_id'], False)
        })
        
        # ═══════════════════════════════════════════════════════════
        # 步骤4: 评估条件
        # ═══════════════════════════════════════════════════════════
        context = EvaluationContext(**context_dict)
        
        # 核心判断: 条件是否满足
        if evaluator.evaluate(context):
            matched_pid.append(idx)  # 记录匹配的索引
        else:
            continue  # 不匹配，跳过
    
    return matched_pid
```

### 3.2 条件评估流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                    购物车商品遍历                                │
│                    items[i]                                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  构建商品上下文 EvaluationContext                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • customer_id        客户ID                              │    │
│  │ • new_reg_customer   是否新注册客户                      │    │
│  │ • new_service_line   是否新服务线客户                    │    │
│  │ • new_product        是否新产品客户                      │    │
│  │ • product_id         当前商品ID                          │    │
│  │ • category_id        商品类别ID                          │    │
│  │ • region/country/    地理信息                            │    │
│  │   state/city                                                  │    │
│  │ • billgroup          账单组                              │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  条件树评估 (ConditionFactory.create)                           │
│                                                                 │
│              ┌──────────────────────────────────┐              │
│              │         AND / OR                 │              │
│              │    (根节点操作符)                 │              │
│              └─────────────┬────────────────────┘              │
│                            │                                   │
│           ┌────────────────┼────────────────┐                 │
│           │                │                │                 │
│           ▼                ▼                ▼                 │
│     ┌──────────┐    ┌──────────┐    ┌──────────┐            │
│     │条件节点A │    │条件节点B │    │条件节点C │            │
│     │category  │    │customer  │    │new_reg   │            │
│     │  in [...]│    │   = x    │    │customer  │            │
│     └────┬─────┘    └────┬─────┘    └────┬─────┘            │
│          │               │                │                   │
│          └───────────────┴────────────────┘                   │
│                         │                                      │
│                         ▼                                      │
│                 逐节点评估，返回 bool                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     评估结果                                     │
│                                                                 │
│   AND: 所有节点都为 True → True                                 │
│   OR : 任一节点为 True → True                                   │
│                                                                 │
│   True  →  将索引加入 matched_pid                               │
│   False →  不加入                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. 折扣计算核心逻辑

### 4.1 `calculate_discount` 方法完整流程

**方法**: `PromotionService.calculate_discount()`

```python
async def calculate_discount(self, items: List[Dict], promotion: Dict, 
                             customer_id: int, new_service_line_customer: Dict,
                             new_product_customer: Dict, context_dict: Dict,
                             service_mapping: Dict, is_coupon: bool = False):
    """
    折扣计算主方法
    
    参数:
    - items: 购物车商品列表
    - promotion: 促销配置
    - customer_id: 客户ID
    - service_mapping: 产品类别映射
    - new_service_line_customer: 新服务线客户标识
    - new_product_customer: 新产品客户标识
    - context_dict: 评估上下文
    """
    
    saving = 0
    promotion_id = None
    
    # ═══════════════════════════════════════════════════════════════
    # 第一阶段: 获取匹配的产品索引
    # ═══════════════════════════════════════════════════════════════
    
    matched_pid = await self.get_matched_pid(
        items=items, 
        promotion=promotion,
        service_mapping=service_mapping,
        new_service_line_customer=new_service_line_customer,
        new_product_customer=new_product_customer,
        context_dict=context_dict
    )
    
    # ═══════════════════════════════════════════════════════════════
    # 第二阶段: 如果有匹配的商品，应用折扣
    # ═══════════════════════════════════════════════════════════════
    
    if matched_pid:
        
        # ═══════════════════════════════════════════════════════════
        # 分支A: 分层折扣 (tier)
        # ═══════════════════════════════════════════════════════════
        if promotion.get('discount_type') == 'tier':
            
            # ① 计算匹配商品的总价
            product_total_price = sum([items[idx]['total'] for idx in matched_pid])
            
            # ② 查找匹配的 tier
            tier = None
            for v in promotion.get('tier'):
                # 条件: min_price <= 总价 < max_price
                if (v.min_price <= product_total_price and 
                    (v.max_price is None or v.max_price >= product_total_price)):
                    tier = v
                    break
            
            if tier:
                # ③ 根据 tier 的 discount_type 计算折扣
                # ... (详见 5.4 节)
        
        # ═══════════════════════════════════════════════════════════
        # 分支B: 非分层折扣 (percent / fixed / per_fixed)
        # ═══════════════════════════════════════════════════════════
        else:
            
            max_quantity = promotion.get('quantity', 0)  # 限量数量
            
            # 计算匹配商品的小计
            product_subtotal = sum([
                items[idx]['product_price'] * items[idx]['quantity'] 
                for idx in matched_pid 
                if items[idx]['product_price']
            ])
            
            # ═══════════════════════════════════════════════════════
            # 遍历匹配的商品，应用折扣
            # ═══════════════════════════════════════════════════════
            for idx in matched_pid:
                
                # 确保价格不为 None
                items[idx]['product_price'] = items[idx]['product_price'] or 0
                
                # ═════════════════════════════════════════════════════╗
                # 分支B1: 百分比折扣 (percent)                       ║
                # ═════════════════════════════════════════════════════║
                if promotion.get('discount_type') == 'percent':
                    
                    if promotion.get('quantity') and max_quantity > 0:
                        # 【有限量】按数量限制计算
                        item_saving = (
                            items[idx]['product_price'] 
                            * promotion.get('discount_value') / 100 
                            * min(max_quantity, items[idx]['quantity'])
                        )
                        # 扣减可用数量
                        max_quantity -= min(max_quantity, items[idx]['quantity'])
                    elif promotion.get('quantity') == 0:
                        # 【无限量】按全额计算
                        item_saving = (
                            items[idx]['product_price'] 
                            * promotion.get('discount_value') / 100 
                            * items[idx]['quantity']
                        )
                    
                    items[idx]['saving'] = item_saving
                    items[idx]['payment'] -= item_saving
                
                # ═════════════════════════════════════════════════════╗
                # 分支B2: 固定金额折扣 (fixed)                        ║
                # ═════════════════════════════════════════════════════║
                elif promotion.get('discount_type') == 'fixed':
                    # 按商品金额比例分摊固定折扣
                    if product_subtotal > 0:
                        items[idx]['saving'] = min(
                            promotion.get('discount_value'), 
                            product_subtotal
                        ) * (items[idx]['product_price'] * items[idx]['quantity']) / product_subtotal
                    else:
                        items[idx]['saving'] = 0
                    
                    items[idx]['payment'] -= items[idx]['saving']
                
                # ═════════════════════════════════════════════════════╗
                # 分支B3: 每件固定折扣 (per_fixed)                     ║
                # ═════════════════════════════════════════════════════║
                elif promotion.get('discount_type') == 'per_fixed':
                    if items[idx].get('is_bp', None):
                        # is_bp 产品: 只计算一次
                        items[idx]['saving'] = promotion.get('discount_value')
                    else:
                        # 普通产品: 按数量计算
                        items[idx]['saving'] = (
                            promotion.get('discount_value') 
                            * items[idx]['quantity']
                        )
                    
                    items[idx]['payment'] -= items[idx]['saving']
                
                # ═════════════════════════════════════════════════════╗
                # 分支B4: 不支持的折扣类型                             ║
                # ═════════════════════════════════════════════════════║
                else:
                    logger.error(f"Unsupported discount type [{promotion.get('code')}]")
                    raise AppException(PromotionError.PROMOTION_UNSUPPORTED_DISCOUNT_TYPE.value)
            
            promotion_id = promotion.get('id')
    
    # ═══════════════════════════════════════════════════════════════
    # 第三阶段: 处理Addon产品
    # ═══════════════════════════════════════════════════════════════
    
    for item in items:
        if item.get('addon_list', None):
            # 递归处理 addon
            item['addon_list'], addon_promotion_id = await self.calculate_discount(
                items=item['addon_list'], 
                promotion=promotion,
                customer_id=customer_id,
                new_service_line_customer=new_service_line_customer,
                new_product_customer=new_product_customer,
                context_dict=context_dict,
                service_mapping=service_mapping
            )
            # 如果主产品没匹配但addon匹配了，更新promotion_id
            if addon_promotion_id:
                promotion_id = addon_promotion_id
    
    return items, promotion_id
```

### 4.2 判断流程图

```
                              ┌─────────────────────────────┐
                              │     calculate_discount()     │
                              └──────────────┬──────────────┘
                                             │
                                             ▼
                              ┌─────────────────────────────┐
                              │   get_matched_pid()         │
                              │   获取匹配的商品索引        │
                              └──────────────┬──────────────┘
                                             │
                                             ▼
                                   ┌─────────────────────┐
                                   │ matched_pid 非空?   │
                                   └──────────┬──────────┘
                                    Yes ↖     ↙ No
                                     │         │
                                     ▼         ▼
                    ┌────────────────────────┴────────────────────────┐
                    │                                                 │
                    ▼                                                 │
        ┌───────────────────────────┐                               │
        │   discount_type == 'tier' │                               │
        └───────────┬───────────────┘                               │
             Yes ↖  ↙ No                                           │
              │      │                                             │
              ▼      ▼                        ┌─────────────────────┘
    ┌─────────────────────┐                  │
    │    【tier 分支】     │                  │
    │ 1.计算商品总价       │                  │
    │ 2.匹配 tier 区间     │                  │
    │ 3.应用 tier 折扣     │                  │
    └───────────┬─────────┘                  │
                │                            │
                ▼                            │
    ┌─────────────────────────┐              │
    │ 【非 tier 分支】        │              │
    │ 遍历 matched_pid        │              │
    └───────────┬─────────────┘              │
                │                            │
        ┌───────┴────────┬─────────┬─────────┐
        │                │         │         │
        ▼                ▼         ▼         ▼
  ┌──────────┐    ┌──────────┐ ┌────────┐ ┌──────────┐
  │ percent  │    │  fixed   │ │per_fix │ │  其他    │
  │ 百分比   │    │ 固定金额 │ │ 每件   │ │ 抛异常   │
  └────┬─────┘    └────┬─────┘ └───┬────┘ └──────────┘
       │                │          │
       └────────────────┴──────────┘
                    │
                    ▼
        ┌─────────────────────────┐
        │ 处理 addon 产品(递归)   │
        └───────────┬─────────────┘
                    │
                    ▼
        ┌─────────────────────────┐
        │ return items,promotion_id│
        └─────────────────────────┘
```

---

## 5. 四种折扣类型详细流程

### 5.1 percent (百分比折扣)

**计算公式**: 
```
saving = product_price × discount_value% × quantity
```

**示例**:
```
商品价格: $100
折扣: 10%
数量: 3

saving = 100 × 10% × 3 = $30
payment = 300 - 30 = $270
```

**特殊规则 - 有限量**:
```python
# quantity > 0 表示限量
if promotion.quantity > 0:
    # 每次只按 quantity 限制计算
    item_saving = price × discount% × min(quantity, item_quantity)
    max_quantity -= min(quantity, item_quantity)
elif promotion.quantity == 0:
    # 无限量，全额折扣
    item_saving = price × discount% × item_quantity
```

### 5.2 fixed (固定金额折扣)

**计算公式**:
```
saving = min(discount_value, subtotal) × (item_price × item_qty) / subtotal
```

**特点**:
- 固定金额在所有匹配商品间按比例分摊
- 不超过商品总价

**示例**:
```
商品A: $100, qty=2 → 小计 $200
商品B: $50,  qty=1 → 小计 $50
-------------------------
总计: $250

固定折扣: $50

商品A分摊: 50 × 200/250 = $40
商品B分摊: 50 × 50/250  = $10
```

### 5.3 per_fixed (每件固定折扣)

**计算公式**:
```
普通产品: saving = discount_value × quantity
is_bp产品: saving = discount_value (只计算一次)
```

**示例**:
```
产品A: $100, qty=3, per_fixed=$10
→ saving = 10 × 3 = $30

产品B (is_bp): $100, qty=2, per_fixed=$10
→ saving = 10 × 1 = $10
```

### 5.4 tier (分层折扣)

**计算流程**:
```
┌──────────────────────────────────────────────────────────────┐
│ 1. 计算匹配商品的总价                                          │
│    product_total_price = sum(items[idx]['total'])           │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. 查找匹配的 tier                                           │
│    for tier in promotion.tier:                               │
│        if tier.min_price <= total <= tier.max_price:        │
│            matched_tier = tier                                │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. 应用 tier 的折扣类型                                      │
│                                                              │
│    tier.discount_type == 'percent':                         │
│        saving = subtotal × tier.discount_value%             │
│                                                              │
│    tier.discount_type == 'fixed':                           │
│        saving = 按比例分摊固定金额                           │
│                                                              │
│    tier.discount_type == 'per_fixed':                       │
│        saving = tier.discount_value × quantity              │
└──────────────────────────────────────────────────────────────┘
```

**Tier 配置示例**:
```javascript
// 促销配置
{
  discount_type: 'tier',
  tier: [
    { min_price: 0,    max_price: 100,  discount_type: 'percent',  discount_value: 5  },
    { min_price: 100,  max_price: 500,  discount_type: 'percent',  discount_value: 10 },
    { min_price: 500,  max_price: null, discount_type: 'percent',  discount_value: 15 }
  ]
}

// 购物车总价: $350
// → 匹配第二个 tier (100-500)
// → 享受 10% 折扣
```

### 5.5 折扣上限处理

所有折扣类型都包含支付上限保护:

```python
# 确保节省金额不超过应付金额
if min(item['saving'], item['payment']) == item['payment']:
    # 如果节省金额 >= 应付金额
    item['saving'] = item['payment']  # 最多减免应付金额
    item['payment'] = 0              # 实付为0
else:
    # 正常扣减
    item['payment'] -= item['saving']
```

---

## 6. 促销条件评估

### 6.1 条件树结构

```python
# 数据库存储 (扁平化)
PromotionCondition 表:
┌────┬─────────────┬───────────┬──────────────────┬────────────┬──────────┐
│ id │ promotion_id│ parent_id│ condition_type   │ condition_value│operator│
├────┼─────────────┼───────────┼──────────────────┼────────────┼──────────┤
│ 1  │ 100         │ 0         │ null            │ null        │ AND      │  ← 根组
│ 2  │ 100         │ 1         │ category_id     │ [1,2,3]    │ null     │  ← 叶子
│ 3  │ 100         │ 1         │ new_reg_customer│ true       │ null     │  ← 叶子
│ 4  │ 100         │ 1         │ region_id       │ [1,2]      │ null     │  ← 叶子
└────┴─────────────┴───────────┴──────────────────┴────────────┴──────────┘

# 转换为树形
{
  "operator": "AND",
  "is_group": 1,
  "children": [
    { "condition_type": "category_id", "condition_value": [1,2,3] },
    { "condition_type": "new_reg_customer", "condition_value": true },
    { "condition_type": "region_id", "condition_value": [1,2] }
  ]
}
```

### 6.2 条件类型列表

| condition_type | 评估方式 | 示例 condition_value |
|---------------|---------|---------------------|
| `category_id` | 商品类别ID列表 | `[1, 2, 3]` |
| `customer_id` | 指定客户ID | `[100]` |
| `region_id` | 区域ID列表 | `[1, 2]` |
| `country` | 国家ID | `1` |
| `state` | 州/省ID | `1` |
| `city` | 城市ID | `1` |
| `new_reg_customer` | 是否新注册 | `true` |
| `new_service_line_customer` | 是否新服务线客户 | `true` |
| `new_product_customer` | 是否新产品客户 | `true` |

### 6.3 条件评估器工厂

```python
# utils/service/promotion.py

class ConditionFactory:
    @staticmethod
    def create(condition_tree: Dict) -> 'ConditionEvaluator':
        """
        根据条件树创建评估器
        """
        if condition_tree.get('is_group'):
            return GroupCondition(
                operator=condition_tree.get('operator'),
                children=[ConditionFactory.create(c) for c in condition_tree.get('children', [])]
            )
        else:
            return LeafCondition(
                condition_type=condition_tree.get('condition_type'),
                condition_value=condition_tree.get('condition_value')
            )


class GroupCondition(ConditionEvaluator):
    """条件组 (AND/OR)"""
    def evaluate(self, context: EvaluationContext) -> bool:
        results = [child.evaluate(context) for child in self.children]
        if self.operator == 'AND':
            return all(results)
        elif self.operator == 'OR':
            return any(results)


class LeafCondition(ConditionEvaluator):
    """叶子条件"""
    def evaluate(self, context: EvaluationContext) -> bool:
        # 根据 condition_type 调用不同的评估方法
        if self.condition_type == 'category_id':
            return context.category_id in self.condition_value
        elif self.condition_type == 'new_reg_customer':
            return context.new_reg_customer == self.condition_value
        # ... 其他类型
```

---

## 7. 代码执行时序图

### 7.1 订单应用促销时序

```
┌────────┐     ┌─────────────────┐     ┌──────────────────────┐     ┌─────────────┐
│ Order  │     │ PromotionService│     │   ConditionFactory   │     │  Repository │
│Service │     │                 │     │                      │     │             │
└───┬────┘     └────────┬────────┘     └──────────┬───────────┘     └──────┬──────┘
    │                   │                          │                      │
    │ usePromotion()    │                          │                      │
    │──────────────────>│                          │                      │
    │                   │                          │                      │
    │    referral_code? │                          │                      │
    │         ├─────────┼──────────────────────────│                      │
    │         │yes      │                          │                      │
    │         │         │ use_referral_code()      │                      │
    │         │         │─────────────────────────>│                      │
    │         │         │                          │                      │
    │         │         │ build_condition_json()    │                      │
    │         │         │───────────────────────────────────────────────>│
    │         │         │                          │                      │
    │         │         │                          │  << 构建条件树 >>    │
    │         │         │<───────────────────────────────────────────────│
    │         │         │                          │                      │
    │         │         │ calculate_discount()     │                      │
    │         │         │─────────┐                │                      │
    │         │         │         │                │                      │
    │         │         │ get_matched_pid()        │                      │
    │         │         │────────────────────────>│                      │
    │         │         │                          │                      │
    │         │         │    创建评估器             │                      │
    │         │         │<────────────────────────│                      │
    │         │         │                          │                      │
    │         │         │    evaluate() 遍历商品   │                      │
    │         │         │────────────────────────>│                      │
    │         │         │                          │                      │
    │         │         │<────────────────────────│                      │
    │         │         │    返回 matched_pid     │                      │
    │         │         │         │                │                      │
    │         │         │<─────────┘                │                      │
    │         │         │                          │                      │
    │         │         │  按 discount_type 计算   │                      │
    │         │         │  ─────────────────────  │                      │
    │         │         │  percent: price×%×qty    │                      │
    │         │         │  fixed:  按比例分摊      │                      │
    │         │         │  tier:   区间匹配        │                      │
    │         │         │         │                │                      │
    │         │         │<────────┘                │                      │
    │         │         │                          │                      │
    │<──────────────────│                          │                      │
    │  返回折扣列表     │                          │                      │
    │                   │                          │                      │
```

### 7.2 判断流程伪代码

```python
def apply_promotion(items, promotion):
    """
    促销应用伪代码
    """
    
    # ═══════════════════════════════════════════════════════════════
    # 第一步: 条件匹配
    # ═══════════════════════════════════════════════════════════════
    
    matched_items = []
    for item in items:
        context = build_context(item)
        if evaluate_condition(promotion.condition, context):
            matched_items.append(item)
    
    if not matched_items:
        return items  # 无匹配，不享受优惠
    
    # ═══════════════════════════════════════════════════════════════
    # 第二步: 计算折扣
    # ═══════════════════════════════════════════════════════════════
    
    discount_type = promotion.discount_type
    
    if discount_type == 'percent':
        # 百分比折扣
        for item in matched_items:
            item.saving = item.price * promotion.discount_value / 100 * item.quantity
            
    elif discount_type == 'fixed':
        # 固定金额，按比例分摊
        total = sum(item.price * item.quantity for item in matched_items)
        fixed = min(promotion.discount_value, total)
        for item in matched_items:
            item.saving = fixed * (item.price * item.quantity) / total
            
    elif discount_type == 'per_fixed':
        # 每件固定
        for item in matched_items:
            if item.is_bp:
                item.saving = promotion.discount_value
            else:
                item.saving = promotion.discount_value * item.quantity
                
    elif discount_type == 'tier':
        # 分层折扣
        total = sum(item.price * item.quantity for item in matched_items)
        tier = find_matching_tier(total, promotion.tiers)
        if tier:
            # 按 tier.discount_type 计算
            ...
    
    # ═══════════════════════════════════════════════════════════════
    # 第三步: 上限保护
    # ═══════════════════════════════════════════════════════════════
    
    for item in items:
        if item.saving >= item.payment:
            item.saving = item.payment
            item.payment = 0
        else:
            item.payment -= item.saving
    
    return items
```

---

## 8. 关键代码位置索引

| 功能 | 文件 | 方法/位置 |
|-----|------|----------|
| 促销应用入口 | `services/Promotion.py` | `usePromotion()` (约230行) |
| 促销码处理 | `services/Promotion.py` | `use_code()` (约200行) |
| 折扣计算 | `services/Promotion.py` | `calculate_discount()` (约120行) |
| 条件匹配 | `services/Promotion.py` | `get_matched_pid()` (约80行) |
| 条件树构建 | `services/Promotion.py` | `build_condition_json()` (约60行) |
| 条件评估工厂 | `utils/service/promotion.py` | `ConditionFactory.create()` |
| 百分比折扣 | `services/Promotion.py` | `calculate_discount()` 内 ~170行 |
| 固定金额折扣 | `services/Promotion.py` | `calculate_discount()` 内 ~190行 |
| 每件固定折扣 | `services/Promotion.py` | `calculate_discount()` 内 ~200行 |
| 分层折扣 | `services/Promotion.py` | `calculate_discount()` 内 ~130行 |

---

## 9. 总结

### 9.1 核心判断逻辑

```
1. 入口选择
   └─> referral_code > coupon_id > promotion_code > 无优惠
   
2. 条件匹配
   └─> 遍历购物车商品 → 构建上下文 → 评估条件树 → 返回匹配索引
   
3. 折扣计算
   └─> 有匹配商品?
       ├─ Yes → 按 discount_type 分支计算
       │        ├─ percent:  price × % × qty
       │        ├─ fixed:    min(金额) × 比例分摊
       │        ├─ per_fixed: 每件 × qty
       │        └─ tier:     匹配区间 → 按区间折扣类型计算
       └─ No  → 不享受优惠
   
4. 上限保护
   └─> saving 不能超过 payment
```

### 9.2 重要规则

| 规则 | 说明 |
|-----|------|
| **优先级** | referral_code > coupon > promotion_code |
| **有效期** | start_date <= today <= end_date |
| **匹配** | 条件树 AND/OR 组合评估 |
| **限量** | quantity > 0 时按数量限制 |
| **上限** | saving <= payment |
| **分摊** | fixed 类型按商品金额比例分摊 |
| **is_bp** | per_fixed 对 bp 产品只计算一次 |