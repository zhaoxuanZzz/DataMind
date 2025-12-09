-- ============================================
-- DataMind 测试数据源初始化脚本 (PostgreSQL)
-- ============================================
-- 此脚本在主数据库中创建测试数据源的配置
-- 执行方式: psql -U datamind -d datamind -f sql/init_test_datasource.sql
-- 或使用: db.bat test-datasource / ./db.sh test-datasource
-- ============================================

-- 注意：此脚本假设测试数据库 datamind_test 已经创建
-- 如果未创建，请先执行: db.bat test-db

-- ============================================
-- 1. 创建测试数据源配置
-- ============================================

-- 插入测试数据源（如果不存在）
INSERT INTO data_sources (
    name,
    type,
    description,
    connection_info,
    timeout,
    max_rows,
    status,
    created_by
)
SELECT 
    '测试数据库',
    'postgresql',
    '测试数据库，包含示例订单、产品、客户等数据，用于测试系统模板功能',
    jsonb_build_object(
        'host', 'localhost',
        'port', 5432,
        'user', 'datamind',
        'password', 'datamind123',
        'database', 'datamind_test'
    ),
    30,
    10000,
    'active',
    'system'
WHERE NOT EXISTS (
    SELECT 1 FROM data_sources WHERE name = '测试数据库'
);

-- ============================================
-- 2. 更新模板关联到测试数据源
-- ============================================

-- 获取测试数据源的ID
DO $$
DECLARE
    test_datasource_id INTEGER;
BEGIN
    -- 获取测试数据源ID
    SELECT id INTO test_datasource_id 
    FROM data_sources 
    WHERE name = '测试数据库';
    
    IF test_datasource_id IS NOT NULL THEN
        -- 更新所有模板的数据源ID
        UPDATE query_templates 
        SET data_source_id = test_datasource_id
        WHERE name IN (
            '销售数据统计',
            '用户活跃度分析',
            '产品分类销售占比',
            '地区销售排行',
            '月度趋势对比',
            '客户价值分析',
            '库存预警',
            '渠道效果分析'
        );
        
        RAISE NOTICE '已更新 % 个模板关联到测试数据源 (ID: %)', 
            (SELECT COUNT(*) FROM query_templates WHERE data_source_id = test_datasource_id),
            test_datasource_id;
    ELSE
        RAISE NOTICE '未找到测试数据源，请先创建测试数据库';
    END IF;
END $$;

-- ============================================
-- 3. 显示结果
-- ============================================

SELECT 
    '测试数据源初始化完成！' AS message,
    (SELECT id FROM data_sources WHERE name = '测试数据库') AS datasource_id,
    (SELECT COUNT(*) FROM query_templates WHERE data_source_id = (SELECT id FROM data_sources WHERE name = '测试数据库')) AS linked_templates_count;


