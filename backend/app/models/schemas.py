"""Pydantic 数据模型（API 请求/响应）"""
from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class DataSourceType(str, Enum):
    """数据源类型"""
    MYSQL = "mysql"
    POSTGRESQL = "postgresql"
    SQLITE = "sqlite"
    CHROMADB = "chroma"
    MILVUS = "milvus"


class ChartType(str, Enum):
    """图表类型"""
    PIE = "pie"
    DONUT = "donut"
    BAR = "bar"
    COLUMN = "column"
    LINE = "line"
    AREA = "area"
    SCATTER = "scatter"
    TABLE = "table"
    COMBO = "combo"


class ModelProvider(str, Enum):
    """模型提供商"""
    ALIYUN = "aliyun"
    DOUBAO = "doubao"
    KIMI = "kimi"
    OPENAI = "openai"


class ModelPurpose(str, Enum):
    """模型用途"""
    INTENT = "intent"
    SQL = "sql"
    SUMMARY = "summary"
    EMBEDDING = "embedding"


# ========== 数据源相关 ==========

class DataSourceBase(BaseModel):
    """数据源基础模型"""
    name: str = Field(..., description="数据源名称")
    type: DataSourceType = Field(..., description="数据源类型")
    description: Optional[str] = Field(None, description="描述")
    connection_info: dict[str, Any] = Field(..., description="连接信息")
    timeout: int = Field(30, description="超时时间（秒）")
    max_rows: int = Field(10000, description="最大返回行数")


class DataSourceCreate(DataSourceBase):
    """创建数据源请求"""
    pass


class DataSourceUpdate(BaseModel):
    """更新数据源请求"""
    name: Optional[str] = None
    description: Optional[str] = None
    connection_info: Optional[dict[str, Any]] = None
    timeout: Optional[int] = None
    max_rows: Optional[int] = None


class DataSourceResponse(DataSourceBase):
    """数据源响应"""
    id: int
    status: str = Field(..., description="状态：active/inactive/error")
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    
    class Config:
        from_attributes = True


# ========== 查询相关 ==========

class QueryRequest(BaseModel):
    """查询请求"""
    query_text: Optional[str] = Field(None, description="自然语言查询")
    data_source_id: Optional[int] = Field(None, description="数据源ID")
    template_id: Optional[int] = Field(None, description="模板ID")
    parameters: Optional[dict[str, Any]] = Field(default_factory=dict, description="参数")
    chart_type: Optional[ChartType] = Field(None, description="期望图表类型")


class QueryResponse(BaseModel):
    """查询响应"""
    query_id: str = Field(..., description="查询ID")
    status: str = Field(..., description="状态：pending/running/success/failed")
    data: Optional[list[dict[str, Any]]] = Field(None, description="查询结果数据")
    fields: Optional[list[dict[str, Any]]] = Field(None, description="字段元数据")
    recommended_charts: Optional[list[ChartType]] = Field(None, description="推荐图表类型")
    chart_config: Optional[dict[str, Any]] = Field(None, description="图表配置")
    generated_sql: Optional[str] = Field(None, description="生成的SQL")
    vector_request: Optional[dict[str, Any]] = Field(None, description="向量检索请求")
    duration_ms: Optional[float] = Field(None, description="执行耗时（毫秒）")
    error: Optional[str] = Field(None, description="错误信息")


# ========== 模型网关相关 ==========

class ModelConfigBase(BaseModel):
    """模型配置基础模型"""
    model_config = ConfigDict(protected_namespaces=())  # 禁用受保护命名空间检查，允许 model_ 开头的字段
    
    provider: ModelProvider = Field(..., description="提供商")
    model_name: str = Field(..., description="模型名称")
    purpose: list[ModelPurpose] = Field(..., description="用途列表")
    endpoint: Optional[str] = Field(None, description="API端点")
    api_key_ref: str = Field(..., description="API密钥引用")
    qps_limit: int = Field(100, description="QPS限制")
    daily_quota: Optional[int] = Field(None, description="每日配额")
    cost_metric: Optional[float] = Field(None, description="成本指标")


class ModelConfigCreate(ModelConfigBase):
    """创建模型配置请求"""
    pass


