#!/bin/bash
# DataMind 数据库管理快捷命令 (Linux/macOS)
# 用法: ./db.sh [command]

if [ -z "$1" ]; then
    echo "用法: ./db.sh [command]"
    echo ""
    echo "可用命令:"
    echo "  init           - 初始化数据库表结构"
    echo "  migrate        - 执行迁移脚本"
    echo "  data           - 初始化示例数据"
    echo "  reset          - 重置数据库（危险操作）"
    echo "  status         - 显示数据库状态"
    echo "  test-db        - 创建测试数据库"
    echo "  test-datasource - 初始化测试数据源配置"
    echo ""
    exit 1
fi

python db_manager.py "$@"

