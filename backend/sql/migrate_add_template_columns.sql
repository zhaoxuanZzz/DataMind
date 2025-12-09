-- ============================================
-- 迁移脚本：为 query_templates 表添加缺失的列
-- ============================================
-- 此脚本用于修复已存在的表结构
-- 执行方式: psql -U datamind -d datamind -f sql/migrate_add_template_columns.sql
-- ============================================

-- 添加 default_chart_type 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'query_templates' 
        AND column_name = 'default_chart_type'
    ) THEN
        ALTER TABLE query_templates 
        ADD COLUMN default_chart_type VARCHAR(50) NULL;
        RAISE NOTICE '已添加列: default_chart_type';
    ELSE
        RAISE NOTICE '列已存在: default_chart_type';
    END IF;
END $$;

-- 添加 nl_examples 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'query_templates' 
        AND column_name = 'nl_examples'
    ) THEN
        ALTER TABLE query_templates 
        ADD COLUMN nl_examples JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE '已添加列: nl_examples';
    ELSE
        RAISE NOTICE '列已存在: nl_examples';
    END IF;
END $$;

-- 添加 parameters 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'query_templates' 
        AND column_name = 'parameters'
    ) THEN
        ALTER TABLE query_templates 
        ADD COLUMN parameters JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE '已添加列: parameters';
    ELSE
        RAISE NOTICE '列已存在: parameters';
    END IF;
END $$;

-- 添加 default_model_scenario 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'query_templates' 
        AND column_name = 'default_model_scenario'
    ) THEN
        ALTER TABLE query_templates 
        ADD COLUMN default_model_scenario VARCHAR(100) NULL;
        RAISE NOTICE '已添加列: default_model_scenario';
    ELSE
        RAISE NOTICE '列已存在: default_model_scenario';
    END IF;
END $$;

-- 添加 permission_scope 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'query_templates' 
        AND column_name = 'permission_scope'
    ) THEN
        ALTER TABLE query_templates 
        ADD COLUMN permission_scope VARCHAR(50) NULL;
        RAISE NOTICE '已添加列: permission_scope';
    ELSE
        RAISE NOTICE '列已存在: permission_scope';
    END IF;
END $$;

-- 添加 status 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'query_templates' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE query_templates 
        ADD COLUMN status VARCHAR(50) DEFAULT 'draft';
        RAISE NOTICE '已添加列: status';
    ELSE
        RAISE NOTICE '列已存在: status';
    END IF;
END $$;

-- 添加 version 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'query_templates' 
        AND column_name = 'version'
    ) THEN
        ALTER TABLE query_templates 
        ADD COLUMN version INTEGER DEFAULT 1;
        RAISE NOTICE '已添加列: version';
    ELSE
        RAISE NOTICE '列已存在: version';
    END IF;
END $$;

-- 添加 created_by 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'query_templates' 
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE query_templates 
        ADD COLUMN created_by VARCHAR(255) NULL;
        RAISE NOTICE '已添加列: created_by';
    ELSE
        RAISE NOTICE '列已存在: created_by';
    END IF;
END $$;

-- ============================================
-- 完成
-- ============================================
SELECT '迁移完成！' AS message;

