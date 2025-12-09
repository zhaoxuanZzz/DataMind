"""连接器注册中心"""
import warnings

from app.connectors.base import ConnectorFactory
from app.models.schemas import DataSourceType

# 延迟导入避免循环依赖
def register_all_connectors():
    """注册所有连接器"""
    # 避免 pymilvus 导入时 pkg_resources 弃用警告污染日志
    warnings.filterwarnings(
        "ignore",
        message=r"pkg_resources is deprecated as an API",
        category=UserWarning,
        module=r"pymilvus\.client.*",
    )
    from app.connectors import mysql, postgresql, chroma, milvus
    
    ConnectorFactory.register(DataSourceType.MYSQL, mysql.MySQLConnector)
    ConnectorFactory.register(DataSourceType.POSTGRESQL, postgresql.PostgreSQLConnector)
    ConnectorFactory.register(DataSourceType.CHROMADB, chroma.ChromaDBConnector)
    ConnectorFactory.register(DataSourceType.MILVUS, milvus.MilvusConnector)
