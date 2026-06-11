1. Percentage Discount (percent)
按百分比减免，按 price × discount% × quantity 计算。例如：原价 $100，折扣 10%，数量 3 件 → 减免 $100 × 10% × 3 = $30

2. Fixed Amount Discount (fixed)
固定金额减免，按商品金额比例分摊到各商品。例如：购物车总计 $500，fixed 折扣 $50，则按各商品金额占比分摊这 $50。

3. Per Fixed Amount Discount (per_fixed)
每件商品减免固定金额 × 数量。例如：原价 $100 每件，per_fixed=$10，购买 3 件 → 减免 $10 × 3 = $30。但对于 is_bp 产品只计算一次（不乘数量）。

折扣类型	计算方式	示例
percent	price × % × qty	10% off $100 × 3 = $30 off
fixed	总金额按比例分摊	$50 off total, distributed by proportion
per_fixed	$X × qty (普通产品)	$10 off each × 3 = $30 off
关键限制：per_fixed 不能与其他折扣类型组合使用。