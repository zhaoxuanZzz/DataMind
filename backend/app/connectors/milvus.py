"""Milvus连接器"""
from typing import Any, Optional

from pymilvus import connections, Collection, utility

from app.connectors.base import BaseConnector
from app.models.schemas import DataSourceType


class MilvusConnector(BaseConnector):
    """Milvus连接器"""
    
    def __init__(self, connection_info: dict[str, Any], timeout: int = 30, max_rows: int = 10000):
        super().__init__(connection_info, timeout, max_rows)
        self.alias = connection_info.get("alias", "default")
        self.host = connection_info.get("host", "localhost")
        self.port = connection_info.get("port", 19530)
    
    def connect(self) -> bool:
        """建立连接"""
        try:
            connections.connect(
                alias=self.alias,
                host=self.host,
                port=self.port,
                timeout=self.timeout
            )
            self._connection = True  # Milvus使用连接别名管理
            return True
        except Exception as e:
            raise ConnectionError(f"Failed to connect to Milvus: {str(e)}")
    
    def disconnect(self) -> None:
        """断开连接"""
        try:
            if self._connection:
                connections.disconnect(self.alias)
        except Exception:
            pass
        finally:
            self._connection = None
    
    def test_connection(self) -> bool:
        """测试连接"""
        try:
            if not self._connection:
                self.connect()
            # 尝试列出集合
            utility.list_collections()
            return True
        except Exception as e:
            # 确保连接被关闭
            if self._connection:
                try:
                    self.disconnect()
                except:
                    pass
            # 重新抛出异常以便上层处理
            raise ConnectionError(f"Failed to test Milvus connection: {str(e)}")
    
    def execute_query(self, query: str, collection_name: str, 
                     vectors: list[list[float]], top_k: int = 10,
                     expr: Optional[str] = None, **kwargs) -> list[dict[str, Any]]:
        """
        执行向量检索查询
        
        Args:
            query: 查询描述（用于日志）
            collection_name: 集合名称
            vectors: 查询向量
            top_k: 返回top K结果
            expr: 过滤表达式
            **kwargs: 额外参数（如search_params）
            
        Returns:
            检索结果列表
        """
        if not self._connection:
            self.connect()
        
        try:
            collection = Collection(name=collection_name, using=self.alias)
            collection.load()
            
            # 执行搜索
            search_params = kwargs.get("search_params", {"metric_type": "L2", "params": {"nprobe": 10}})
            results = collection.search(
                data=vectors,
                anns_field=kwargs.get("anns_field", "embedding"),
                param=search_params,
                limit=min(top_k, self.max_rows),
                expr=expr,
                output_fields=kwargs.get("output_fields", [])
            )
            
            # 格式化结果
            formatted_results = []
            for hits in results:
                for hit in hits:
                    item = {
                        "id": hit.id,
                        "distance": hit.distance,
                        "entity": hit.entity.to_dict() if hasattr(hit, "entity") else {}
                    }
                    formatted_results.append(item)
            
            return formatted_results
        except Exception as e:
            raise RuntimeError(f"Vector query execution failed: {str(e)}")
    
    def get_schema(self, table_name: Optional[str] = None) -> dict[str, Any]:
        """
        获取schema信息（集合信息）
        
        Args:
            table_name: 集合名称，如果为None则返回所有集合
            
        Returns:
            schema信息字典
        """
        if not self._connection:
            self.connect()
        
        try:
            if table_name:
                # 获取单个集合信息
                collection = Collection(name=table_name, using=self.alias)
                schema = collection.schema
                return {
                    "collection": table_name,
                    "fields": [{"name": f.name, "type": str(f.dtype)} for f in schema.fields],
                    "description": schema.description
                }
            else:
                # 获取所有集合信息
                collections = utility.list_collections()
                schema = {"collections": {}}
                for col_name in collections:
                    collection = Collection(name=col_name, using=self.alias)
                    schema_info = collection.schema
                    schema["collections"][col_name] = {
                        "fields": [{"name": f.name, "type": str(f.dtype)} for f in schema_info.fields],
                        "description": schema_info.description
                    }
                return schema
        except Exception as e:
            raise RuntimeError(f"Failed to get schema: {str(e)}")


# 连接器注册在 app.connectors.registry 中统一管理
