-- ============================================
-- DataMind 初始化数据脚本 (PostgreSQL)
-- ============================================
-- 此脚本插入示例数据（可选）
-- 执行方式: psql -U datamind -d datamind -f sql/init_data.sql
-- 或使用: db.bat data / ./db.sh data
-- ============================================

-- 注意：此脚本会插入示例数据，使用 WHERE NOT EXISTS 避免重复插入
-- 建议在生产环境谨慎使用

-- ============================================
-- 示例模板数据
-- ============================================

-- 示例模板1：销售数据统计
INSERT INTO query_templates (
    name, 
    description, 
    data_source_id, 
    default_chart_type,
    nl_examples,
    parameters,
    default_model_scenario,
    permission_scope,
    status,
    version,
    created_by
)
SELECT 
    '销售数据统计',
    '统计指定时间范围内的销售数据，包括销售额、订单数等指标',
    1,
    'line',
    '["查询最近一个月的销售数据", "显示本周的销售趋势", "统计上个月的销售额"]'::jsonb,
    '[{"name": "start_date", "type": "date", "label": "开始日期", "required": true}, {"name": "end_date", "type": "date", "label": "结束日期", "required": true}]'::jsonb,
    'sql',
    'public',
    'draft',
    1,
    'system'
WHERE NOT EXISTS (
    SELECT 1 FROM query_templates WHERE name = '销售数据统计'
);

-- 示例模板2：用户活跃度分析
INSERT INTO query_templates (
    name, 
    description, 
    data_source_id, 
    default_chart_type,
    nl_examples,
    parameters,
    default_model_scenario,
    permission_scope,
    status,
    version,
    created_by
)
SELECT 
    '用户活跃度分析',
    '分析用户在不同时间段的活跃度，支持按天、周、月统计',
    1,
    'area',
    '["查看今天的活跃用户数", "统计本周的用户活跃度", "分析上月的用户增长趋势"]'::jsonb,
    '[{"name": "start_date", "type": "date", "label": "开始日期", "required": true}, {"name": "end_date", "type": "date", "label": "结束日期", "required": true}, {"name": "group_by", "type": "select", "label": "分组方式", "required": false, "options": [{"label": "按天", "value": "day"}, {"label": "按周", "value": "week"}, {"label": "按月", "value": "month"}]}]'::jsonb,
    'sql',
    'public',
    'draft',
    1,
    'system'
WHERE NOT EXISTS (
    SELECT 1 FROM query_templates WHERE name = '用户活跃度分析'
);

-- 示例模板3：产品分类销售占比
INSERT INTO query_templates (
    name, 
    description, 
    data_source_id, 
    default_chart_type,
    nl_examples,
    parameters,
    default_model_scenario,
    permission_scope,
    status,
    version,
    created_by
)
SELECT 
    '产品分类销售占比',
    '分析不同产品分类的销售占比情况',
    1,
    'pie',
    '["显示各产品分类的销售占比", "查看哪个分类销售额最高", "分析产品分类分布"]'::jsonb,
    '[{"name": "date_range", "type": "select", "label": "时间范围", "required": true, "options": [{"label": "最近一周", "value": "7d"}, {"label": "最近一月", "value": "30d"}, {"label": "最近三月", "value": "90d"}]}]'::jsonb,
    'sql',
    'public',
    'draft',
    1,
    'system'
WHERE NOT EXISTS (
    SELECT 1 FROM query_templates WHERE name = '产品分类销售占比'
);

-- 示例模板4：地区销售排行
INSERT INTO query_templates (
    name, 
    description, 
    data_source_id, 
    default_chart_type,
    nl_examples,
    parameters,
    default_model_scenario,
    permission_scope,
    status,
    version,
    created_by
)
SELECT 
    '地区销售排行',
    '按地区统计销售额，支持Top N排行',
    1,
    'bar',
    '["显示各地区的销售排行", "查看销售额最高的地区", "分析地区销售分布"]'::jsonb,
    '[{"name": "start_date", "type": "date", "label": "开始日期", "required": true}, {"name": "end_date", "type": "date", "label": "结束日期", "required": true}, {"name": "top_n", "type": "number", "label": "显示数量", "required": false, "default_value": 10}]'::jsonb,
    'sql',
    'public',
    'draft',
    1,
    'system'
