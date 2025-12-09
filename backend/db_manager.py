#!/usr/bin/env python3
"""
数据库管理工具
用于执行数据库初始化、迁移等操作
"""
import os
import sys
from pathlib import Path
from typing import Optional

import psycopg2
from app.core.config import get_settings
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import ProgrammingError

# 获取项目根目录
BASE_DIR = Path(__file__).parent
SQL_DIR = BASE_DIR / "sql"

settings = get_settings()


def get_db_connection():
    """获取数据库连接"""
    # 从 database_url 解析连接信息
    db_url = settings.database_url

    if not db_url.startswith("postgresql"):
        print("错误：此工具仅支持 PostgreSQL 数据库")
        sys.exit(1)

    # 解析 PostgreSQL 连接字符串
    # postgresql://user:password@host:port/database
    import re

    match = re.match(r"postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)", db_url)
    if not match:
        print(f"错误：无法解析数据库连接字符串: {db_url}")
        sys.exit(1)

    user, password, host, port, database = match.groups()

    try:
        conn = psycopg2.connect(
            host=host, port=int(port), user=user, password=password, database=database
        )
        return conn
    except Exception as e:
        print(f"错误：无法连接到数据库: {e}")
        sys.exit(1)


def execute_sql_file(sql_file: Path, verbose: bool = True):
    """执行 SQL 文件"""
    if not sql_file.exists():
        print(f"错误：SQL 文件不存在: {sql_file}")
        return False

    conn = get_db_connection()
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)

    try:
        cursor = conn.cursor()

        with open(sql_file, "r", encoding="utf-8") as f:
            sql_content = f.read()

        if verbose:
            print(f"执行 SQL 文件: {sql_file.name}")
            print("-" * 60)

        # 执行 SQL
        cursor.execute(sql_content)

        if verbose:
            print("✓ 执行成功")

        cursor.close()
        conn.close()
        return True

    except Exception as e:
        print(f"✗ 执行失败: {e}")
        conn.close()
        return False


def init_schema(force: bool = False):
    """初始化数据库表结构"""
    print("=" * 60)
    print("初始化数据库表结构")
    print("=" * 60)

    sql_file = SQL_DIR / "init_schema.sql"
    return execute_sql_file(sql_file)


def migrate():
    """执行迁移脚本"""
    print("=" * 60)
    print("执行数据库迁移")
    print("=" * 60)

    sql_file = SQL_DIR / "migrate_add_template_columns.sql"
    return execute_sql_file(sql_file)


def init_data():
    """初始化示例数据"""
    print("=" * 60)
    print("初始化示例数据")
    print("=" * 60)

    sql_file = SQL_DIR / "init_data.sql"
    return execute_sql_file(sql_file)


def reset_db(confirm: bool = False):
    """重置数据库（删除所有表并重新创建）"""
    if not confirm:
        response = input("警告：此操作将删除所有数据！确认继续？(yes/no): ")
        if response.lower() != "yes":
            print("已取消操作")
            return False

    print("=" * 60)
    print("重置数据库")
    print("=" * 60)

    conn = get_db_connection()
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)

    try:
        cursor = conn.cursor()

        # 获取所有表名
        cursor.execute(
            """
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public'
        """
        )
        tables = [row[0] for row in cursor.fetchall()]

        if tables:
            print(f"删除 {len(tables)} 个表...")
            for table in tables:
                cursor.execute(f'DROP TABLE IF EXISTS "{table}" CASCADE')
                print(f"  ✓ 已删除表: {table}")

        cursor.close()
        conn.close()

        # 重新初始化
        print("\n重新创建表结构...")
        return init_schema()

    except Exception as e:
        print(f"✗ 重置失败: {e}")
        conn.close()
        return False


def show_status():
    """显示数据库状态"""
    print("=" * 60)
    print("数据库状态")
    print("=" * 60)

    conn = get_db_connection()

    try:
        cursor = conn.cursor()

        # 获取所有表
        cursor.execute(
            """
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public'
            ORDER BY tablename
        """
        )
        tables = [row[0] for row in cursor.fetchall()]

        print(f"\n数据库: {settings.database_url.split('/')[-1]}")
        print(f"表数量: {len(tables)}")

        if tables:
            print("\n表列表:")
            for table in tables:
                # 获取表的行数
                cursor.execute(f'SELECT COUNT(*) FROM "{table}"')
                count = cursor.fetchone()[0]
                print(f"  - {table}: {count} 行")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"✗ 查询失败: {e}")
        conn.close()
        return False


def init_test_datasource():
    """初始化测试数据源配置"""
    print("=" * 60)
    print("初始化测试数据源配置")
    print("=" * 60)

    sql_file = SQL_DIR / "init_test_datasource.sql"
    return execute_sql_file(sql_file)


