---
type: source
title: "Promotion 列表导出 CSV 功能实现"
created: 2026-05-13
updated: 2026-05-13
tags: [promotion, csv, export, streaming, backend]
related: [promotion-export-api, streaming-export-模式, csv-export-规范, promotion-index-vue, iter-paged-export-tool, streaming-export-response-tool]
sources: ["2026-05-13_1435_promotion_export_csv.md"]
---
# Promotion 列表导出 CSV 功能实现

## 需求概述

用户需要在 Promotion 管理页面实现导出功能：依据搜索条件导出所有符合条件的全部数据，在浏览器端下载 CSV 文件，文件命名格式为 `promotion-YYYYMMDD_HHmmss.csv`。

## 问题分析

最初尝试在前端通过调用 `getList` API 获取数据后生成 CSV，但发现问题：后端 `paginate` 方法有默认分页大小 `15`，即使移除 `page/pagesize` 参数，仍然只返回 15 条数据，无法获取全部数据进行导出。

## 技术选型

选择方案为**后端新增流式导出接口**，类似项目中已有的 `promotion_tracking_download` 接口：后端直接查询数据库，不受分页限制，使用 `iter_paged_export` + `streaming_export_response` 流式导出，避免前端内存溢出，适合大数据量。

## API 接口

`GET /api/v1/backend/promotion/download` 接口接收 Query String 参数，包括 `promotion_code`（促销代码模糊匹配）、`service`（服务/产品线）、`customer`（客户）、`region`（区域）、`created_at`（日期范围 start/end），返回 `Content-Type: text/csv` 的流式响应，文件名为 `promotion-{datetime}.csv`。

## CSV 列定义

导出的 CSV 包含以下列：Type（类型 Promotion/Referral Code/Coupon）、Group（分组）、Code（促销代码）、Name（描述）、Date from（开始日期 MM/DD/YYYY）、Date to（结束日期 MM/DD/YYYY）、Usage（使用方式 Auto/No）、Quantity（数量或 Unlimited）、Discount Type（折扣类型）、Discount Value（折扣值）、Creator（创建人）、Updater（更新人）。

## 架构决策

选择后端流式导出而非前端生成 CSV，原因有三：后端分页限制导致前端无法获取全部数据；流式导出避免大文件占用服务器内存；与项目现有 `promotion_tracking_download` 模式一致。

## 风险提示

大数据量性能方面，虽然使用流式导出，但 SQL 聚合查询（GROUP BY）可能较慢；Tier 数据格式方面，Tier 折扣数据以 JSON 字符串形式导出，可读性有限；Service/Customer/Region 过滤使用子查询实现，可能影响性能。

## 待解答问题

导出数据量上限是多少？是否需要添加限制？Tier 折扣格式是否满足业务需求？是否需要导出进度提示？