WHERE NOT EXISTS (
    SELECT 1 FROM query_templates WHERE name = '地区销售排行'
);

-- 示例模板5：月度趋势对比
INSERT INTO query_templates (
    name, 
    description, 
    data_source_id, 
    default_chart_type,
    nl_examples,
    parameters,
    default_model_scenario,
    permission_scope,
    status,
    version,
    created_by
)
SELECT 
    '月度趋势对比',
    '对比不同年份的月度数据趋势',
    1,
    'line',
    '["对比2023和2024年的月度销售", "查看不同年份的趋势变化", "分析年度增长情况"]'::jsonb,
    '[{"name": "year1", "type": "number", "label": "年份1", "required": true, "default_value": 2023}, {"name": "year2", "type": "number", "label": "年份2", "required": true, "default_value": 2024}]'::jsonb,
    'sql',
    'public',
    'draft',
    1,
    'system'
WHERE NOT EXISTS (
    SELECT 1 FROM query_templates WHERE name = '月度趋势对比'
);

-- 示例模板6：客户价值分析
INSERT INTO query_templates (
    name, 
    description, 
    data_source_id, 
    default_chart_type,
    nl_examples,
    parameters,
    default_model_scenario,
    permission_scope,
    status,
    version,
    created_by
)
SELECT 
    '客户价值分析',
    '分析高价值客户，按消费金额分层统计',
    1,
    'donut',
    '["查看高价值客户占比", "分析客户价值分布", "统计不同价值层级的客户数"]'::jsonb,
    '[{"name": "start_date", "type": "date", "label": "开始日期", "required": true}, {"name": "end_date", "type": "date", "label": "结束日期", "required": true}]'::jsonb,
    'sql',
    'public',
    'draft',
    1,
    'system'
WHERE NOT EXISTS (
    SELECT 1 FROM query_templates WHERE name = '客户价值分析'
);

-- 示例模板7：库存预警
INSERT INTO query_templates (
    name, 
    description, 
    data_source_id, 
    default_chart_type,
    nl_examples,
    parameters,
    default_model_scenario,
    permission_scope,
    status,
    version,
    created_by
)
SELECT 
    '库存预警',
    '查询库存低于阈值的商品',
    1,
    'table',
    '["查看库存不足的商品", "显示需要补货的商品列表", "检查库存预警"]'::jsonb,
    '[{"name": "threshold", "type": "number", "label": "库存阈值", "required": true, "default_value": 100}]'::jsonb,
    'sql',
    'public',
    'draft',
    1,
    'system'
WHERE NOT EXISTS (
    SELECT 1 FROM query_templates WHERE name = '库存预警'
);

-- 示例模板8：渠道效果分析
INSERT INTO query_templates (
    name, 
    description, 
    data_source_id, 
    default_chart_type,
    nl_examples,
    parameters,
    default_model_scenario,
    permission_scope,
    status,
    version,
    created_by
)
SELECT 
    '渠道效果分析',
    '分析不同营销渠道的转化效果和ROI',
    1,
    'column',
    '["查看各渠道的转化率", "分析渠道效果", "对比不同渠道的表现"]'::jsonb,
    '[{"name": "start_date", "type": "date", "label": "开始日期", "required": true}, {"name": "end_date", "type": "date", "label": "结束日期", "required": true}]'::jsonb,
    'sql',
    'public',
    'draft',
    1,
    'system'
WHERE NOT EXISTS (
    SELECT 1 FROM query_templates WHERE name = '渠道效果分析'
);

-- ============================================
-- 完成
-- ============================================
SELECT '初始化数据完成！' AS message;
