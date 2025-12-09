"""数据库模型（SQLAlchemy ORM）"""
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Text, JSON, Float, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


class DataSource(Base):
    """数据源表"""
    __tablename__ = "data_sources"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True, index=True)
    type = Column(String(50), nullable=False)  # mysql/postgresql/chroma/milvus
    description = Column(Text, nullable=True)
    connection_info = Column(JSON, nullable=False)  # 加密存储
    timeout = Column(Integer, default=30)
    max_rows = Column(Integer, default=10000)
    status = Column(String(50), default="inactive")  # active/inactive/error
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    created_by = Column(String(255), nullable=True)


class ModelConfig(Base):
    """模型配置表"""
    __tablename__ = "model_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String(50), nullable=False)  # aliyun/doubao/kimi/openai
    model_name = Column(String(255), nullable=False)
    purpose = Column(JSON, nullable=False, default=list)  # 多用途列表
    endpoint = Column(String(500), nullable=True)
    api_key_ref = Column(String(255), nullable=False)  # 密钥引用
    qps_limit = Column(Integer, default=100)
    daily_quota = Column(Integer, nullable=True)
    cost_metric = Column(Float, nullable=True)
    health_status = Column(String(50), default="unknown")  # healthy/unhealthy/unknown
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)


class ModelRouteStrategy(Base):
    """模型路由策略表"""
    __tablename__ = "model_route_strategies"
    
    id = Column(Integer, primary_key=True, index=True)
    scenario = Column(String(100), nullable=False, unique=True, index=True)
    primary_model_id = Column(Integer, nullable=False)
    fallback_model_ids = Column(JSON, default=list)  # [model_id1, model_id2, ...]
    rules = Column(JSON, default=dict)  # 路由规则
    health_status = Column(String(50), default="unknown")
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)


class QueryTemplate(Base):
    """查询模板表"""
    __tablename__ = "query_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    data_source_id = Column(Integer, nullable=True)  # 可选关联数据源
    default_chart_type = Column(String(50), nullable=True)  # 默认图表类型
    nl_examples = Column(JSON, default=list)  # 自然语言示例
    parameters = Column(JSON, default=list)  # 参数定义列表
    default_model_scenario = Column(String(100), nullable=True)  # 默认模型场景
    permission_scope = Column(String(50), nullable=True)  # 权限范围: public/team/private
    status = Column(String(50), default="draft")  # draft/published/archived
    version = Column(Integer, default=1)  # 版本号
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    created_by = Column(String(255), nullable=True)


class TemplateVersion(Base):
    """模板版本历史表"""
    __tablename__ = "template_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, nullable=False, index=True)
    version = Column(Integer, nullable=False)
    snapshot = Column(JSON, nullable=False)  # 模板快照
    created_at = Column(DateTime, default=func.now(), nullable=False)
    created_by = Column(String(255), nullable=True)


class QueryLog(Base):
    """查询日志表"""
    __tablename__ = "query_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), nullable=True, index=True)
    data_source_id = Column(Integer, nullable=True, index=True)
    query_text = Column(Text, nullable=True)
    generated_sql = Column(Text, nullable=True)
    vector_request = Column(JSON, nullable=True)
    duration_ms = Column(Float, nullable=False)
    status = Column(String(50), nullable=False)  # success/failed/timeout
    error = Column(Text, nullable=True)
    trace_id = Column(String(255), nullable=True, index=True)
    created_at = Column(DateTime, default=func.now(), nullable=False, index=True)


class ModelCallLog(Base):
    """模型调用日志表"""
    __tablename__ = "model_call_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(String(255), nullable=False, index=True)
    scenario = Column(String(100), nullable=False, index=True)
    model_id = Column(Integer, nullable=False, index=True)
    latency_ms = Column(Float, nullable=False)
    tokens_in = Column(Integer, nullable=True)
    tokens_out = Column(Integer, nullable=True)
    cost_est = Column(Float, nullable=True)
    status = Column(String(50), nullable=False)  # success/failed/timeout
    error_type = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False, index=True)


class QuotaUsage(Base):
    """配额使用表"""
    __tablename__ = "quota_usage"
    
    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, nullable=False, index=True)
    date = Column(DateTime, nullable=False, index=True)
    calls = Column(Integer, default=0)
    tokens_in = Column(Integer, default=0)
    tokens_out = Column(Integer, default=0)
    success_rate = Column(Float, default=0.0)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
