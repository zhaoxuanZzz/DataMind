"""模型网关API路由"""
from typing import List, Optional
import statistics

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.models.database import (
    ModelConfig as ModelConfigModel,
    ModelRouteStrategy as ModelRouteStrategyModel,
    ModelCallLog,
)
from app.models.schemas import (
    ModelConfigCreate,
    ModelConfigUpdate,
    ModelConfigResponse,
    ModelRouteStrategyCreate,
    ModelRouteStrategyUpdate,
    ModelRouteStrategyResponse,
    ModelGatewayStatsResponse,
    ModelStat,
    ProviderStat,
    ModelCallLogResponse,
    ModelProvider,
    ModelPurpose,
)
from app.services.model_gateway import get_model_gateway, ModelHealthStatus


router = APIRouter(prefix="/models", tags=["模型网关"])


def _calc_model_stats(db: Session, model_id: int) -> dict:
    """从模型调用日志计算统计信息"""
    total_calls = (
        db.query(func.count(ModelCallLog.id))
        .filter(ModelCallLog.model_id == model_id)
        .scalar()
        or 0
    )
    avg_latency = (
        db.query(func.avg(ModelCallLog.latency_ms))
        .filter(ModelCallLog.model_id == model_id)
        .scalar()
        or 0
    )
    success_calls = (
        db.query(
            func.sum(
                case(
                    (ModelCallLog.status == "success", 1),
                    else_=0,
                )
            )
        )
        .filter(ModelCallLog.model_id == model_id)
        .scalar()
        or 0
    )
    success_rate = success_calls / total_calls if total_calls else None

    # 近似P95：取最近200条的95分位
    latencies = [
        row[0]
        for row in db.query(ModelCallLog.latency_ms)
        .filter(ModelCallLog.model_id == model_id)
        .order_by(ModelCallLog.created_at.desc())
        .limit(200)
        .all()
        if row[0] is not None
    ]
    p95_latency = (
        statistics.quantiles(latencies, n=100)[94] if len(latencies) >= 20 else None
    )

    return {
        "total_calls": total_calls,
        "avg_latency_ms": float(avg_latency) if avg_latency else None,
        "success_rate": float(success_rate) if success_rate is not None else None,
        "p95_latency_ms": float(p95_latency) if p95_latency is not None else None,
    }


def _parse_purposes(raw) -> list[ModelPurpose]:
    """将数据库存储的用途转换为枚举列表"""
    if raw is None:
        return []
    if isinstance(raw, list):
        return [ModelPurpose(p) for p in raw]
    # 兼容旧数据字符串
    try:
        return [ModelPurpose(raw)]
    except Exception:
        return []


def _to_config_response(
    cfg: ModelConfigModel, stats: dict, health: ModelHealthStatus
) -> ModelConfigResponse:
    """组装模型配置响应"""
    return ModelConfigResponse(
        id=cfg.id,
        provider=cfg.provider,
        model_name=cfg.model_name,
        purpose=_parse_purposes(cfg.purpose),
        endpoint=cfg.endpoint,
        api_key_ref=cfg.api_key_ref,
        qps_limit=cfg.qps_limit,
        daily_quota=cfg.daily_quota,
        cost_metric=cfg.cost_metric,
        health_status=health.value if isinstance(health, ModelHealthStatus) else health,
        created_at=cfg.created_at,
        updated_at=cfg.updated_at,
        avg_latency_ms=stats.get("avg_latency_ms"),
        p95_latency_ms=stats.get("p95_latency_ms"),
        success_rate=stats.get("success_rate"),
        total_calls=stats.get("total_calls"),
    )


@router.get("/configs", response_model=List[ModelConfigResponse])
async def list_model_configs(db: Session = Depends(get_db)):
    """获取模型配置列表"""
    gateway = get_model_gateway()
    configs = db.query(ModelConfigModel).order_by(ModelConfigModel.id.desc()).all()
    result: list[ModelConfigResponse] = []

    for cfg in configs:
        stats = gateway.get_stats(cfg.id) or _calc_model_stats(db, cfg.id)
        health = gateway.get_health_status(cfg.id)
        # 如果网关没有记录则回退到数据库状态
        if health == ModelHealthStatus.UNKNOWN and cfg.health_status:
            try:
                health = ModelHealthStatus(cfg.health_status)
            except Exception:
                health = ModelHealthStatus.UNKNOWN
        result.append(_to_config_response(cfg, stats, health))

    return result


