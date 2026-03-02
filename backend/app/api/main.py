"""API主路由"""

from app.api.routes import agent_chat, datasource, model_gateway, query, template
from fastapi import APIRouter

api_router = APIRouter()

# 注册路由
api_router.include_router(query.router)
api_router.include_router(datasource.router)
api_router.include_router(model_gateway.router)
api_router.include_router(template.router)
api_router.include_router(agent_chat.router)
