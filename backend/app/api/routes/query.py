"""查询API路由"""

import time
from typing import Optional

from app.api.dependencies import get_db
from app.models.database import QueryLog
from app.models.schemas import QueryRequest, QueryResponse
from app.services.orchestrator import QueryOrchestrator
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

router = APIRouter(prefix="/query", tags=["查询"])


@router.post("/execute", response_model=QueryResponse)
async def execute_query(request: QueryRequest, db: Session = Depends(get_db)):
    """
    执行查询

    - 支持自然语言查询
    - 支持模板查询
    - 自动生成SQL/向量检索
    - 返回可视化结果
    """
    start_time = time.time()
    query_id = f"query_{int(time.time() * 1000)}"

    try:
        # 创建编排器（传入数据库会话）
        orchestrator = QueryOrchestrator(db=db)

        # 执行查询
        state = await orchestrator.execute(
            query_text=request.query_text or "",
            data_source_id=request.data_source_id,
            parameters=request.parameters or {},
        )

        # 计算耗时
        duration_ms = (time.time() - start_time) * 1000

        # 记录日志
        log_entry = QueryLog(
            user_id=None,  # TODO: 从认证获取
            data_source_id=request.data_source_id,
            query_text=request.query_text,
            generated_sql=state.get("generated_sql"),
            vector_request=state.get("vector_request"),
            duration_ms=duration_ms,
            status="success" if not state.get("error") else "failed",
            error=state.get("error"),
            trace_id=state.get("trace_id"),
        )
        db.add(log_entry)
        db.commit()

        # 构建响应
        if state.get("error"):
            return QueryResponse(
                query_id=query_id,
                status="failed",
                error=state.get("error"),
                duration_ms=duration_ms,
            )

        return QueryResponse(
            query_id=query_id,
            status="success",
            data=state.get("query_results", []),
            fields=None,  # TODO: 从结果推断字段元数据
            recommended_charts=state.get("recommended_charts", []),
            chart_config=state.get("chart_config", {}),
            generated_sql=state.get("generated_sql"),
            vector_request=state.get("vector_request"),
            duration_ms=duration_ms,
        )

    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000

        # 获取详细的错误信息
        import traceback

        error_detail = str(e)
        error_traceback = traceback.format_exc()

        # 打印错误以便调试
        print(f"Query execution error: {error_detail}")
        print(error_traceback)

        # 记录错误日志
        try:
            log_entry = QueryLog(
                user_id=None,
                data_source_id=request.data_source_id,
                query_text=request.query_text,
                duration_ms=duration_ms,
                status="failed",
                error=error_detail[:1000] if len(error_detail) > 1000 else error_detail,  # 限制长度
                trace_id=None,
            )
            db.add(log_entry)
            db.commit()
        except Exception as log_error:
            # 如果日志记录失败，至少打印出来
            print(f"Failed to log error: {str(log_error)}")

        raise HTTPException(status_code=500, detail=f"Query execution failed: {error_detail}")


@router.get("/logs", response_model=list)
async def get_query_logs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """获取查询日志"""
    logs = db.query(QueryLog).order_by(QueryLog.created_at.desc()).offset(skip).limit(limit).all()
    return logs
