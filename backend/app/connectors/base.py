"""数据连接器基类"""
from abc import ABC, abstractmethod
from typing import Any, Optional

from app.models.schemas import DataSourceType


class BaseConnector(ABC):
    """数据连接器基类"""
    
    def __init__(self, connection_info: dict[str, Any], timeout: int = 30, max_rows: int = 10000):
        """
        初始化连接器
        
        Args:
            connection_info: 连接信息字典
            timeout: 超时时间（秒）
            max_rows: 最大返回行数
        """
        self.connection_info = connection_info
        self.timeout = timeout
        self.max_rows = max_rows
        self._connection: Any = None
    
    @abstractmethod
    def connect(self) -> bool:
        """建立连接"""
        pass
    
    @abstractmethod
    def disconnect(self) -> None:
        """断开连接"""
        pass
    
    @abstractmethod
    def test_connection(self) -> bool:
        """测试连接"""
        pass
    
    @abstractmethod
    def execute_query(self, query: str, **kwargs) -> list[dict[str, Any]]:
        """
        执行查询
        
        Args:
            query: 查询语句
            **kwargs: 额外参数
            
        Returns:
            查询结果列表
        """
        pass
    
    @abstractmethod
    def get_schema(self, table_name: Optional[str] = None) -> dict[str, Any]:
        """
        获取schema信息
        
        Args:
            table_name: 表名，如果为None则返回所有表
            
        Returns:
            schema信息字典
        """
        pass
    
    def __enter__(self):
        """上下文管理器入口"""
        self.connect()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """上下文管理器出口"""
        self.disconnect()


class ConnectorFactory:
    """连接器工厂"""
    
    _connectors: dict[DataSourceType, type[BaseConnector]] = {}
    
    @classmethod
    def register(cls, source_type: DataSourceType, connector_class: type[BaseConnector]):
        """注册连接器类"""
        cls._connectors[source_type] = connector_class
    
    @classmethod
    def create(cls, source_type: DataSourceType, connection_info: dict[str, Any], 
               timeout: int = 30, max_rows: int = 10000) -> BaseConnector:
        """
        创建连接器实例
        
        Args:
            source_type: 数据源类型
            connection_info: 连接信息
            timeout: 超时时间
            max_rows: 最大行数
            
        Returns:
            连接器实例
        """
        if source_type not in cls._connectors:
            raise ValueError(f"Unsupported data source type: {source_type}")
        
        connector_class = cls._connectors[source_type]
        return connector_class(connection_info, timeout, max_rows)