class ModelConfigResponse(ModelConfigBase):
    """模型配置响应"""
    id: int
    health_status: str = Field("unknown", description="健康状态")
    created_at: datetime
    updated_at: datetime
    avg_latency_ms: Optional[float] = Field(None, description="平均延迟（毫秒）")
    p95_latency_ms: Optional[float] = Field(None, description="P95延迟（毫秒）")
    success_rate: Optional[float] = Field(None, description="成功率")
    total_calls: Optional[int] = Field(None, description="总调用次数")
    
    class Config:
        from_attributes = True


class ModelConfigUpdate(BaseModel):
    """更新模型配置请求"""
    model_config = ConfigDict(protected_namespaces=())  # 禁用受保护命名空间检查，允许 model_ 开头的字段
    
    provider: Optional[ModelProvider] = None
    model_name: Optional[str] = None
    purpose: Optional[ModelPurpose] = None
    endpoint: Optional[str] = None
    api_key_ref: Optional[str] = None
    qps_limit: Optional[int] = None
    daily_quota: Optional[int] = None
    cost_metric: Optional[float] = None
    health_status: Optional[str] = None


class ModelRouteStrategy(BaseModel):
    """模型路由策略"""
    model_config = ConfigDict(protected_namespaces=())  # 禁用受保护命名空间检查，允许 model_ 开头的字段
    
    scenario: str = Field(..., description="场景")
    primary_model_id: int = Field(..., description="主模型ID")
    fallback_model_ids: list[int] = Field(default_factory=list, description="备选模型ID列表")
    rules: dict[str, Any] = Field(default_factory=dict, description="路由规则")


class ModelRouteStrategyCreate(ModelRouteStrategy):
    """创建路由策略请求"""
    pass


class ModelRouteStrategyUpdate(BaseModel):
    """更新路由策略请求"""
    primary_model_id: Optional[int] = None
    fallback_model_ids: Optional[list[int]] = None
    rules: Optional[dict[str, Any]] = None
    health_status: Optional[str] = None


class ModelRouteStrategyResponse(ModelRouteStrategy):
    """路由策略响应"""
    id: int
    health_status: str = Field("unknown", description="健康状态")
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ========== 模板相关 ==========

class TemplateStatus(str, Enum):
    """模板状态"""
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class TemplateParameterOption(BaseModel):
    """模板参数选项"""
    label: str
    value: Any


class TemplateParameter(BaseModel):
    """模板参数定义"""
    name: str = Field(..., description="参数名")
    type: str = Field(..., description="参数类型: string/number/date/datetime/boolean/select")
    label: str = Field(..., description="显示标签")
    required: bool = Field(False, description="是否必填")
    default_value: Optional[Any] = Field(None, description="默认值")
    options: Optional[list[TemplateParameterOption]] = Field(None, description="选项（用于select类型）")
    description: Optional[str] = Field(None, description="参数描述")


class TemplateBase(BaseModel):
    """模板基础模型"""
    name: str = Field(..., description="模板名称")
    description: Optional[str] = Field(None, description="描述")
    data_source_id: Optional[int] = Field(None, description="关联数据源ID")
    default_chart_type: Optional[ChartType] = Field(None, description="默认图表类型")
    nl_examples: list[str] = Field(default_factory=list, description="自然语言示例")
    parameters: list[TemplateParameter] = Field(default_factory=list, description="参数定义")
    default_model_scenario: Optional[str] = Field(None, description="默认模型场景")
    permission_scope: Optional[str] = Field(None, description="权限范围")


class TemplateCreate(TemplateBase):
    """创建模板请求"""
    pass


class TemplateUpdate(BaseModel):
    """更新模板请求"""
    name: Optional[str] = None
    description: Optional[str] = None
    data_source_id: Optional[int] = None
    default_chart_type: Optional[ChartType] = None
    nl_examples: Optional[list[str]] = None
    parameters: Optional[list[TemplateParameter]] = None
    default_model_scenario: Optional[str] = None
    permission_scope: Optional[str] = None
    status: Optional[TemplateStatus] = None


