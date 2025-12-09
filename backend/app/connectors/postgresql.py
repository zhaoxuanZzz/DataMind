"""PostgreSQL连接器"""
from typing import Any, Optional

import psycopg2
from psycopg2.extras import RealDictCursor
from loguru import logger

from app.connectors.base import BaseConnector
from app.models.schemas import DataSourceType


class PostgreSQLConnector(BaseConnector):
    """PostgreSQL连接器"""
    
    def connect(self) -> bool:
        """建立连接"""
        host = self.connection_info.get("host", "localhost")
        port = self.connection_info.get("port", 5432)
        user = self.connection_info.get("user")
        database = self.connection_info.get("database")
        
        logger.info(f"尝试连接 PostgreSQL: {user}@{host}:{port}/{database}")
        try:
            self._connection = psycopg2.connect(
                host=host,
                port=port,
                user=user,
                password=self.connection_info.get("password"),
                database=database,
                connect_timeout=self.timeout,
            )
            logger.info(f"PostgreSQL 连接成功")
            return True
        except psycopg2.OperationalError as e:
            logger.error(f"PostgreSQL 连接失败 (OperationalError): {str(e)}")
            raise ConnectionError(f"Failed to connect to PostgreSQL: {str(e)}")
        except Exception as e:
            logger.error(f"PostgreSQL 连接失败 (其他错误): {str(e)}", exc_info=True)
            raise ConnectionError(f"Failed to connect to PostgreSQL: {str(e)}")
    
    def disconnect(self) -> None:
        """断开连接"""
        if self._connection:
            self._connection.close()
            self._connection = None
    
    def test_connection(self) -> bool:
        """测试连接"""
        logger.info("开始测试 PostgreSQL 连接")
        try:
            if not self._connection:
                logger.debug("连接不存在，先建立连接")
                self.connect()
            else:
                logger.debug("使用现有连接")
            
            logger.debug("执行测试查询: SELECT 1")
            cursor = self._connection.cursor()
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            cursor.close()
            logger.info(f"PostgreSQL 连接测试成功，结果: {result}")
            return True
        except ConnectionError:
            # 重新抛出连接错误
            raise
        except psycopg2.Error as e:
            logger.error(f"PostgreSQL 测试查询失败 (psycopg2.Error): {str(e)}", exc_info=True)
            # 确保连接被关闭
            if self._connection:
                try:
                    self._connection.close()
                except:
                    pass
                self._connection = None
            raise ConnectionError(f"Failed to test PostgreSQL connection: {str(e)}")
        except Exception as e:
            logger.error(f"PostgreSQL 连接测试失败 (其他错误): {str(e)}", exc_info=True)
            # 确保连接被关闭
            if self._connection:
                try:
                    self._connection.close()
                except:
                    pass
                self._connection = None
            raise ConnectionError(f"Failed to test PostgreSQL connection: {str(e)}")
    
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
            cursor = self._connection.cursor(cursor_factory=RealDictCursor)
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
                cursor.execute("""
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns
                    WHERE table_name = %s
                    ORDER BY ordinal_position
                """, (table_name,))
                columns = cursor.fetchall()
                return {
                    "table": table_name,
                    "columns": [
                        {
                            "Field": col[0],
                            "Type": col[1],
                            "Null": col[2],
                            "Default": col[3]
                        }
                        for col in columns
                    ]
                }
            else:
                # 获取所有表
                cursor.execute("""
                    SELECT table_name
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                """)
                tables = [row[0] for row in cursor.fetchall()]
                
                schema = {"tables": {}}
                for table in tables:
                    cursor.execute("""
                        SELECT column_name, data_type, is_nullable, column_default
                        FROM information_schema.columns
                        WHERE table_name = %s
                        ORDER BY ordinal_position
                    """, (table,))
                    columns = cursor.fetchall()
                    schema["tables"][table] = [
                        {
                            "Field": col[0],
                            "Type": col[1],
                            "Null": col[2],
                            "Default": col[3]
                        }
                        for col in columns
                    ]
                
                return schema
        except Exception as e:
            raise RuntimeError(f"Failed to get schema: {str(e)}")


# 连接器注册在 app.connectors.registry 中统一管理
