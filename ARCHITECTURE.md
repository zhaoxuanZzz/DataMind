# DataMind（数据灵析）系统架构方案

## 1. 架构目标
- 面向多场景的数据查询、分析与可视化，支持关系型库与向量库。
- 通过 Python + LangChain + LangGraph 实现可编排、可观测的智能链路，支持多模型路由（阿里云/豆包/Kimi/OpenAI）。
- 前后端解耦，提供低代码配置与高扩展性。

## 2. 整体架构分层
- **前端层（TypeScript）**
  - 查询与模板：自然语言输入、参数化模板、过滤器。
  - 可视化：统一数据+meta 协议，支持饼/柱/折/面积/散点/表格等动态切换。
  - 配置与管理：数据源、模型网关场景配置（默认模型、QPS/日配额、健康度）。
  - 观测面板：查询/模型调用日志、健康指标、告警提示。
- **网关与安全层**
  - API 网关：鉴权、TLS、限流、CORS、WAF。
  - 身份与权限：角色/团队访问控制，审计日志。
- **编排与服务层（Python + LangChain + LangGraph）**
  - 节点/工具：意图解析、模型路由、数据源选择、SQL/向量生成、执行、聚合、可视化推荐、错误重试。
  - 模型网关：封装阿里云/豆包/Kimi/OpenAI；路由策略（延迟/成本/成功率）、健康检查、熔断、降级、配额统计。
  - 业务服务：查询模板管理、图表配置、版本/发布、权限校验。
- **数据访问层**
  - 关系型连接器：MySQL、PostgreSQL（参数化 SQL、安全白名单、自动 limit/timeout）。
  - 向量库连接器：ChromaDB、Milvus（topK、度量、过滤）。
  - 缓存：schema/元数据缓存，热门查询缓存（可选）。
- **存储与日志**
  - 配置存储：数据源、模型注册/路由、模板、图表配置。
  - 运行日志：查询链路、模型调用、错误与耗时；审计日志。
  - 观测：指标（成功率、P95 延迟、QPS）、告警（失败率/熔断/超时）。

## 3. 关键组件说明
- 前端应用：SPA 或 SSR，提供查询工作台、图表渲染、配置表单、观测面板。
- API 网关：统一入口，做鉴权、限流、TLS 终止、WAF。
- 编排服务：基于 LangGraph 的状态机/有向图，驱动各节点与工具；可扩展节点和工具实现。
- 模型网关：多模型注册/路由/健康检查/熔断/限流/配额统计；统一调用接口供编排节点使用。
- 数据连接器：统一接口封装，包含连接池、重试、超时、结果规范化。
- 可视化推荐器：根据指标/维度/数据类型/数据量给出默认与备选图型。
- 日志与观测：集中收集模型/查询调用日志，暴露指标到监控系统并触发告警。

## 4. 时序示例（查询链路）
1) 前端提交查询（自然语言/参数 + 数据源/模板 ID）。
2) 编排：意图解析 → 模型网关路由（挑选阿里云/豆包/Kimi/OpenAI）→ 数据源选择 → SQL/向量生成。
3) 执行：关系型查询或向量检索；必要时多源合并与聚合。
4) 可视化推荐：生成图表配置（默认+可切换）。
5) 返回前端渲染；同时记录链路与模型调用日志，更新观测指标。

## 5. 部署与容量建议（MVP）
- 前端：静态资源托管或 SSR，接入 CDN。
- API/编排服务：2-3 副本起步，4C8G；HPA 按 QPS/延迟扩缩；开启网关限流与熔断。
- 模型网关：可独立服务，按 tokens/QPS 扩缩；支持多 key、配额与优先级。
- 数据库/向量库：托管或自建，开启只读账号、连接池、超时与慢查询监控。
- 缓存/队列（可选）：schema 缓存、异步任务与重试。

## 6. 配置与数据模型要点
- 数据源：type(mysql|postgres|chroma|milvus)、conn_info、auth_ref、timeout、max_rows。
- 模型注册：provider(aliyun|doubao|kimi|openai)、model_name、purpose(intent|sql|summary|embedding)、endpoint、api_key_ref、qps_limit、daily_quota、cost_metric。
- 模型路由策略：scenario、primary_model、fallback_list、规则(latency/cost/success_rate)、health_status。
- 模型调用日志：request_id、scenario、model_id、latency_ms、tokens_in/out、cost_est、status、error_type、created_at。
- 查询/执行日志：query_text、generated_sql/vector_req、duration、status、error、trace_id。
- 图表配置：chart_type、encoding(dimensions/measures)、interactions、export_options。

## 7. 安全与合规
- 鉴权与权限：API 网关 + 角色/团队访问控制；最小权限原则。
- 数据库安全：只读账号、参数化查询、SQL 白名单/黑名单、自动 limit/timeout。
- 凭据管理：KMS/Secrets 管理模型与数据源凭据，前端不回显。
- 日志与隐私：敏感字段脱敏；审计日志留存；防提示注入。

## 8. 可观测性与运维
- 指标：请求 QPS、P95/P99、成功率、错误类型；模型调用耗时/失败率；DB/向量库耗时；缓存命中率。
- 日志：链路 trace、模型调用日志、审计日志集中收集与检索。
- 告警：失败率/超时/熔断触发、配额逼近、模型健康度下降。
- 灰度与回滚：配置与模板版本化，模型路由可快速切换主备。

## 9. 演进与扩展
- 数据源扩展：ClickHouse/BigQuery/Elastic/Pinecone 等按统一接口接入。
- 模型扩展：新增厂商或自建模型，复用模型网关路由与健康机制。
- 分析能力：更多图表（漏斗/雷达/桑基）、自动洞察（异常检测、趋势解读）、订阅与告警。
- 协作：多页面仪表板、分享与权限分级、团队看板。

