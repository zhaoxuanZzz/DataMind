#!/bin/bash
# 创建测试数据库脚本

DB_NAME="datamind_test"
DB_USER="datamind"
DB_HOST="localhost"
DB_PORT="5432"

echo "============================================"
echo "创建测试数据库: $DB_NAME"
echo "============================================"

# 创建数据库
psql -U postgres -h $DB_HOST -p $DB_PORT -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "数据库可能已存在，继续..."

# 执行初始化脚本
echo "执行初始化脚本..."
psql -U $DB_USER -d $DB_NAME -h $DB_HOST -p $DB_PORT -f sql/init_test_database.sql

echo "============================================"
echo "测试数据库创建完成！"
echo "数据库名: $DB_NAME"
echo "============================================"