@router.post("/configs", response_model=ModelConfigResponse)
async def create_model_config(
    payload: ModelConfigCreate, db: Session = Depends(get_db)
):
    """创建模型配置"""
    db_obj = ModelConfigModel(
        provider=payload.provider.value,
        model_name=payload.model_name,
        purpose=[p.value for p in payload.purpose],
        endpoint=payload.endpoint,
        api_key_ref=payload.api_key_ref,
        qps_limit=payload.qps_limit,
        daily_quota=payload.daily_quota,
        cost_metric=payload.cost_metric,
        health_status="unknown",
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)

    return _to_config_response(db_obj, {}, ModelHealthStatus.UNKNOWN)


@router.put("/configs/{config_id}", response_model=ModelConfigResponse)
async def update_model_config(
    config_id: int, payload: ModelConfigUpdate, db: Session = Depends(get_db)
):
    """更新模型配置"""
    cfg = db.query(ModelConfigModel).filter(ModelConfigModel.id == config_id).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="Model config not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        if field == "purpose":
            setattr(cfg, field, [p.value for p in value])
        else:
            setattr(cfg, field, value)

    db.commit()
    db.refresh(cfg)

    gateway = get_model_gateway()
    stats = gateway.get_stats(cfg.id) or _calc_model_stats(db, cfg.id)
    health = gateway.get_health_status(cfg.id)
    if health == ModelHealthStatus.UNKNOWN and cfg.health_status:
        try:
            health = ModelHealthStatus(cfg.health_status)
        except Exception:
            health = ModelHealthStatus.UNKNOWN

    return _to_config_response(cfg, stats, health)


@router.delete("/configs/{config_id}")
async def delete_model_config(config_id: int, db: Session = Depends(get_db)):
    """删除模型配置，并同步清理依赖的路由策略"""
    cfg = db.query(ModelConfigModel).filter(ModelConfigModel.id == config_id).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="Model config not found")

    # 清理引用该模型的路由策略
    strategies = db.query(ModelRouteStrategyModel).all()
    for s in strategies:
        if s.primary_model_id == config_id:
            db.delete(s)
            continue
        if s.fallback_model_ids:
            filtered = [mid for mid in s.fallback_model_ids if mid != config_id]
            if len(filtered) != len(s.fallback_model_ids):
                s.fallback_model_ids = filtered
                db.add(s)

    db.delete(cfg)
    db.commit()
    return {"message": "Model config deleted"}


