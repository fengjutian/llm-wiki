## BP数 与 Sample数 详细解释

这是一个生物实验室**测序服务订单系统**。让我从业务场景说起：

---

### 🔬 业务背景：什么是测序？

当你需要检测一段DNA序列时：
1. 你**提取DNA样本**（这是 **Sample 样品**）
2. 实验室对样本进行**测序反应**，每个反应给你一段**碱基序列**（这是 **BP = Base Pairs 碱基对**）

---

### 📊 Sample数（样品数量）

**Sample数 = 你送检的DNA样本管数/孔数**

从代码 Quote.py：

```python
def get_sample_count(quote_detail_list: List[QuoteDetail]):
    sample_num = 0
    for item in quote_detail_list:
        # 只有主产品（有custom_data）才计入sample数量
        if item.custom_data:
            # 非基因合成、非质粒制备：按 quantity 数量计算
            if item.quantity and item.service not in [constants.CATEGORY_ID_GENE, constants.CATEGORY_ID_PLASMID_DNAPREP]:
                sample_num += item.quantity or 0
            else:
                # 基因合成或质粒制备：每个订单项计为1个sample
                sample_num += 1
    return sample_num
```

**示例**：
- 你送了 **8 个质粒样本**做测序 → Sample数 = 8
- 你送了 **96孔板**（每孔一个样本）→ Sample数 = 96

---

### 🧬 BP数（碱基对数量）

**BP数 = 每个样本的DNA模板长度（以碱基对为单位）**

从 Business.py：
```python
template_size: Optional[Decimal]  # DNA模板大小（碱基对）
```

从 Category.py：
```python
unit: str  # 产品单位，bp/5u/2mg
```

**BP的用途**：
- 某些产品按 **"每bp价格"** 定价
- 例如：基因合成服务，按每bp收费

---

### 💰 定价中的 Sample数（数量阶梯折扣）

从 Quote.py：

```python
def catalog_to_price(row: Quotation, sample_num) -> dict:
    # seq_discount2_volume: 第二档折扣的样品数量阈值
    if row.seq_discount2_volume and 0 < row.seq_discount2_volume <= sample_num:
        item_dict['premixed_price'] = row.seq_discount2_price
        item_dict['nonpremixed_price'] = row.seq_discount2_price
    # seq_discount_volume: 第一档折扣的样品数量阈值
    elif row.seq_discount_volume and 0 < row.seq_discount_volume <= sample_num:
        item_dict['premixed_price'] = row.seq_discount_price
        item_dict['nonpremixed_price'] = row.seq_discount_price
```

**示例 - 数量阶梯定价**：
| Sample数 | 单价 |
|----------|------|
| 1-9      | $5/sample |
| 10-49    | $4/sample (第一档折扣) |
| ≥50      | $3/sample (第二档折扣) |

---

### 📋 前端显示

在订单详情页面 detail.vue：
```html
<td><b>Sample Count:</b> {{ orderData.reaction_count }} </td>
```

前端还使用 `sample_count` 字段来**合并显示订单项**（当一个产品有多条反应时），见 FormPrice.vue：
```html
<td v-if="index<1" :rowspan="order_item?.sample_count || 1">
```

---

### 🎯 简单总结

| 概念 | 含义 | 类比 |
|------|------|------|
| **Sample数** | 你送检的**样本管数/孔数** | 像"点了多少份外卖" |
| **BP数** | 每个样本的**DNA长度** | 像"每份外卖有多少克" |
| **数量阶梯** | Sample数越多，**单价越低** | 像"批发打折" |
