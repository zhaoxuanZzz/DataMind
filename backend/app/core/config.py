"""应用配置管理"""
from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用配置"""

    # 应用基础配置
    app_name: str = "DataMind"
    app_version: str = "1.0.0"
    debug: bool = False
    log_level: str = "INFO"
    
    # API配置
    api_prefix: str = "/api/v1"
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    # 数据库配置（用于存储配置数据）
    database_url: str = "sqlite:///./datamind.db"
    
    # 安全配置
    secret_key: str = "your-secret-key-change-in-production"
    access_token_expire_minutes: int = 30
    
    # 查询执行配置
    query_timeout: int = 30  # 秒
    max_query_rows: int = 10000
    enable_query_cache: bool = True
    cache_ttl: int = 300  # 秒
    
    # 模型网关配置
    model_gateway_enabled: bool = True
    model_request_timeout: int = 60  # 秒
    model_max_retries: int = 3
    
    # 向量库配置
    chromadb_persist_directory: str = "./chroma_db"
    milvus_host: str = "localhost"
    milvus_port: int = 19530
    
    # 可观测性配置
    enable_tracing: bool = True
    enable_metrics: bool = True
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        protected_namespaces=('settings_',)  # 只保护 settings_ 命名空间，允许 model_ 开头的字段
    )


@lru_cache()
def get_settings() -> Settings:
    """获取配置实例（单例）"""
    return Settings()
