-- ============================================
-- DataMind 数据库初始化脚本 (PostgreSQL)
-- ============================================
-- 此脚本创建所有必需的数据表
-- 执行方式: psql -U datamind -d datamind -f sql/init_schema.sql
-- ============================================

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. 数据源表
-- ============================================
CREATE TABLE IF NOT EXISTS data_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    connection_info JSONB NOT NULL,
    timeout INTEGER DEFAULT 30,
    max_rows INTEGER DEFAULT 10000,
    status VARCHAR(50) DEFAULT 'inactive',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_data_sources_name ON data_sources(name);
CREATE INDEX IF NOT EXISTS idx_data_sources_type ON data_sources(type);
CREATE INDEX IF NOT EXISTS idx_data_sources_status ON data_sources(status);

-- ============================================
-- 2. 模型配置表
-- ============================================
CREATE TABLE IF NOT EXISTS model_configs (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(50) NOT NULL,
    model_name VARCHAR(255) NOT NULL,
    purpose JSONB NOT NULL DEFAULT '[]'::jsonb,
    endpoint VARCHAR(500),
    api_key_ref VARCHAR(255) NOT NULL,
    qps_limit INTEGER DEFAULT 100,
    daily_quota INTEGER,
    cost_metric DOUBLE PRECISION,
    health_status VARCHAR(50) DEFAULT 'unknown',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_model_configs_provider ON model_configs(provider);
CREATE INDEX IF NOT EXISTS idx_model_configs_health_status ON model_configs(health_status);

-- ============================================
-- 3. 模型路由策略表
-- ============================================
CREATE TABLE IF NOT EXISTS model_route_strategies (
    id SERIAL PRIMARY KEY,
    scenario VARCHAR(100) NOT NULL UNIQUE,
    primary_model_id INTEGER NOT NULL,
    fallback_model_ids JSONB DEFAULT '[]'::jsonb,
    rules JSONB DEFAULT '{}'::jsonb,
    health_status VARCHAR(50) DEFAULT 'unknown',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_model_route_strategies_scenario ON model_route_strategies(scenario);
CREATE INDEX IF NOT EXISTS idx_model_route_strategies_primary_model_id ON model_route_strategies(primary_model_id);

-- ============================================
-- 4. 查询模板表
-- ============================================
CREATE TABLE IF NOT EXISTS query_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    data_source_id INTEGER,
    default_chart_type VARCHAR(50),
    nl_examples JSONB DEFAULT '[]'::jsonb,
    parameters JSONB DEFAULT '[]'::jsonb,
    default_model_scenario VARCHAR(100),
    permission_scope VARCHAR(50),
    status VARCHAR(50) DEFAULT 'draft',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_query_templates_name ON query_templates(name);
CREATE INDEX IF NOT EXISTS idx_query_templates_data_source_id ON query_templates(data_source_id);
CREATE INDEX IF NOT EXISTS idx_query_templates_status ON query_templates(status);

-- ============================================
-- 5. 模板版本历史表
-- ============================================
CREATE TABLE IF NOT EXISTS template_versions (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL,
    version INTEGER NOT NULL,
    snapshot JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_template_versions_template_id ON template_versions(template_id);
CREATE INDEX IF NOT EXISTS idx_template_versions_version ON template_versions(version);

-- ============================================
-- 6. 查询日志表
-- ============================================
CREATE TABLE IF NOT EXISTS query_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255),
    data_source_id INTEGER,
    query_text TEXT,
    generated_sql TEXT,
    vector_request JSONB,
    duration_ms DOUBLE PRECISION NOT NULL,
    status VARCHAR(50) NOT NULL,
    error TEXT,
    trace_id VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_query_logs_user_id ON query_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_query_logs_data_source_id ON query_logs(data_source_id);
CREATE INDEX IF NOT EXISTS idx_query_logs_trace_id ON query_logs(trace_id);
CREATE INDEX IF NOT EXISTS idx_query_logs_created_at ON query_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_query_logs_status ON query_logs(status);

-- ============================================
-- 7. 模型调用日志表
-- ============================================
CREATE TABLE IF NOT EXISTS model_call_logs (
    id SERIAL PRIMARY KEY,
    request_id VARCHAR(255) NOT NULL,
    scenario VARCHAR(100) NOT NULL,
    model_id INTEGER NOT NULL,
    latency_ms DOUBLE PRECISION NOT NULL,
    tokens_in INTEGER,
    tokens_out INTEGER,
    cost_est DOUBLE PRECISION,
    status VARCHAR(50) NOT NULL,
    error_type VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_model_call_logs_request_id ON model_call_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_model_call_logs_scenario ON model_call_logs(scenario);
CREATE INDEX IF NOT EXISTS idx_model_call_logs_model_id ON model_call_logs(model_id);
CREATE INDEX IF NOT EXISTS idx_model_call_logs_created_at ON model_call_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_model_call_logs_status ON model_call_logs(status);

-- ============================================
-- 8. 配额使用表
-- ============================================
CREATE TABLE IF NOT EXISTS quota_usage (
    id SERIAL PRIMARY KEY,
    model_id INTEGER NOT NULL,
    date TIMESTAMP NOT NULL,
    calls INTEGER DEFAULT 0,
    tokens_in INTEGER DEFAULT 0,
    tokens_out INTEGER DEFAULT 0,
    success_rate DOUBLE PRECISION DEFAULT 0.0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quota_usage_model_id ON quota_usage(model_id);
CREATE INDEX IF NOT EXISTS idx_quota_usage_date ON quota_usage(date);

-- ============================================
-- 创建更新时间触发器函数
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要自动更新 updated_at 的表创建触发器
-- 使用 DROP IF EXISTS 确保可以安全地重复执行
DROP TRIGGER IF EXISTS update_data_sources_updated_at ON data_sources;
CREATE TRIGGER update_data_sources_updated_at BEFORE UPDATE ON data_sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_model_configs_updated_at ON model_configs;
CREATE TRIGGER update_model_configs_updated_at BEFORE UPDATE ON model_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_model_route_strategies_updated_at ON model_route_strategies;
CREATE TRIGGER update_model_route_strategies_updated_at BEFORE UPDATE ON model_route_strategies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_query_templates_updated_at ON query_templates;
CREATE TRIGGER update_query_templates_updated_at BEFORE UPDATE ON query_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_quota_usage_updated_at ON quota_usage;
CREATE TRIGGER update_quota_usage_updated_at BEFORE UPDATE ON quota_usage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 完成
-- ============================================
COMMENT ON TABLE data_sources IS '数据源配置表';
COMMENT ON TABLE model_configs IS '模型配置表';
COMMENT ON TABLE model_route_strategies IS '模型路由策略表';
COMMENT ON TABLE query_templates IS '查询模板表';
COMMENT ON TABLE template_versions IS '模板版本历史表';
COMMENT ON TABLE query_logs IS '查询日志表';
COMMENT ON TABLE model_call_logs IS '模型调用日志表';
COMMENT ON TABLE quota_usage IS '配额使用表';

