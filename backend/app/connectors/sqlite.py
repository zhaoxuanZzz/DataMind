"""SQLite连接器"""
import sqlite3
from typing import Any, Optional

from loguru import logger

from app.connectors.base import BaseConnector


class SQLiteConnector(BaseConnector):
    """SQLite连接器"""

    def connect(self) -> bool:
        """建立连接"""
        try:
            db_path = self.connection_info.get("database", self.connection_info.get("path", ""))
            if not db_path:
                raise ValueError("database path is required in connection_info")
            self._connection = sqlite3.connect(db_path, timeout=self.timeout)
            self._connection.row_factory = sqlite3.Row
            return True
        except sqlite3.Error as e:
            raise ConnectionError(f"Failed to connect to SQLite: {str(e)}")

    def disconnect(self) -> None:
        """断开连接"""
        if self._connection:
            try:
                self._connection.close()
            except Exception:
                pass
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
            if self._connection:
                try:
                    self._connection.close()
                except Exception:
                    pass
                self._connection = None
            raise ConnectionError(f"Failed to test SQLite connection: {str(e)}")

    def execute_query(self, query: str, **kwargs) -> list[dict[str, Any]]:
        """执行查询"""
        if not self._connection:
            self.connect()

        query_upper = query.strip().upper()
        if not query_upper.startswith("SELECT"):
            raise ValueError("Only SELECT queries are allowed")

        if "LIMIT" not in query_upper:
            query = f"{query.rstrip(';')} LIMIT {self.max_rows}"

        try:
            cursor = self._connection.cursor()
            cursor.execute(query)
            rows = cursor.fetchall()
            if not rows:
                return []
            columns = [desc[0] for desc in cursor.description]
            return [dict(zip(columns, row)) for row in rows]
        except Exception as e:
            raise RuntimeError(f"Query execution failed: {str(e)}")

    def get_schema(self, table_name: Optional[str] = None) -> dict[str, Any]:
        """获取schema信息"""
        if not self._connection:
            self.connect()

        try:
            cursor = self._connection.cursor()

            if table_name:
                cursor.execute(f"PRAGMA table_info(`{table_name}`)")
                columns = cursor.fetchall()
                return {
                    "table": table_name,
                    "columns": [
                        {"name": col[1], "type": col[2], "notnull": bool(col[3]), "pk": bool(col[5])}
                        for col in columns
                    ],
                }

            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
            )
            tables = [row[0] for row in cursor.fetchall()]

            schema = {}
            for tbl in tables:
                cursor.execute(f"PRAGMA table_info(`{tbl}`)")
                columns = cursor.fetchall()
                schema[tbl] = [
                    {"name": col[1], "type": col[2], "notnull": bool(col[3]), "pk": bool(col[5])}
                    for col in columns
                ]

            return schema
        except Exception as e:
            raise RuntimeError(f"Failed to get schema: {str(e)}")
