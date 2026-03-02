// 数据源类型
export enum DataSourceType {
  MYSQL = 'mysql',
  POSTGRESQL = 'postgresql',
  CHROMADB = 'chroma',
  MILVUS = 'milvus',
}

// 图表类型
export enum ChartType {
  PIE = 'pie',
  DONUT = 'donut',
  BAR = 'bar',
  COLUMN = 'column',
  LINE = 'line',
  AREA = 'area',
  SCATTER = 'scatter',
  TABLE = 'table',
  COMBO = 'combo',
}

// 数据源相关
export interface DataSourceCreate {
  name: string
  type: DataSourceType
  description?: string
  connection_info: Record<string, any>
  timeout?: number
  max_rows?: number
}

export interface DataSourceUpdate {
  name?: string
  description?: string
  connection_info?: Record<string, any>
  timeout?: number
  max_rows?: number
}

export interface DataSourceResponse {
  id: number
  name: string
  type: DataSourceType
  description?: string
  connection_info: Record<string, any>
  timeout: number
  max_rows: number
  status: string
  created_at: string
  updated_at: string
  created_by?: string
}

// 查询相关
export interface QueryRequest {
  query_text?: string
  data_source_id?: number
  template_id?: number
  parameters?: Record<string, any>
  chart_type?: ChartType
}

export interface QueryResponse {
  query_id: string
  status: string
  data?: Array<Record<string, any>>
  fields?: Array<Record<string, any>>
  recommended_charts?: ChartType[]
  chart_config?: Record<string, any>
  generated_sql?: string
  vector_request?: Record<string, any>
  duration_ms?: number
  error?: string
}

// 模型网关
export enum ModelProvider {
  ALIYUN = 'aliyun',
  DOUBAO = 'doubao',
  KIMI = 'kimi',
  OPENAI = 'openai',
}

export enum ModelPurpose {
  INTENT = 'intent',
  SQL = 'sql',
  SUMMARY = 'summary',
  EMBEDDING = 'embedding',
}

export interface ModelConfig {
  id: number
  provider: ModelProvider
  model_name: string
  purpose: ModelPurpose[]
  endpoint?: string | null
  api_key_ref: string
  qps_limit: number
  daily_quota?: number | null
  cost_metric?: number | null
  health_status: string
  avg_latency_ms?: number | null
  p95_latency_ms?: number | null
  success_rate?: number | null
  total_calls?: number | null
  created_at: string
  updated_at: string
}

export type ModelConfigCreate = Omit<
  ModelConfig,
  | 'id'
  | 'health_status'
  | 'avg_latency_ms'
  | 'p95_latency_ms'
  | 'success_rate'
  | 'total_calls'
  | 'created_at'
  | 'updated_at'
>

export type ModelConfigUpdate = Partial<ModelConfigCreate> & {
  health_status?: string
}

export interface ModelRouteStrategy {
  id: number
  scenario: string
  primary_model_id: number
  fallback_model_ids: number[]
  rules: Record<string, any>
  health_status: string
  created_at: string
  updated_at: string
}

export type ModelRouteStrategyCreate = Omit<
  ModelRouteStrategy,
  'id' | 'health_status' | 'created_at' | 'updated_at'
>
export type ModelRouteStrategyUpdate = Partial<ModelRouteStrategyCreate> & {
  health_status?: string
}

export interface ModelCallLog {
  id: number
  request_id: string
  scenario: string
  model_id: number
  latency_ms: number
  tokens_in?: number | null
  tokens_out?: number | null
  cost_est?: number | null
  status: string
  error_type?: string | null
  created_at: string
}

export interface ProviderStat {
  provider: ModelProvider
  total_models: number
  total_calls: number
  success_rate?: number | null
  avg_latency_ms?: number | null
  health_status: string
}

export interface ModelStat {
  model_id: number
  model_name: string
  provider: ModelProvider
  purpose: ModelPurpose[]
  health_status: string
  success_rate?: number | null
  avg_latency_ms?: number | null
  p95_latency_ms?: number | null
  total_calls?: number | null
}

export interface ModelGatewayStats {
  providers: ProviderStat[]
  models: ModelStat[]
}

// 模板相关
export enum TemplateStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export interface TemplateParameter {
  name: string
  type: 'string' | 'number' | 'date' | 'datetime' | 'boolean' | 'select'
  label: string
  required: boolean
  default_value?: any
  options?: Array<{ label: string; value: any }>
  description?: string
}

export interface Template {
  id: number
  name: string
  description?: string
  data_source_id?: number
  data_source_name?: string
  default_chart_type: ChartType
  nl_examples: string[]
  parameters: TemplateParameter[]
  default_model_scenario?: string
  permission_scope?: string
  status: TemplateStatus
  version: number
  created_by?: string
  created_at: string
  updated_at: string
}

export interface TemplateCreate {
  name: string
  description?: string
  data_source_id?: number
  default_chart_type?: ChartType
  nl_examples?: string[]
  parameters?: TemplateParameter[]
  default_model_scenario?: string
  permission_scope?: string
}

export interface TemplateUpdate {
  name?: string
  description?: string
  data_source_id?: number
  default_chart_type?: ChartType
  nl_examples?: string[]
  parameters?: TemplateParameter[]
  default_model_scenario?: string
  permission_scope?: string
  status?: TemplateStatus
}

export interface TemplateVersion {
  id: number
  template_id: number
  version: number
  snapshot: Template
  created_by?: string
  created_at: string
}

// ========== Agent 对话相关 ==========

export enum ChatMessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
}

export enum ChatMessageType {
  TEXT = 'text',
  CHART = 'chart',
  TABLE = 'table',
  ERROR = 'error',
}

export interface ChatMessage {
  id: number
  session_id: number
  role: ChatMessageRole
  content: string
  message_type: ChatMessageType
  chart_type?: string
  chart_option?: Record<string, any>
  table_data?: Array<Record<string, any>>
  table_columns?: string[]
  generated_sql?: string
  created_at: string
}

export interface ChatSession {
  id: number
  title: string
  data_source_id?: number | null
  created_at: string
  updated_at: string
  messages: ChatMessage[]
}

export interface ChatSessionListItem {
  id: number
  title: string
  data_source_id?: number | null
  created_at: string
  updated_at: string
  message_count: number
  last_message?: string | null
}

export interface ChatSendMessage {
  content: string
  data_source_id?: number
}

export interface ChatSessionCreate {
  title?: string
  data_source_id?: number
}

// 查询历史
export interface QueryHistory {
  id: number
  query_text: string
  data_source_id?: number
  data_source_name?: string
  template_id?: number
  template_name?: string
  generated_sql?: string
  status: string
  duration_ms?: number
  created_at: string
}