# Product List 与 Product Category 分析

## 1. 两个模块的来源

从代码导入可以明确看出：

```javascript
// Product List 相关 API
import { getList, setActive, del, sort } from '@/api/product'

// Product Category 相关 API  
import { getList as getCategory } from '@/api/product-category'
```

## 2. 对应的表结构推测

| 模块 | 可能的表名 | 作用 |
|------|-----------|------|
| **Product List** | `products` | 存储具体产品信息 |
| **Product Category** | `product_categories` | 存储产品分类（树形结构） |

## 3. 关系分析

### Product List（产品列表）
从表格列可以看出产品的字段：
```
id, business_line, service_line, name, catalog_num, 
price, turnaround, addons( addon列表 ), is_active, sort
```

### Product Category（产品分类）
```javascript
// 搜索配置 - 产品通过 category_id 关联到分类
const search = [
  {
    field: 'category_id',  // 外键关联
    label: 'Category',
    type: 'el-select',
    options: []  // 选项来自 Product Category
  },
  ...
]
```

还有一个被注释掉的字段也印证了这个关系：
```javascript
// {prop: 'parent_category', label: 'Category', minWidth: 150},  ← 注释掉的产品分类显示
```

## 4. ER 关系图

```
┌─────────────────────┐       ┌─────────────────────┐
│  product_categories │       │      products       │
├─────────────────────┤       ├─────────────────────┤
│ id                  │       │ id                  │
│ name                │       │ category_id   ───────┼──┐
│ parent_category_id  │◄──────│ business_line        │  │
│ (自关联，树形结构)  │       │ service_line         │  │
│ sort                │       │ name                 │  │
│ is_active           │       │ catalog_num          │  │
└─────────────────────┘       │ price                │  │
        ▲                     │ turnaround           │  │
        │ 1:N                 │ is_active            │  │
        └─────────────────────│ sort                 │  │
                              └─────────────────────┘   │
                                                         │
                              所属关系: 1个分类 ←── N个产品
```

## 5. 总结

| 对比项 | Product Category | Product List |
|--------|------------------|--------------|
| **用途** | 产品分类/类别 | 具体产品实例 |
| **层级** | 支持树形结构（parent_category） | 叶子节点 |
| **关联** | 被 `products.category_id` 引用 | 通过 `category_id` 关联到分类 |
| **关系** | 1个分类 | N个产品 |
| **用途** | 搜索筛选、分类管理 | 展示、编辑、删除具体产品 |

**简单理解**：`Product Category` 是"文件夹"，`Product List` 是"文件"。一个文件夹可以包含多个文件。