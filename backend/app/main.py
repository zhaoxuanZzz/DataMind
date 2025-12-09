"""FastAPI应用主入口"""
import traceback
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import get_settings
from app.core.logger import setup_logging
from app.api.main import api_router
from app.api.dependencies import init_db
from loguru import logger

# 初始化日志
setup_logging()

# 获取配置
settings = get_settings()

# 创建FastAPI应用
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="智能数据分析与可视化工具",
    docs_url="/docs",
    redoc_url="/redoc",
    debug=settings.debug  # 启用调试模式以显示详细错误信息
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册API路由
app.include_router(api_router, prefix=settings.api_prefix)


# 全局异常处理器
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """全局异常处理器，打印完整的错误堆栈"""
    # 获取完整的错误堆栈
    error_traceback = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
    
    # 使用 logger.exception 自动捕获并打印完整堆栈
    logger.exception(f"未处理的异常: {type(exc).__name__}: {str(exc)}")
    logger.error(f"请求路径: {request.method} {request.url.path}")
    logger.error(f"请求参数: {dict(request.query_params)}")
    if request.method in ["POST", "PUT", "PATCH"]:
        try:
            body = await request.body()
            if body:
                logger.error(f"请求体: {body.decode('utf-8', errors='ignore')[:500]}")
        except Exception:
            pass
    
    # 打印完整堆栈到控制台
    print("\n" + "="*80)
    print("完整错误堆栈:")
    print("="*80)
    print(error_traceback)
    print("="*80 + "\n")
    
    # 如果是调试模式，返回详细错误信息
    if settings.debug:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "内部服务器错误",
                "type": type(exc).__name__,
                "message": str(exc),
                "traceback": error_traceback.split("\n"),
                "path": str(request.url.path),
                "method": request.method,
            }
        )
    else:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "内部服务器错误",
                "message": "发生了一个未预期的错误，请查看服务器日志获取详细信息"
            }
        )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """请求验证异常处理器"""
    error_traceback = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
    logger.warning(f"请求验证错误: {exc.errors()}")
    logger.debug(f"完整堆栈:\n{error_traceback}")
    
    # 在调试模式下打印完整堆栈
    if settings.debug:
        print("\n" + "="*80)
        print("请求验证错误堆栈:")
        print("="*80)
        print(error_traceback)
        print("="*80 + "\n")
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "请求验证失败",
            "details": exc.errors(),
            "path": str(request.url.path),
            "method": request.method,
        }
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """HTTP异常处理器"""
    logger.warning(f"HTTP异常: {exc.status_code} - {exc.detail}")
    logger.debug(f"请求路径: {request.method} {request.url.path}")
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "HTTP错误",
            "status_code": exc.status_code,
            "detail": exc.detail,
            "path": str(request.url.path),
            "method": request.method,
        }
    )


@app.on_event("startup")
async def startup_event():
    """应用启动事件"""
    # 初始化数据库
    init_db()
    # 注册所有连接器
    from app.connectors.registry import register_all_connectors
    register_all_connectors()
    print(f"{settings.app_name} v{settings.app_version} started successfully")


@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭事件"""
    print(f"{settings.app_name} shutting down")


@app.get("/")
async def root():
    """根路径"""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy"}
