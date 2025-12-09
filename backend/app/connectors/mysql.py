"""MySQL连接器"""
from typing import Any, Optional

import pymysql
from pymysql.cursors import DictCursor

from app.connectors.base import BaseConnector
from app.models.schemas import DataSourceType


class MySQLConnector(BaseConnector):
    """MySQL连接器"""
    
    def connect(self) -> bool:
        """建立连接"""
        try:
            self._connection = pymysql.connect(
                host=self.connection_info.get("host", "localhost"),
                port=self.connection_info.get("port", 3306),
                user=self.connection_info.get("user"),
                password=self.connection_info.get("password"),
                database=self.connection_info.get("database"),
                charset="utf8mb4",
                cursorclass=DictCursor,
                connect_timeout=self.timeout,
            )
            return True
        except Exception as e:
            raise ConnectionError(f"Failed to connect to MySQL: {str(e)}")
    
    def disconnect(self) -> None:
        """断开连接"""
        if self._connection:
            self._connection.close()
            self._connection = None
    
    def test_connection(self) -> bool:
        """测试连接"""
        try:
            if not self._connection:
                self.connect()
            cursor = self._connection.cursor()
            cursor.execute("SELECT 1")
            cursor.fetchone()
            cursor.close()
            return True
        except Exception as e:
            # 确保连接被关闭
            if self._connection:
                try:
                    self._connection.close()
                except:
                    pass
                self._connection = None
            # 重新抛出异常以便上层处理
            raise ConnectionError(f"Failed to test MySQL connection: {str(e)}")
    
    def execute_query(self, query: str, **kwargs) -> list[dict[str, Any]]:
        """执行查询"""
        if not self._connection:
            self.connect()
        
        # 安全检查：只允许SELECT语句
        query_upper = query.strip().upper()
        if not query_upper.startswith("SELECT"):
            raise ValueError("Only SELECT queries are allowed")
        
        # 自动添加LIMIT
        if "LIMIT" not in query_upper:
            query = f"{query.rstrip(';')} LIMIT {self.max_rows}"
        
        try:
            cursor = self._connection.cursor()
            cursor.execute(query)
            results = cursor.fetchall()
            return [dict(row) for row in results]
        except Exception as e:
            raise RuntimeError(f"Query execution failed: {str(e)}")
    
    def get_schema(self, table_name: Optional[str] = None) -> dict[str, Any]:
        """获取schema信息"""
        if not self._connection:
            self.connect()
        
        try:
            cursor = self._connection.cursor()
            
            if table_name:
                # 获取单个表的结构
                cursor.execute(f"DESCRIBE `{table_name}`")
                columns = cursor.fetchall()
                return {
                    "table": table_name,
                    "columns": [dict(col) for col in columns]
                }
            else:
                # 获取所有表
                cursor.execute("SHOW TABLES")
                tables = [list(row.values())[0] for row in cursor.fetchall()]
                
                schema = {"tables": {}}
                for table in tables:
                    cursor.execute(f"DESCRIBE `{table}`")
                    columns = cursor.fetchall()
                    schema["tables"][table] = [dict(col) for col in columns]
                
                return schema
        except Exception as e:
            raise RuntimeError(f"Failed to get schema: {str(e)}")


# 连接器注册在 app.connectors.registry 中统一管理