@router.get("/routes", response_model=List[ModelRouteStrategyResponse])
async def list_model_routes(db: Session = Depends(get_db)):
    """获取模型路由策略列表"""
    routes = (
        db.query(ModelRouteStrategyModel)
        .order_by(ModelRouteStrategyModel.updated_at.desc())
        .all()
    )
    return [
        ModelRouteStrategyResponse(
            id=r.id,
            scenario=r.scenario,
            primary_model_id=r.primary_model_id,
            fallback_model_ids=r.fallback_model_ids or [],
            rules=r.rules or {},
            health_status=r.health_status or "unknown",
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in routes
    ]


@router.get("/routes/{scenario}", response_model=ModelRouteStrategyResponse)
async def get_model_route(scenario: str, db: Session = Depends(get_db)):
    """按场景获取路由策略"""
    route = (
        db.query(ModelRouteStrategyModel)
        .filter(ModelRouteStrategyModel.scenario == scenario)
        .first()
    )
    if not route:
        raise HTTPException(status_code=404, detail="Route strategy not found")
    return ModelRouteStrategyResponse(
        id=route.id,
        scenario=route.scenario,
        primary_model_id=route.primary_model_id,
        fallback_model_ids=route.fallback_model_ids or [],
        rules=route.rules or {},
        health_status=route.health_status or "unknown",
        created_at=route.created_at,
        updated_at=route.updated_at,
    )


@router.post("/routes", response_model=ModelRouteStrategyResponse)
async def create_model_route(
    payload: ModelRouteStrategyCreate, db: Session = Depends(get_db)
):
    """创建路由策略"""
    exists = (
        db.query(ModelRouteStrategyModel)
        .filter(ModelRouteStrategyModel.scenario == payload.scenario)
        .first()
    )
    if exists:
        raise HTTPException(status_code=400, detail="Route for scenario already exists")

    db_obj = ModelRouteStrategyModel(
        scenario=payload.scenario,
        primary_model_id=payload.primary_model_id,
        fallback_model_ids=payload.fallback_model_ids,
        rules=payload.rules,
        health_status="unknown",
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)

    return ModelRouteStrategyResponse(
        id=db_obj.id,
        scenario=db_obj.scenario,
        primary_model_id=db_obj.primary_model_id,
        fallback_model_ids=db_obj.fallback_model_ids or [],
        rules=db_obj.rules or {},
        health_status=db_obj.health_status or "unknown",
        created_at=db_obj.created_at,
        updated_at=db_obj.updated_at,
    )


@router.put("/routes/{route_id}", response_model=ModelRouteStrategyResponse)
async def update_model_route(
    route_id: int, payload: ModelRouteStrategyUpdate, db: Session = Depends(get_db)
):
    """更新路由策略"""
    route = (
        db.query(ModelRouteStrategyModel)
        .filter(ModelRouteStrategyModel.id == route_id)
        .first()
    )
    if not route:
        raise HTTPException(status_code=404, detail="Route strategy not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(route, field, value)

    db.commit()
    db.refresh(route)

    return ModelRouteStrategyResponse(
        id=route.id,
        scenario=route.scenario,
        primary_model_id=route.primary_model_id,
        fallback_model_ids=route.fallback_model_ids or [],
        rules=route.rules or {},
        health_status=route.health_status or "unknown",
        created_at=route.created_at,
        updated_at=route.updated_at,
    )


@router.delete("/routes/{route_id}")
async def delete_model_route(route_id: int, db: Session = Depends(get_db)):
    """删除路由策略"""
    route = (
        db.query(ModelRouteStrategyModel)
        .filter(ModelRouteStrategyModel.id == route_id)
        .first()
    )
    if not route:
        raise HTTPException(status_code=404, detail="Route strategy not found")

    db.delete(route)
    db.commit()
    return {"message": "Route strategy deleted"}


@router.get("/logs", response_model=List[ModelCallLogResponse])
async def list_model_logs(
    scenario: Optional[str] = None,
    model_id: Optional[int] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """获取模型调用日志"""
    query = db.query(ModelCallLog).order_by(ModelCallLog.created_at.desc())
    if scenario:
        query = query.filter(ModelCallLog.scenario == scenario)
    if model_id:
        query = query.filter(ModelCallLog.model_id == model_id)
    if status:
        query = query.filter(ModelCallLog.status == status)

    logs = query.offset(skip).limit(min(limit, 500)).all()
    return logs


@router.get("/stats", response_model=ModelGatewayStatsResponse)
async def get_gateway_stats(db: Session = Depends(get_db)):
    """获取模型网关汇总统计"""
    gateway = get_model_gateway()
    configs = db.query(ModelConfigModel).all()

    model_stats: list[ModelStat] = []
    for cfg in configs:
        stats = gateway.get_stats(cfg.id) or _calc_model_stats(db, cfg.id)
        health = gateway.get_health_status(cfg.id)
        if health == ModelHealthStatus.UNKNOWN and cfg.health_status:
            try:
                health = ModelHealthStatus(cfg.health_status)
            except Exception:
                health = ModelHealthStatus.UNKNOWN

        model_stats.append(
            ModelStat(
                model_id=cfg.id,
                model_name=cfg.model_name,
                provider=ModelProvider(cfg.provider),
                purpose=_parse_purposes(cfg.purpose),
                health_status=health.value
                if isinstance(health, ModelHealthStatus)
                else str(health),
                success_rate=stats.get("success_rate"),
                avg_latency_ms=stats.get("avg_latency_ms"),
                p95_latency_ms=stats.get("p95_latency_ms"),
                total_calls=stats.get("total_calls"),
            )
        )

    provider_map: dict[str, ProviderStat] = {}
    for m in model_stats:
        key = m.provider.value if isinstance(m.provider, ModelProvider) else str(m.provider)
        if key not in provider_map:
            provider_map[key] = ProviderStat(
                provider=ModelProvider(key),
                total_models=0,
                total_calls=0,
                success_rate=None,
                avg_latency_ms=None,
                health_status="unknown",
            )
        ps = provider_map[key]
        ps.total_models += 1
        ps.total_calls += m.total_calls or 0

        # 汇总成功率/延迟取平均
        if m.success_rate is not None:
            if ps.success_rate is None:
                ps.success_rate = 0.0
            ps.success_rate = (
                (ps.success_rate * (ps.total_models - 1) + m.success_rate)
                / ps.total_models
            )
        if m.avg_latency_ms is not None:
            if ps.avg_latency_ms is None:
                ps.avg_latency_ms = 0.0
            ps.avg_latency_ms = (
                (ps.avg_latency_ms * (ps.total_models - 1) + m.avg_latency_ms)
                / ps.total_models
            )

        # 只要有一个不健康则标记为unhealthy
        if m.health_status == ModelHealthStatus.UNHEALTHY.value:
            ps.health_status = ModelHealthStatus.UNHEALTHY.value
        elif (
            ps.health_status != ModelHealthStatus.UNHEALTHY.value
            and m.health_status == ModelHealthStatus.HEALTHY.value
        ):
            ps.health_status = ModelHealthStatus.HEALTHY.value

    return ModelGatewayStatsResponse(
        providers=list(provider_map.values()),
        models=model_stats,
    )

