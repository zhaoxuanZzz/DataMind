"""Agent对话服务 - 基于对话内容动态查询数据库并生成图表"""
import json
import re
import time
import uuid
from typing import Optional

from loguru import logger
from sqlalchemy.orm import Session

from app.connectors.base import ConnectorFactory
from app.core.config import get_settings
from app.models.database import (
    ChatMessage,
    ChatSession,
    DataSource,
    ModelConfig,
    ModelRouteStrategy,
)
from app.models.schemas import (
    ChatMessageRole,
    ChatMessageType,
    ChartType,
    DataSourceType,
    ModelPurpose,
)
from app.services.model_gateway import get_model_gateway
from app.utils.encryption import get_encryption_manager


class AgentChatService:
    """Agent对话服务"""

    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()
        self.model_gateway = get_model_gateway()
        self.encryption_manager = get_encryption_manager()

    async def process_message(
        self,
        session_id: int,
        user_content: str,
        data_source_id: Optional[int] = None,
    ) -> list[ChatMessage]:
        """
        处理用户消息，返回一组assistant回复消息。
        可能包含：文本说明 + SQL + 图表/表格。
        """
        session = self.db.query(ChatSession).filter(ChatSession.id == session_id).first()
        if not session:
            raise ValueError(f"会话 {session_id} 不存在")

        effective_ds_id = data_source_id or session.data_source_id

        user_msg = ChatMessage(
            session_id=session_id,
            role=ChatMessageRole.USER.value,
            content=user_content,
            message_type=ChatMessageType.TEXT.value,
        )
        self.db.add(user_msg)
        self.db.commit()
        self.db.refresh(user_msg)

        if self._is_first_real_message(session_id):
            session.title = user_content[:50] + ("..." if len(user_content) > 50 else "")
            self.db.commit()

        reply_messages: list[ChatMessage] = []

        is_query = self._detect_query_intent(user_content)

        if is_query and effective_ds_id:
            reply_messages = await self._handle_data_query(
                session_id, user_content, effective_ds_id
            )
        elif is_query and not effective_ds_id:
            ds_list = self.db.query(DataSource).filter(DataSource.status == "active").all()
            if ds_list:
                ds_names = ", ".join([f"「{d.name}」(ID:{d.id})" for d in ds_list])
                reply_messages = self._create_text_reply(
                    session_id,
                    f"检测到您想进行数据查询，但当前未指定数据源。\n\n"
                    f"可用的数据源有: {ds_names}\n\n"
                    f"请在左侧选择数据源，或告诉我您想使用哪个数据源。",
                )
            else:
                reply_messages = self._create_text_reply(
                    session_id,
                    "检测到您想进行数据查询，但系统中还没有可用的数据源。\n\n"
                    "请先在「数据源管理」页面添加并测试连接后再来对话。",
                )
        else:
            reply_messages = await self._handle_general_chat(session_id, user_content)

        return [user_msg] + reply_messages

    def _is_first_real_message(self, session_id: int) -> bool:
        count = (
            self.db.query(ChatMessage)
            .filter(
                ChatMessage.session_id == session_id,
                ChatMessage.role == ChatMessageRole.USER.value,
            )
            .count()
        )
        return count <= 1

    def _detect_query_intent(self, text: str) -> bool:
        """检测用户是否想查询数据"""
        query_keywords = [
            "查询", "统计", "分析", "查看", "显示", "展示", "列出", "获取",
            "多少", "平均", "最大", "最小", "总计", "趋势", "分布", "占比",
            "对比", "排名", "TOP", "top", "排行", "环比", "同比",
            "柱状图", "折线图", "饼图", "图表", "表格", "散点图",
            "SELECT", "select", "COUNT", "count", "SUM", "sum", "AVG", "avg",
            "销售", "订单", "用户", "收入", "成本", "利润",
        ]
        return any(kw in text for kw in query_keywords)

    def _recommend_chart_type(self, text: str, data: list[dict]) -> str:
        """根据文本意图和数据特征推荐图表类型"""
        if not data:
            return ChartType.TABLE.value

        text_lower = text.lower()
        num_cols = len(data[0]) if data else 0
        num_rows = len(data)

        if any(kw in text_lower for kw in ["饼图", "占比", "比例", "分布", "构成"]):
            return ChartType.PIE.value
        if any(kw in text_lower for kw in ["折线", "趋势", "走势", "变化", "增长"]):
            return ChartType.LINE.value
        if any(kw in text_lower for kw in ["柱状", "对比", "排名", "排行", "top"]):
            return ChartType.BAR.value
        if any(kw in text_lower for kw in ["散点", "相关", "关系"]):
            return ChartType.SCATTER.value
        if any(kw in text_lower for kw in ["面积"]):
            return ChartType.AREA.value
        if any(kw in text_lower for kw in ["表格", "列表", "明细", "详情"]):
            return ChartType.TABLE.value

        if num_cols == 2 and num_rows <= 8:
            return ChartType.PIE.value
        if num_cols == 2 and num_rows > 8:
            return ChartType.BAR.value
        if num_cols >= 3:
            return ChartType.BAR.value

        return ChartType.TABLE.value

    def _build_echart_option(
        self, chart_type: str, data: list[dict], query_text: str
    ) -> dict:
        """根据图表类型和数据构建ECharts配置"""
        if not data:
            return {}

        fields = list(data[0].keys())
        category_field = fields[0]
        value_fields = fields[1:]

        color_palette = [
            "#5B8FF9", "#5AD8A6", "#5D7092", "#F6BD16",
            "#E86452", "#6DC8EC", "#945FB9", "#FF9845",
        ]

        base_option = {
            "color": color_palette,
            "tooltip": {},
            "animation": True,
            "animationDuration": 600,
        }

        if chart_type in (ChartType.PIE.value, ChartType.DONUT.value):
            pie_data = [
                {"name": str(row[category_field]), "value": row.get(value_fields[0], 0) if value_fields else 0}
                for row in data
            ]
            return {
                **base_option,
                "tooltip": {"trigger": "item", "formatter": "{b}: {c} ({d}%)"},
                "legend": {"orient": "vertical", "right": 10, "top": "center"},
                "series": [
                    {
                        "type": "pie",
                        "radius": ["40%", "70%"] if chart_type == ChartType.DONUT.value else "65%",
                        "center": ["40%", "50%"],
                        "data": pie_data,
                        "emphasis": {
                            "itemStyle": {
                                "shadowBlur": 10,
                                "shadowOffsetX": 0,
                                "shadowColor": "rgba(0,0,0,0.5)",
                            }
                        },
                        "label": {"formatter": "{b}\n{d}%"},
                    }
                ],
            }

        if chart_type == ChartType.SCATTER.value and len(value_fields) >= 2:
            return {
                **base_option,
                "tooltip": {"trigger": "item"},
                "xAxis": {"type": "value", "name": value_fields[0]},
                "yAxis": {"type": "value", "name": value_fields[1]},
                "series": [
                    {
                        "type": "scatter",
                        "symbolSize": 12,
                        "data": [
                            [row.get(value_fields[0], 0), row.get(value_fields[1], 0)]
                            for row in data
                        ],
                    }
                ],
            }

        categories = [str(row[category_field]) for row in data]
        series_type = "bar"
        if chart_type == ChartType.LINE.value:
            series_type = "line"
        elif chart_type == ChartType.AREA.value:
            series_type = "line"

        series = []
        for vf in value_fields:
            s = {
                "name": vf,
                "type": series_type,
                "data": [row.get(vf, 0) for row in data],
                "smooth": series_type == "line",
            }
            if chart_type == ChartType.AREA.value:
                s["areaStyle"] = {"opacity": 0.3}
            series.append(s)

        return {
            **base_option,
            "tooltip": {"trigger": "axis"},
            "legend": {"bottom": 0, "data": [vf for vf in value_fields]},
            "grid": {"left": "3%", "right": "4%", "bottom": "15%", "containLabel": True},
            "xAxis": {
                "type": "category",
                "data": categories,
                "axisLabel": {"rotate": 30 if len(categories) > 6 else 0},
            },
            "yAxis": {"type": "value"},
            "series": series,
        }

    async def _handle_data_query(
        self, session_id: int, user_content: str, data_source_id: int
    ) -> list[ChatMessage]:
        """处理数据查询类消息"""
        messages: list[ChatMessage] = []

        ds = self.db.query(DataSource).filter(DataSource.id == data_source_id).first()
        if not ds:
            return self._create_text_reply(session_id, f"数据源 ID={data_source_id} 不存在，请检查后重试。")

        connection_info = self._decrypt_connection_info(ds.connection_info)

        try:
            connector = ConnectorFactory.create(
                DataSourceType(ds.type),
                connection_info,
                timeout=ds.timeout,
                max_rows=ds.max_rows,
            )
        except Exception as e:
            logger.error(f"创建连接器失败: {e}")
            return self._create_text_reply(session_id, f"无法连接到数据源「{ds.name}」: {str(e)}")

        schema_info = ""
        try:
            schema = connector.get_schema()
            schema_info = json.dumps(schema, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.warning(f"获取schema失败: {e}")
            schema_info = f"无法获取schema: {e}"

        sql = await self._generate_sql(user_content, schema_info, ds.type)

        try:
            start_time = time.time()
            results = connector.execute_query(sql)
            duration_ms = (time.time() - start_time) * 1000
        except Exception as e:
            logger.error(f"SQL执行失败: {e}")
            err_msg = self._save_message(
                session_id,
                ChatMessageRole.ASSISTANT.value,
                f"SQL 执行出错: {str(e)}\n\n生成的SQL:\n```sql\n{sql}\n```\n\n请尝试换一种方式描述您的需求。",
                ChatMessageType.ERROR.value,
                generated_sql=sql,
            )
            return [err_msg]
        finally:
            try:
                connector.disconnect()
            except Exception:
                pass

        if not results:
            msg = self._save_message(
                session_id,
                ChatMessageRole.ASSISTANT.value,
                f"查询完成，但未返回任何数据。\n\n执行的SQL:\n```sql\n{sql}\n```",
                ChatMessageType.TEXT.value,
                generated_sql=sql,
            )
            return [msg]

        chart_type = self._recommend_chart_type(user_content, results)
        chart_option = self._build_echart_option(chart_type, results, user_content)
        columns = list(results[0].keys()) if results else []

        text_summary = self._generate_text_summary(user_content, results, duration_ms)
        text_msg = self._save_message(
            session_id,
            ChatMessageRole.ASSISTANT.value,
            text_summary,
            ChatMessageType.TEXT.value,
            generated_sql=sql,
        )
        messages.append(text_msg)

        chart_msg = self._save_message(
            session_id,
            ChatMessageRole.ASSISTANT.value,
            f"以下是{self._chart_type_label(chart_type)}展示：",
            ChatMessageType.CHART.value,
            chart_type=chart_type,
            chart_option=chart_option,
            table_data=results,
            table_columns=columns,
            generated_sql=sql,
        )
        messages.append(chart_msg)

        return messages

    async def _handle_general_chat(
        self, session_id: int, user_content: str
    ) -> list[ChatMessage]:
        """处理普通对话"""
        model_config = self._get_model_for_purpose(ModelPurpose.SUMMARY)
        if model_config:
            try:
                from langchain_core.messages import HumanMessage, SystemMessage
                model_instance = self._get_model_instance(model_config)
                history = self._get_recent_messages(session_id, limit=10)
                lc_messages = [
                    SystemMessage(
                        content=(
                            "你是 DataMind 智能数据分析助手。你可以帮助用户进行数据查询、"
                            "分析和可视化。如果用户的问题涉及数据查询，请引导他们选择数据源并"
                            "描述需求。回答要简洁、友好、专业。"
                        )
                    )
                ]
                for m in history:
                    if m.role == ChatMessageRole.USER.value:
                        lc_messages.append(HumanMessage(content=m.content))
                    else:
                        from langchain_core.messages import AIMessage
                        lc_messages.append(AIMessage(content=m.content))
                lc_messages.append(HumanMessage(content=user_content))

                response = self.model_gateway.invoke(
                    model=model_instance,
                    messages=lc_messages,
                    model_id=model_config.id,
                    scenario="chat",
                    qps_limit=model_config.qps_limit,
                    daily_quota=model_config.daily_quota,
                    db=self.db,
                )
                reply_text = response.content if hasattr(response, "content") else str(response)
                return self._create_text_reply(session_id, reply_text)
            except Exception as e:
                logger.warning(f"模型调用失败，使用规则回复: {e}")

        return self._create_text_reply(
            session_id,
            self._generate_fallback_reply(user_content),
        )

    def _generate_fallback_reply(self, user_content: str) -> str:
        """无模型时的规则化回复"""
        text = user_content.lower()
        if any(kw in text for kw in ["你好", "hello", "hi", "嗨"]):
            return (
                "你好！我是 DataMind 智能数据分析助手 🤖\n\n"
                "我可以帮助你：\n"
                "- 📊 **查询数据** — 用自然语言描述你想查的内容\n"
                "- 📈 **生成图表** — 自动推荐最合适的可视化方式\n"
                "- 🔍 **数据分析** — 统计、趋势、对比等分析\n\n"
                "请先在左侧选择一个数据源，然后告诉我你想查什么！"
            )
        if any(kw in text for kw in ["帮助", "help", "怎么用", "使用说明"]):
            return (
                "## 使用指南\n\n"
                "1. **选择数据源**：在左侧选择已连接的数据库\n"
                "2. **输入问题**：用自然语言描述你想查询的数据\n"
                "3. **查看结果**：系统将自动生成SQL、执行查询、推荐图表\n\n"
                "**示例问题：**\n"
                "- 查询最近7天的每日订单数量，用折线图展示\n"
                "- 统计各产品类别的销售额占比\n"
                "- 列出销售额TOP10的客户\n"
                "- 对比本月和上月的收入\n\n"
                "💡 你可以在问题中指定想要的图表类型！"
            )
        if any(kw in text for kw in ["谢谢", "感谢", "thanks"]):
            return "不客气！如果还有其他数据分析需求，随时告诉我 😊"

        return (
            "我理解了你的问题。如果你想进行数据查询或分析，"
            "请确保已选择数据源，并用自然语言描述你的需求。\n\n"
            "例如：「查询最近30天的每日销售额趋势」"
        )

    async def _generate_sql(self, query_text: str, schema_info: str, db_type: str) -> str:
        """生成SQL，优先使用LLM，否则规则回退"""
        model_config = self._get_model_for_purpose(ModelPurpose.SQL)
        if model_config:
            try:
                from langchain_core.messages import HumanMessage, SystemMessage
                model_instance = self._get_model_instance(model_config)
                prompt = (
                    f"根据以下信息生成 {db_type} SQL查询语句:\n\n"
                    f"用户问题: {query_text}\n\n"
                    f"数据库Schema:\n{schema_info}\n\n"
                    f"要求:\n"
                    f"1. 只返回可执行的SQL语句，不要其他解释\n"
                    f"2. 确保SQL语法正确\n"
                    f"3. 加上合理的LIMIT限制（默认100）\n"
                    f"4. 确保返回列名有意义\n"
                )
                messages = [
                    SystemMessage(content="你是专业的SQL生成助手。只返回SQL语句，不加任何解释。"),
                    HumanMessage(content=prompt),
                ]
                response = self.model_gateway.invoke(
                    model=model_instance,
                    messages=messages,
                    model_id=model_config.id,
                    scenario="sql_generation",
                    qps_limit=model_config.qps_limit,
                    daily_quota=model_config.daily_quota,
                    db=self.db,
                )
                sql = response.content if hasattr(response, "content") else str(response)
                if "```sql" in sql:
                    sql = sql.split("```sql")[1].split("```")[0].strip()
                elif "```" in sql:
                    sql = sql.split("```")[1].split("```")[0].strip()
                return sql.strip()
            except Exception as e:
                logger.warning(f"LLM SQL生成失败，使用规则回退: {e}")

        return self._fallback_sql_generation(query_text, schema_info)

    def _fallback_sql_generation(self, query_text: str, schema_info: str) -> str:
        """规则化SQL生成（无LLM时）"""
        tables = []
        try:
            schema_data = json.loads(schema_info)
            if isinstance(schema_data, dict):
                tables = list(schema_data.keys())
            elif isinstance(schema_data, list):
                for item in schema_data:
                    if isinstance(item, dict) and "table_name" in item:
                        tables.append(item["table_name"])
                    elif isinstance(item, str):
                        tables.append(item)
        except (json.JSONDecodeError, TypeError):
            pass

        if not tables:
            return "SELECT 'No tables found' AS message"

        target_table = tables[0]
        for t in tables:
            t_lower = t.lower()
            text_lower = query_text.lower()
            if t_lower in text_lower or any(
                kw in t_lower
                for kw in self._extract_keywords(text_lower)
            ):
                target_table = t
                break

        if any(kw in query_text for kw in ["统计", "总计", "多少", "COUNT", "count"]):
            return f"SELECT COUNT(*) AS total FROM {target_table}"
        if any(kw in query_text for kw in ["TOP", "top", "排名", "排行"]):
            match = re.search(r"(?:TOP|top)\s*(\d+)", query_text)
            limit = int(match.group(1)) if match else 10
            return f"SELECT * FROM {target_table} ORDER BY 1 DESC LIMIT {limit}"

        return f"SELECT * FROM {target_table} LIMIT 100"

    def _extract_keywords(self, text: str) -> list[str]:
        """从文本中提取关键词"""
        stop_words = {"的", "了", "在", "是", "和", "有", "对", "从", "到", "用", "请"}
        words = re.findall(r"[\u4e00-\u9fa5a-zA-Z_]+", text)
        return [w for w in words if len(w) > 1 and w not in stop_words]

    def _generate_text_summary(
        self, query_text: str, data: list[dict], duration_ms: float
    ) -> str:
        """生成数据摘要文本"""
        num_rows = len(data)
        columns = list(data[0].keys()) if data else []
        num_cols = len(columns)

        summary = f"✅ 查询完成！共返回 **{num_rows}** 条数据，包含 **{num_cols}** 个字段"
        summary += f"（耗时 {duration_ms:.0f}ms）\n\n"
        summary += f"**字段**: {', '.join(columns)}\n"

        for col in columns:
            values = [row.get(col) for row in data if row.get(col) is not None]
            if values and all(isinstance(v, (int, float)) for v in values):
                total = sum(values)
                avg = total / len(values) if values else 0
                summary += f"\n📊 **{col}**: 总计={total:,.2f}, 平均={avg:,.2f}, 最大={max(values):,.2f}, 最小={min(values):,.2f}"

        return summary

    def _chart_type_label(self, chart_type: str) -> str:
        labels = {
            "pie": "饼图", "donut": "环形图", "bar": "柱状图",
            "column": "条形图", "line": "折线图", "area": "面积图",
            "scatter": "散点图", "table": "表格", "combo": "组合图",
        }
        return labels.get(chart_type, "图表")

    def _decrypt_connection_info(self, connection_info: dict) -> dict:
        result = {}
        if not connection_info:
            return result
        for k, v in connection_info.items():
            if isinstance(v, str):
                try:
                    result[k] = self.encryption_manager.decrypt(v)
                except Exception:
                    result[k] = v
            else:
                result[k] = v
        return result

    def _save_message(
        self,
        session_id: int,
        role: str,
        content: str,
        message_type: str,
        chart_type: Optional[str] = None,
        chart_option: Optional[dict] = None,
        table_data: Optional[list] = None,
        table_columns: Optional[list] = None,
        generated_sql: Optional[str] = None,
    ) -> ChatMessage:
        msg = ChatMessage(
            session_id=session_id,
            role=role,
            content=content,
            message_type=message_type,
            chart_type=chart_type,
            chart_option=chart_option,
            table_data=table_data,
            table_columns=table_columns,
            generated_sql=generated_sql,
        )
        self.db.add(msg)
        self.db.commit()
        self.db.refresh(msg)
        return msg

    def _create_text_reply(self, session_id: int, content: str) -> list[ChatMessage]:
        msg = self._save_message(
            session_id,
            ChatMessageRole.ASSISTANT.value,
            content,
            ChatMessageType.TEXT.value,
        )
        return [msg]

    def _get_recent_messages(self, session_id: int, limit: int = 10) -> list[ChatMessage]:
        return (
            self.db.query(ChatMessage)
            .filter(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.id.desc())
            .limit(limit)
            .all()
        )[::-1]

    def _get_model_for_purpose(self, purpose: ModelPurpose) -> Optional[ModelConfig]:
        """获取指定用途的模型配置"""
        try:
            purpose_value = purpose.value
            all_models = self.db.query(ModelConfig).all()
            for m in all_models:
                purposes = m.purpose
                if isinstance(purposes, list) and purpose_value in purposes:
                    return m
                if isinstance(purposes, str):
                    try:
                        plist = json.loads(purposes)
                        if isinstance(plist, list) and purpose_value in plist:
                            return m
                    except (json.JSONDecodeError, TypeError):
                        if purpose_value in purposes:
                            return m
        except Exception as e:
            logger.warning(f"获取模型配置失败: {e}")
        return None

    def _get_model_instance(self, model_config: ModelConfig):
        from app.models.schemas import ModelProvider
        provider = ModelProvider(model_config.provider)
        api_key = self.model_gateway.resolve_api_key(model_config.api_key_ref)
        if not api_key:
            raise ValueError(f"API key not found for: {model_config.api_key_ref}")
        return self.model_gateway.get_model(
            provider=provider,
            model_name=model_config.model_name,
            api_key=api_key,
            endpoint=model_config.endpoint,
        )