def create_test_db():
    """创建测试数据库"""
    print("=" * 60)
    print("创建测试数据库")
    print("=" * 60)

    import re

    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

    # 解析数据库连接信息
    db_url = settings.database_url
    match = re.match(r"postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)", db_url)
    if not match:
        print(f"错误：无法解析数据库连接字符串: {db_url}")
        return False

    user, password, host, port, database = match.groups()

    # 连接到 postgres 数据库以创建新数据库
    try:
        admin_conn = psycopg2.connect(
            host=host,
            port=int(port),
            user=user,
            password=password,
            database="postgres",  # 连接到默认数据库
        )
        admin_conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        admin_cursor = admin_conn.cursor()

        # 创建测试数据库
        test_db_name = "datamind_test"
        print(f"创建数据库: {test_db_name}")
        admin_cursor.execute(f"CREATE DATABASE {test_db_name};")
        print(f"✓ 数据库 {test_db_name} 创建成功")

        admin_cursor.close()
        admin_conn.close()

        # 执行测试数据库初始化脚本
        sql_file = SQL_DIR / "init_test_database.sql"
        if not sql_file.exists():
            print(f"错误：SQL 文件不存在: {sql_file}")
            return False

        # 连接到新创建的测试数据库
        test_conn = psycopg2.connect(
            host=host, port=int(port), user=user, password=password, database=test_db_name
        )
        test_conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        test_cursor = test_conn.cursor()

        print(f"\n执行初始化脚本: {sql_file.name}")
        with open(sql_file, "r", encoding="utf-8") as f:
            sql_content = f.read()

        test_cursor.execute(sql_content)
        print("✓ 测试数据初始化完成")

        # 查询统计信息
        test_cursor.execute("SELECT COUNT(*) FROM orders")
        orders_count = test_cursor.fetchone()[0]
        test_cursor.execute("SELECT COUNT(*) FROM products")
        products_count = test_cursor.fetchone()[0]
        test_cursor.execute("SELECT COUNT(*) FROM customers")
        customers_count = test_cursor.fetchone()[0]
        test_cursor.execute("SELECT COUNT(*) FROM user_logins")
        logins_count = test_cursor.fetchone()[0]
        test_cursor.execute("SELECT COUNT(*) FROM channel_visits")
        visits_count = test_cursor.fetchone()[0]

        print("\n数据统计:")
        print(f"  - 订单数: {orders_count}")
        print(f"  - 产品数: {products_count}")
        print(f"  - 客户数: {customers_count}")
        print(f"  - 登录记录: {logins_count}")
        print(f"  - 渠道访问: {visits_count}")

        test_cursor.close()
        test_conn.close()

        print(f"\n✓ 测试数据库创建完成！")
        print(f"数据库名: {test_db_name}")
        print(f"连接字符串: postgresql://{user}:{password}@{host}:{port}/{test_db_name}")

        return True

    except psycopg2.errors.DuplicateDatabase:
        print(f"⚠ 数据库 datamind_test 已存在")
        response = input("是否删除并重新创建？(y/n): ")
        if response.lower() == "y":
            # 删除并重新创建
            admin_cursor.execute("DROP DATABASE datamind_test;")
            admin_cursor.execute("CREATE DATABASE datamind_test;")
            print("✓ 数据库已重新创建")
            admin_cursor.close()
            admin_conn.close()
            # 继续执行初始化
            return create_test_db()
        else:
            print("已取消操作")
            admin_cursor.close()
            admin_conn.close()
            return False
    except Exception as e:
        print(f"✗ 创建失败: {e}")
        return False


def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(
        description="DataMind 数据库管理工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python db_manager.py init          # 初始化数据库表结构
  python db_manager.py migrate        # 执行迁移脚本
  python db_manager.py data           # 初始化示例数据
  python db_manager.py reset          # 重置数据库（危险操作）
  python db_manager.py status         # 显示数据库状态
  python db_manager.py test-db        # 创建测试数据库
  python db_manager.py test-datasource  # 初始化测试数据源配置
        """,
    )

    parser.add_argument(
        "command",
        choices=["init", "migrate", "data", "reset", "status", "test-db", "test-datasource"],
        help="要执行的命令",
    )

    parser.add_argument("--force", action="store_true", help="强制执行（用于 reset 命令）")

    args = parser.parse_args()

    # 确保 SQL 目录存在
    SQL_DIR.mkdir(exist_ok=True)

    success = False

    if args.command == "init":
        success = init_schema()
    elif args.command == "migrate":
        success = migrate()
    elif args.command == "data":
        success = init_data()
    elif args.command == "reset":
        success = reset_db(confirm=args.force)
    elif args.command == "status":
        success = show_status()
    elif args.command == "test-db":
        success = create_test_db()
    elif args.command == "test-datasource":
        success = init_test_datasource()

    if success:
        print("\n✓ 操作完成")
        sys.exit(0)
    else:
        print("\n✗ 操作失败")
        sys.exit(1)


if __name__ == "__main__":
    main()
