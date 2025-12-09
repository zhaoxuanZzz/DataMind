"""ChromaDB连接器"""
from typing import Any, Optional

import chromadb
from chromadb.config import Settings as ChromaSettings

from app.connectors.base import BaseConnector
from app.models.schemas import DataSourceType


class ChromaDBConnector(BaseConnector):
    """ChromaDB连接器"""
    
    def __init__(self, connection_info: dict[str, Any], timeout: int = 30, max_rows: int = 10000):
        super().__init__(connection_info, timeout, max_rows)
        self.client: Optional[chromadb.ClientAPI] = None
        self.persist_directory = connection_info.get("persist_directory", "./chroma_db")
    
    def connect(self) -> bool:
        """建立连接"""
        try:
            self.client = chromadb.PersistentClient(
                path=self.persist_directory,
                settings=ChromaSettings(
                    anonymized_telemetry=False,
                    allow_reset=True,
                )
            )
            return True
        except Exception as e:
            raise ConnectionError(f"Failed to connect to ChromaDB: {str(e)}")
    
    def disconnect(self) -> None:
        """断开连接"""
        # ChromaDB持久化客户端不需要显式关闭
        self.client = None
    
    def test_connection(self) -> bool:
        """测试连接"""
        try:
            if not self.client:
                self.connect()
            # 尝试列出集合
            self.client.list_collections()
            return True
        except Exception as e:
            # 确保连接被关闭
            if self.client:
                try:
                    self.disconnect()
                except:
                    pass
            # 重新抛出异常以便上层处理
            raise ConnectionError(f"Failed to test ChromaDB connection: {str(e)}")
    
    def execute_query(self, query: str, collection_name: str, top_k: int = 10, 
                     query_embeddings: Optional[list[list[float]]] = None,
                     query_texts: Optional[list[str]] = None,
                     where: Optional[dict] = None, **kwargs) -> list[dict[str, Any]]:
        """
        执行向量检索查询
        
        Args:
            query: 查询描述（用于日志）
            collection_name: 集合名称
            top_k: 返回top K结果
            query_embeddings: 查询向量
            query_texts: 查询文本（需要embedding）
            where: 过滤条件
            **kwargs: 额外参数
            
        Returns:
            检索结果列表
        """
        if not self.client:
            self.connect()
        
        try:
            collection = self.client.get_collection(name=collection_name)
            
            # 执行查询
            if query_embeddings:
                results = collection.query(
                    query_embeddings=query_embeddings,
                    n_results=min(top_k, self.max_rows),
                    where=where,
                    **kwargs
                )
            elif query_texts:
                results = collection.query(
                    query_texts=query_texts,
                    n_results=min(top_k, self.max_rows),
                    where=where,
                    **kwargs
                )
            else:
                raise ValueError("Either query_embeddings or query_texts must be provided")
            
            # 格式化结果
            formatted_results = []
            if results.get("ids") and len(results["ids"]) > 0:
                for i in range(len(results["ids"][0])):
                    item = {
                        "id": results["ids"][0][i],
                        "distance": results["distances"][0][i] if results.get("distances") else None,
                        "metadata": results["metadatas"][0][i] if results.get("metadatas") else {},
                    }
                    if results.get("documents"):
                        item["document"] = results["documents"][0][i]
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
        if not self.client:
            self.connect()
        
        try:
            collections = self.client.list_collections()
            
            if table_name:
                # 获取单个集合信息
                collection = self.client.get_collection(name=table_name)
                # 获取集合的count和metadata
                count = collection.count()
                return {
                    "collection": table_name,
                    "count": count,
                    "metadata": collection.metadata or {}
                }
            else:
                # 获取所有集合信息
                schema = {"collections": {}}
                for col in collections:
                    count = col.count()
                    schema["collections"][col.name] = {
                        "count": count,
                        "metadata": col.metadata or {}
                    }
                return schema
        except Exception as e:
            raise RuntimeError(f"Failed to get schema: {str(e)}")


# 连接器注册在 app.connectors.registry 中统一管理