class TemplateResponse(TemplateBase):
    """模板响应"""
    id: int
    data_source_name: Optional[str] = Field(None, description="数据源名称")
    status: TemplateStatus = Field(TemplateStatus.DRAFT, description="状态")
    version: int = Field(1, description="版本号")
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    
    class Config:
        from_attributes = True


class TemplateVersionResponse(BaseModel):
    """模板版本响应"""
    id: int
    template_id: int
    version: int
    snapshot: dict[str, Any]
    created_at: datetime
    created_by: Optional[str] = None
    
    class Config:
        from_attributes = True


# 保留旧的别名以兼容
QueryTemplateBase = TemplateBase
QueryTemplateCreate = TemplateCreate
QueryTemplateResponse = TemplateResponse


# ========== 日志相关 ==========

class QueryLogResponse(BaseModel):
    """查询日志响应"""
    id: int
    user_id: Optional[str] = None
    data_source_id: Optional[int] = None
    query_text: Optional[str] = None
    generated_sql: Optional[str] = None
    vector_request: Optional[dict[str, Any]] = None
    duration_ms: float
    status: str
    error: Optional[str] = None
    trace_id: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class ModelCallLogResponse(BaseModel):
    """模型调用日志响应"""
    model_config = ConfigDict(
        protected_namespaces=(),  # 禁用受保护命名空间检查，允许 model_ 开头的字段
        from_attributes=True
    )
    
    id: int
    request_id: str
    scenario: str
    model_id: int
    latency_ms: float
    tokens_in: Optional[int] = None
    tokens_out: Optional[int] = None
    cost_est: Optional[float] = None
    status: str
    error_type: Optional[str] = None
    created_at: datetime


# ========== 模型网关统计 ==========

class ProviderStat(BaseModel):
    """提供商统计"""
    provider: ModelProvider
    total_models: int
    total_calls: int
    success_rate: Optional[float] = None
    avg_latency_ms: Optional[float] = None
    health_status: str = "unknown"


class ModelStat(BaseModel):
    """单模型统计"""
    model_config = ConfigDict(protected_namespaces=())  # 禁用受保护命名空间检查，允许 model_ 开头的字段
    
    model_id: int
    model_name: str
    provider: ModelProvider
    purpose: list[ModelPurpose]
    health_status: str
    success_rate: Optional[float] = None
    avg_latency_ms: Optional[float] = None
    p95_latency_ms: Optional[float] = None
    total_calls: Optional[int] = None


class ModelGatewayStatsResponse(BaseModel):
    """模型网关统计响应"""
    providers: list[ProviderStat] = Field(default_factory=list)
    models: list[ModelStat] = Field(default_factory=list)


# ========== Agent 对话相关 ==========

class ChatMessageRole(str, Enum):
    """消息角色"""
    USER = "user"
    ASSISTANT = "assistant"


class ChatMessageType(str, Enum):
    """消息类型"""
    TEXT = "text"
    CHART = "chart"
    TABLE = "table"
    PLAN = "plan"
    ERROR = "error"


class ChatSendMessage(BaseModel):
    """发送聊天消息请求"""
    content: str = Field(..., description="消息内容")
    data_source_id: Optional[int] = Field(None, description="数据源ID（可在对话中指定）")


class ChatMessageResponse(BaseModel):
    """聊天消息响应"""
    id: int
    session_id: int
    role: ChatMessageRole
    content: str
    message_type: ChatMessageType = ChatMessageType.TEXT
    chart_type: Optional[str] = None
    chart_option: Optional[dict[str, Any]] = None
    table_data: Optional[list[dict[str, Any]]] = None
    table_columns: Optional[list[str]] = None
    generated_sql: Optional[str] = None
    plan_data: Optional[dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ChatSessionCreate(BaseModel):
    """创建会话请求"""
    title: Optional[str] = Field(None, description="会话标题")
    data_source_id: Optional[int] = Field(None, description="默认数据源ID")


class ChatSessionResponse(BaseModel):
    """会话响应"""
    id: int
    title: str
    data_source_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    messages: list[ChatMessageResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class ChatSessionListItem(BaseModel):
    """会话列表项"""
    id: int
    title: str
    data_source_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    message_count: int = 0
    last_message: Optional[str] = None

    class Config:
        from_attributes = True