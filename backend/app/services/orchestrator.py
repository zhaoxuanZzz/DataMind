"""LangGraph编排引擎"""

import json
import uuid
from typing import Any, Optional, TypedDict

from app.connectors.base import ConnectorFactory
from app.core.config import get_settings
from app.models.database import DataSource, ModelConfig, ModelRouteStrategy
from app.models.schemas import ChartType, DataSourceType, ModelPurpose
from app.services.model_gateway import get_model_gateway
from app.utils.encryption import get_encryption_manager
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, StateGraph
from langgraph.graph.message import add_messages
from sqlalchemy.orm import Session


class OrchestratorState(TypedDict, total=False):
    """编排状态 - 使用TypedDict以便LangGraph正确处理"""

    query_text: str
    data_source_id: Optional[int]
    data_source_type: Optional[DataSourceType]
    parameters: dict
    intent: dict
    generated_sql: Optional[str]
    vector_request: Optional[dict]
    query_results: list
    chart_config: dict
    recommended_charts: list
    error: Optional[str]
    trace_id: str
    connection_info: dict
    data_source_timeout: int
    data_source_max_rows: int


class QueryOrchestrator:
    """查询编排器 - 基于LangGraph的状态机"""

    def __init__(self, db: Optional[Session] = None):
        self.settings = get_settings()
        self.model_gateway = get_model_gateway()
        self.db = db
        self.encryption_manager = get_encryption_manager()
        self.graph = self._build_graph()

    def _build_graph(self) -> StateGraph:
        """构建LangGraph状态图"""
        workflow = StateGraph(OrchestratorState)

        # 添加节点
        workflow.add_node("intent_parsing", self._intent_parsing_node)
        workflow.add_node("data_source_selection", self._data_source_selection_node)
        workflow.add_node("sql_generation", self._sql_generation_node)
        workflow.add_node("vector_generation", self._vector_generation_node)
        workflow.add_node("query_execution", self._query_execution_node)
        workflow.add_node("visualization_recommendation", self._visualization_recommendation_node)
        workflow.add_node("error_handling", self._error_handling_node)

        # 设置入口
        workflow.set_entry_point("intent_parsing")

        # 添加边
        workflow.add_edge("intent_parsing", "data_source_selection")
        workflow.add_conditional_edges(
            "data_source_selection",
            self._route_after_selection,
            {"sql": "sql_generation", "vector": "vector_generation", "error": "error_handling"},
        )
        workflow.add_edge("sql_generation", "query_execution")
        workflow.add_edge("vector_generation", "query_execution")
        workflow.add_edge("query_execution", "visualization_recommendation")
        workflow.add_edge("visualization_recommendation", END)
        workflow.add_edge("error_handling", END)

        return workflow.compile()

    def _intent_parsing_node(self, state: OrchestratorState) -> dict:
        """意图解析节点"""
        try:
            query_text = state.get("query_text", "")
            if not query_text:
                return {"error": "Query text is empty"}

            # 从数据库获取模型配置
            model_config = self._get_model_for_scenario("intent", ModelPurpose.INTENT)
            if not model_config:
                # 如果没有配置模型，使用简化规则
                intent = {
                    "query_type": (
                        "sql"
                        if any(
                            keyword in query_text.lower()
                            for keyword in ["查询", "统计", "分析", "count", "sum", "avg"]
                        )
                        else "vector"
                    ),
                    "metrics": [],
                    "dimensions": [],
                    "time_range": {},
                    "filters": {},
                    "expected_chart": None,
                }
                return {"intent": intent}

            # 调用模型解析意图
            prompt = f"""分析以下查询意图，返回JSON格式：
{{
    "query_type": "sql" 或 "vector",
    "metrics": ["指标列表"],
    "dimensions": ["维度列表"],
    "time_range": {{"start": "开始时间", "end": "结束时间"}},
    "filters": {{"过滤条件"}},
    "expected_chart": "期望图表类型"
}}

查询：{query_text}

只返回JSON，不要其他内容。"""


            messages = [
                SystemMessage(
                    content="你是一个专业的查询意图分析助手，能够准确分析用户的查询意图并返回结构化的JSON结果。"
                ),
                HumanMessage(content=prompt),
            ]

            try:
                model = self._get_model_instance(model_config)
                # 直接传递LangChain Message对象列表
                response = self.model_gateway.invoke(
                    model=model,
                    messages=messages,  # LangChain Message对象列表
                    model_id=model_config.id,
                    scenario="intent",
                    qps_limit=model_config.qps_limit,
                    daily_quota=model_config.daily_quota,
                    db=self.db,
                )

                # 解析模型响应
                response_text = response.content if hasattr(response, "content") else str(response)
                # 尝试提取JSON
                try:
                    # 移除可能的markdown代码块标记
                    if "```json" in response_text:
                        response_text = response_text.split("```json")[1].split("```")[0].strip()
                    elif "```" in response_text:
                        response_text = response_text.split("```")[1].split("```")[0].strip()
                    intent = json.loads(response_text)
                except json.JSONDecodeError as e:
                    # 如果解析失败，使用简化规则
                    print(f"Failed to parse model response as JSON: {response_text[:200]}")
                    raise
            except Exception as e:
                # 模型调用失败，使用简化规则
                print(f"Model invocation failed, using fallback: {str(e)}")
                import traceback

                traceback.print_exc()
                intent = {
                    "query_type": (
                        "sql"
                        if any(
                            keyword in query_text.lower() for keyword in ["查询", "统计", "分析"]
                        )
                        else "vector"
                    ),
                    "metrics": [],
                    "dimensions": [],
                    "time_range": {},
                    "filters": {},
                    "expected_chart": None,
                }

            return {"intent": intent}
        except Exception as e:
            return {"error": f"Intent parsing failed: {str(e)}"}

    def _data_source_selection_node(self, state: OrchestratorState) -> dict:
        """数据源选择节点"""
        try:
            data_source_id = state.get("data_source_id")
            if not data_source_id:
                return {"error": "Data source not specified"}

            # 从数据库获取数据源配置
            if not self.db:
                return {"error": "Database session not available"}

            data_source = self.db.query(DataSource).filter(DataSource.id == data_source_id).first()
            if not data_source:
                return {"error": f"Data source {data_source_id} not found"}

            # 解密连接信息
            connection_info = {}
            if data_source.connection_info:
                for k, v in data_source.connection_info.items():
                    if isinstance(v, str):
                        try:
                            connection_info[k] = self.encryption_manager.decrypt(v)
                        except:
                            # 解密失败，可能是未加密的数据，直接使用原值
                            connection_info[k] = v
                    else:
                        connection_info[k] = v

            return {
                "data_source_type": DataSourceType(data_source.type),
                "connection_info": connection_info,
                "data_source_timeout": data_source.timeout,
                "data_source_max_rows": data_source.max_rows,
            }
        except Exception as e:
            return {"error": f"Data source selection failed: {str(e)}"}

    def _sql_generation_node(self, state: OrchestratorState) -> dict:
        """SQL生成节点"""
        try:
            query_text = state.get("query_text", "")
            intent = state.get("intent", {})
            data_source_type = state.get("data_source_type")
            connection_info = state.get("connection_info", {})

            # 获取schema信息
            schema_info = ""
            if connection_info and data_source_type:
                try:
                    connector = ConnectorFactory.create(
                        data_source_type,
                        connection_info,
                        timeout=state.get("data_source_timeout", 30),
                        max_rows=state.get("data_source_max_rows", 10000),
                    )
                    try:
                        schema = connector.get_schema()
                        schema_info = json.dumps(schema, ensure_ascii=False, indent=2)
                    finally:
                        # 确保连接被关闭
                        try:
                            connector.disconnect()
                        except:
                            pass
                except Exception as e:
                    # Schema获取失败，继续使用模型生成（模型可能可以从查询文本推断）
                    print(f"Schema获取失败: {str(e)}")
                    schema_info = f"Schema获取失败: {str(e)}"
            else:
                schema_info = "连接信息或数据源类型不可用"

            # 从数据库获取模型配置
            model_config = self._get_model_for_scenario("sql_generation", ModelPurpose.SQL)
            if not model_config:
                # 如果没有配置模型，生成占位SQL
                sql = f"-- Generated SQL for: {query_text}\nSELECT * FROM table_name LIMIT 100"
                return {"generated_sql": sql}

            # 调用模型生成SQL
            prompt = f"""根据以下信息生成SQL查询语句：

查询意图：{query_text}

数据库Schema信息：
{schema_info}

意图分析结果：
{json.dumps(intent, ensure_ascii=False, indent=2)}

要求：
1. 只返回SQL语句，不要其他解释
2. 确保SQL语法正确
3. 如果无法确定表名或字段，使用合理的占位符
4. 限制返回结果数量（使用LIMIT）

SQL:"""

            messages = [
                SystemMessage(
                    content="你是一个专业的SQL生成助手，能够根据自然语言查询和数据库schema生成准确的SQL语句。"
                ),
                HumanMessage(content=prompt),
            ]

            try:
                model = self._get_model_instance(model_config)
                # 直接传递LangChain Message对象列表
                response = self.model_gateway.invoke(
                    model=model,
                    messages=messages,  # LangChain Message对象列表
                    model_id=model_config.id,
                    scenario="sql_generation",
                    qps_limit=model_config.qps_limit,
                    daily_quota=model_config.daily_quota,
                    db=self.db,
                )

                # 提取SQL
                sql = response.content if hasattr(response, "content") else str(response)
                # 清理可能的markdown代码块标记
                if "```sql" in sql:
                    sql = sql.split("```sql")[1].split("```")[0].strip()
                elif "```" in sql:
                    sql = sql.split("```")[1].split("```")[0].strip()

                state["generated_sql"] = sql.strip()
            except Exception as e:
                # 模型调用失败，生成占位SQL
                print(f"SQL generation model invocation failed: {str(e)}")
                import traceback

                traceback.print_exc()
                sql = f"-- Generated SQL for: {query_text}\nSELECT * FROM table_name LIMIT 100"

            return {"generated_sql": sql}
        except Exception as e:
            return {"error": f"SQL generation failed: {str(e)}"}

    def _vector_generation_node(self, state: OrchestratorState) -> dict:
        """向量检索生成节点"""
        try:
            query_text = state.get("query_text", "")
            connection_info = state.get("connection_info", {})

            # 从数据库获取embedding模型配置
            model_config = self._get_model_for_scenario("embedding", ModelPurpose.EMBEDDING)

            # 获取集合名称（从连接信息或默认值）
            collection_name = connection_info.get("collection_name", "default")
            top_k = connection_info.get("top_k", 10)

            vector_request = {
                "query_text": query_text,
                "collection_name": collection_name,
                "top_k": top_k,
            }

            # 如果有embedding模型，可以在这里生成向量（但通常向量库会自己处理）
            # 这里先设置请求信息，实际向量生成在连接器中完成
            return {"vector_request": vector_request}
        except Exception as e:
            return {"error": f"Vector generation failed: {str(e)}"}

    def _query_execution_node(self, state: OrchestratorState) -> dict:
        """查询执行节点"""
        try:
            data_source_type = state.get("data_source_type")
            generated_sql = state.get("generated_sql")
            vector_request = state.get("vector_request")
            connection_info = state.get("connection_info", {})

            if not connection_info:
                return {"error": "Connection info not available"}

            connector = ConnectorFactory.create(
                data_source_type,
                connection_info,
                timeout=state.get("data_source_timeout", self.settings.query_timeout),
                max_rows=state.get("data_source_max_rows", self.settings.max_query_rows),
            )

            if generated_sql:
                # 执行SQL查询
                results = connector.execute_query(generated_sql)
                return {"query_results": results}
            elif vector_request:
                # 执行向量检索
                collection_name = vector_request.get("collection_name", "default")
                top_k = vector_request.get("top_k", 10)
                query_text = vector_request.get("query_text", "")

                # 对于向量检索，使用连接器的execute_query方法
                # 不同连接器的参数可能不同，这里统一处理
                if data_source_type in [DataSourceType.CHROMADB, DataSourceType.MILVUS]:
                    results = connector.execute_query(
                        query=query_text, collection_name=collection_name, top_k=top_k
                    )
                else:
                    results = []
                return {"query_results": results}
            else:
                return {"error": "No query to execute"}
        except Exception as e:
            return {"error": f"Query execution failed: {str(e)}"}

    def _visualization_recommendation_node(self, state: OrchestratorState) -> dict:
        """可视化推荐节点"""
        try:
            results = state.get("query_results", [])
            intent = state.get("intent", {})

            if not results:
                return {"recommended_charts": [ChartType.TABLE]}

            # 简单的推荐逻辑
            num_rows = len(results)
            num_cols = len(results[0]) if results else 0

            if num_cols == 2:
                recommended = [ChartType.PIE, ChartType.BAR, ChartType.LINE]
            elif num_cols > 2:
                recommended = [ChartType.BAR, ChartType.LINE, ChartType.TABLE]
            else:
                recommended = [ChartType.TABLE]

            return {
                "recommended_charts": recommended,
                "chart_config": {
                    "data": results,
                    "default_chart": recommended[0] if recommended else ChartType.TABLE,
                },
            }
        except Exception as e:
            return {"error": f"Visualization recommendation failed: {str(e)}"}

    def _error_handling_node(self, state: OrchestratorState) -> dict:
        """错误处理节点"""
        error = state.get("error", "Unknown error")
        # 记录错误日志
        # TODO: 实现错误日志记录
        # LangGraph要求至少更新一个字段，所以返回一个标记字段
        return {"error": error}  # 确保错误被保留

    def _route_after_selection(self, state: OrchestratorState) -> str:
        """数据源选择后的路由"""
        if state.get("error"):
            return "error"

        intent = state.get("intent", {})
        query_type = intent.get("query_type", "sql")

        if query_type == "sql":
            return "sql"
        elif query_type == "vector":
            return "vector"
        else:
            return "error"

    def _get_model_for_scenario(
        self, scenario: str, purpose: ModelPurpose
    ) -> Optional[ModelConfig]:
        """根据场景和用途获取模型配置"""
        if not self.db:
            return None

        try:
            # 首先尝试从路由策略获取
            route = (
                self.db.query(ModelRouteStrategy)
                .filter(ModelRouteStrategy.scenario == scenario)
                .first()
            )

            if route:
                model_id = route.primary_model_id
            else:
                # 如果没有路由策略，查找支持该用途的模型
                purpose_value = purpose.value

                # 兼容SQLite和PostgreSQL：先获取所有模型，然后在Python中过滤
                all_models = self.db.query(ModelConfig).all()
                model = None
                for m in all_models:
                    # purpose是JSON字段，可能是list或string
                    purposes = m.purpose
                    if isinstance(purposes, list):
                        if purpose_value in purposes:
                            model = m
                            break
                    elif isinstance(purposes, str):
                        # 如果是字符串，尝试解析为JSON
                        try:
                            purposes_list = json.loads(purposes)
                            if isinstance(purposes_list, list) and purpose_value in purposes_list:
                                model = m
                                break
                        except:
                            # 如果解析失败，检查字符串是否包含
                            if purpose_value in purposes:
                                model = m
                                break

                if not model:
                    return None
                model_id = model.id

            # 获取模型配置
            model_config = self.db.query(ModelConfig).filter(ModelConfig.id == model_id).first()
            return model_config
        except Exception as e:
            # 记录错误但不抛出，返回None让调用者使用回退逻辑
            import traceback

            print(f"Error getting model for scenario {scenario}: {str(e)}")
            print(traceback.format_exc())
            return None

    def _get_model_instance(self, model_config: ModelConfig):
        """获取模型实例"""
        from app.models.schemas import ModelProvider

        try:
            provider = ModelProvider(model_config.provider)
            api_key = self.model_gateway.resolve_api_key(model_config.api_key_ref)
            if not api_key:
                raise ValueError(f"API key not found for reference: {model_config.api_key_ref}")

            return self.model_gateway.get_model(
                provider=provider,
                model_name=model_config.model_name,
                api_key=api_key,
                endpoint=model_config.endpoint,
            )
        except Exception as e:
            print(f"Failed to get model instance: {str(e)}")
            import traceback

            traceback.print_exc()
            raise

    async def execute(
        self,
        query_text: str,
        data_source_id: Optional[int] = None,
        parameters: Optional[dict] = None,
    ) -> OrchestratorState:
        """
        执行查询编排

        Args:
            query_text: 查询文本
            data_source_id: 数据源ID
            parameters: 参数

        Returns:
            编排状态（包含结果）
        """
        initial_state: OrchestratorState = {
            "query_text": query_text,
            "data_source_id": data_source_id,
            "parameters": parameters or {},
            "trace_id": str(uuid.uuid4()),
        }

        # 执行状态图
        final_state = await self.graph.ainvoke(initial_state)
        return final_state
