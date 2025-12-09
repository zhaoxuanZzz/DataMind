"""模型网关服务"""
import os
import time
import statistics
from collections import deque, defaultdict
from datetime import datetime
from typing import Any, Optional
from enum import Enum

from langchain_openai import ChatOpenAI
from langchain_community.chat_models import ChatTongyi, ChatBaichuan
from langchain_core.language_models import BaseChatModel
from sqlalchemy.orm import Session

from app.api.dependencies import SessionLocal
from app.core.config import get_settings
from app.models.database import ModelCallLog, QuotaUsage
from app.models.schemas import ModelProvider
from app.utils.cache import get_cache


class ModelHealthStatus(str, Enum):
    """模型健康状态"""
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


class ModelGateway:
    """模型网关 - 统一管理多模型调用"""
    
    def __init__(self):
        self.settings = get_settings()
        self.cache = get_cache()
        self._models: dict[str, BaseChatModel] = {}
        self._health_status: dict[int, ModelHealthStatus] = {}
        self._call_stats: dict[int, dict] = {}  # 调用统计
        self._latency_history: defaultdict[int, deque] = defaultdict(lambda: deque(maxlen=200))
        self._recent_calls: defaultdict[int, deque] = defaultdict(deque)  # QPS窗口
        self._daily_usage: dict[int, dict] = {}  # {"date": "2024-01-01", "count": 0}

    def resolve_api_key(self, api_key_ref: str) -> Optional[str]:
        """解析API密钥引用，支持直接环境变量或 MODEL_KEY_ 前缀"""
        if not api_key_ref:
            return None
        return os.getenv(api_key_ref) or os.getenv(f"MODEL_KEY_{api_key_ref}")
    
    def get_model(self, provider: ModelProvider, model_name: str, 
                  api_key: str, endpoint: Optional[str] = None) -> BaseChatModel:
        """
        获取模型实例（带缓存）
        
        Args:
            provider: 模型提供商
            model_name: 模型名称
            api_key: API密钥
            endpoint: API端点（可选）
            
        Returns:
            LangChain模型实例
        """
        cache_key = f"model:{provider}:{model_name}"
        
        if cache_key in self._models:
            return self._models[cache_key]
        
        model = self._create_model(provider, model_name, api_key, endpoint)
        self._models[cache_key] = model
        return model
    
    def _create_model(self, provider: ModelProvider, model_name: str, 
                     api_key: str, endpoint: Optional[str] = None) -> BaseChatModel:
        """创建模型实例"""
        if provider == ModelProvider.OPENAI:
            return ChatOpenAI(
                model_name=model_name,
                openai_api_key=api_key,
                temperature=0.1,
                timeout=self.settings.model_request_timeout,
            )
        elif provider == ModelProvider.ALIYUN:
            # 使用通义千问
            return ChatTongyi(
                model=model_name,
                api_key=api_key,
                temperature=0.1,
                timeout=self.settings.model_request_timeout,
            )
        elif provider == ModelProvider.DOUBAO:
            # 使用百川
            return ChatBaichuan(
                model=model_name,
                api_key=api_key,
                temperature=0.1,
                timeout=self.settings.model_request_timeout,
            )
        elif provider == ModelProvider.KIMI:
            # Kimi使用OpenAI兼容接口
            return ChatOpenAI(
                model_name=model_name,
                openai_api_key=api_key,
                base_url=endpoint or "https://api.moonshot.cn/v1",
                temperature=0.1,
                timeout=self.settings.model_request_timeout,
            )
        else:
            raise ValueError(f"Unsupported model provider: {provider}")
    
    def invoke(self, model: BaseChatModel, messages: list,
               model_id: int, scenario: str,
               qps_limit: Optional[int] = None,
               daily_quota: Optional[int] = None,
               db: Optional[Session] = None,
               **kwargs) -> Any:
        """
        调用模型（带重试、限流、统计）
        
        Args:
            model: 模型实例
            messages: 消息列表
            model_id: 模型ID（用于统计）
            scenario: 场景（用于统计）
            qps_limit: 每秒并发限制
            daily_quota: 每日配额限制
            db: 可选数据库会话，用于记录调用日志
            **kwargs: 额外参数
            
        Returns:
            模型响应
        """
        start_time = time.time()
        request_id = f"{scenario}_{int(time.time() * 1000)}"
        
        # 检查健康状态
        if self._health_status.get(model_id) == ModelHealthStatus.UNHEALTHY:
            raise RuntimeError(f"Model {model_id} is unhealthy")
        
        # 检查配额（简化实现）
        if not self._check_quota(model_id, qps_limit=qps_limit, daily_quota=daily_quota):
            raise RuntimeError(f"Model {model_id} quota exceeded")
        
        # 重试逻辑
        last_error = None
        for attempt in range(self.settings.model_max_retries):
            try:
                response = model.invoke(messages, **kwargs)
                
                # 记录成功
                latency_ms = (time.time() - start_time) * 1000
                self._record_call(
                    model_id=model_id,
                    scenario=scenario,
                    latency_ms=latency_ms,
                    success=True,
                    error=None,
                    request_id=request_id,
                    db=db,
                    daily_quota=daily_quota,
                )
                
                return response
            except Exception as e:
                last_error = e
                if attempt < self.settings.model_max_retries - 1:
                    time.sleep(0.5 * (attempt + 1))  # 指数退避
                else:
                    # 记录失败
                    latency_ms = (time.time() - start_time) * 1000
                    self._record_call(
                        model_id=model_id,
                        scenario=scenario,
                        latency_ms=latency_ms,
                        success=False,
                        error=str(e),
                        request_id=request_id,
                        db=db,
                        daily_quota=daily_quota,
                    )
                    raise
        
        raise last_error
    
    def _check_quota(self, model_id: int, qps_limit: Optional[int] = None,
                     daily_quota: Optional[int] = None) -> bool:
        """检查配额（QPS & 每日配额）"""
        now = time.time()
        # QPS窗口
        if qps_limit:
            window = self._recent_calls[model_id]
            while window and now - window[0] > 1:
                window.popleft()
            if len(window) >= qps_limit:
                return False
        # 每日配额
        if daily_quota:
            today = datetime.utcnow().strftime("%Y-%m-%d")
            usage = self._daily_usage.get(model_id, {"date": today, "count": 0})
            if usage["date"] != today:
                usage = {"date": today, "count": 0}
            if usage["count"] >= daily_quota:
                self._daily_usage[model_id] = usage
                return False
            self._daily_usage[model_id] = usage
        return True
    
    def _record_call(self, model_id: int, scenario: str, latency_ms: float, 
                    success: bool, error: Optional[str], request_id: str,
                    db: Optional[Session] = None, daily_quota: Optional[int] = None):
        """记录调用统计"""
        if model_id not in self._call_stats:
            self._call_stats[model_id] = {
                "total_calls": 0,
                "success_calls": 0,
                "failed_calls": 0,
                "total_latency": 0.0,
                "errors": []
            }
        
        stats = self._call_stats[model_id]
        stats["total_calls"] += 1
        stats["total_latency"] += latency_ms
        
        if success:
            stats["success_calls"] += 1
        else:
            stats["failed_calls"] += 1
            if error:
                stats["errors"].append(error)
        
        # 维护延迟历史用于P95估算
        self._latency_history[model_id].append(latency_ms)
        # 维护QPS窗口
        self._recent_calls[model_id].append(time.time())
        # 维护每日配额计数
        if daily_quota:
            today = datetime.utcnow().strftime("%Y-%m-%d")
            usage = self._daily_usage.get(model_id, {"date": today, "count": 0})
            if usage["date"] != today:
                usage = {"date": today, "count": 0}
            usage["count"] += 1
            self._daily_usage[model_id] = usage
            self._persist_quota_usage(model_id, usage, db=db)
        
        # 写入调用日志
        self._persist_call_log(
            model_id=model_id,
            scenario=scenario,
            latency_ms=latency_ms,
            success=success,
            error=error,
            request_id=request_id,
            db=db,
        )
        
        # 更新健康状态
        success_rate = stats["success_calls"] / stats["total_calls"] if stats["total_calls"] > 0 else 0
        if success_rate < 0.8:
            self._health_status[model_id] = ModelHealthStatus.UNHEALTHY
        else:
            self._health_status[model_id] = ModelHealthStatus.HEALTHY
    
    def _persist_call_log(self, model_id: int, scenario: str, latency_ms: float,
                          success: bool, error: Optional[str], request_id: str,
                          db: Optional[Session] = None):
        """持久化模型调用日志"""
        session = db or SessionLocal()
        try:
            log = ModelCallLog(
                request_id=request_id,
                scenario=scenario,
                model_id=model_id,
                latency_ms=latency_ms,
                tokens_in=None,
                tokens_out=None,
                cost_est=None,
                status="success" if success else "failed",
                error_type=error,
            )
            session.add(log)
            session.commit()
        except Exception:
            session.rollback()
        finally:
            if db is None:
                session.close()

    def _persist_quota_usage(self, model_id: int, usage: dict, db: Optional[Session] = None):
        """持久化每日配额计数"""
        session = db or SessionLocal()
        try:
            date_value = datetime.strptime(usage["date"], "%Y-%m-%d")
            quota = (
                session.query(QuotaUsage)
                .filter(QuotaUsage.model_id == model_id, QuotaUsage.date == date_value)
                .first()
            )
            if not quota:
                quota = QuotaUsage(
                    model_id=model_id,
                    date=date_value,
                    calls=usage["count"],
                )
                session.add(quota)
            else:
                quota.calls = usage["count"]
            session.commit()
        except Exception:
            session.rollback()
        finally:
            if db is None:
                session.close()
    
    def get_health_status(self, model_id: int) -> ModelHealthStatus:
        """获取模型健康状态"""
        return self._health_status.get(model_id, ModelHealthStatus.UNKNOWN)
    
    def get_stats(self, model_id: int) -> dict:
        """获取调用统计"""
        stats = self._call_stats.get(model_id, {})
        if stats:
            avg_latency = stats["total_latency"] / stats["total_calls"] if stats["total_calls"] > 0 else 0
            success_rate = stats["success_calls"] / stats["total_calls"] if stats["total_calls"] > 0 else 0
            p95_latency = None
            latencies = list(self._latency_history.get(model_id, []))
            if len(latencies) >= 20:
                try:
                    p95_latency = statistics.quantiles(latencies, n=100)[94]
                except Exception:
                    p95_latency = None
            return {
                **stats,
                "avg_latency_ms": avg_latency,
                "success_rate": success_rate,
                "p95_latency_ms": p95_latency,
            }
        return {}


# 全局模型网关实例
_model_gateway: Optional[ModelGateway] = None


def get_model_gateway() -> ModelGateway:
    """获取模型网关实例（单例）"""
    global _model_gateway
    if _model_gateway is None:
        _model_gateway = ModelGateway()
    return _model_gateway
