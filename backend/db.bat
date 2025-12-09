@echo off
REM DataMind 数据库管理快捷命令 (Windows)
REM 用法: db.bat [command]

if "%1"=="" (
    echo 用法: db.bat [command]
    echo.
    echo 可用命令:
    echo   init           - 初始化数据库表结构
    echo   migrate        - 执行迁移脚本
    echo   data           - 初始化示例数据
    echo   reset          - 重置数据库（危险操作）
    echo   status         - 显示数据库状态
    echo   test-db        - 创建测试数据库
    echo   test-datasource - 初始化测试数据源配置
    echo.
    exit /b 1
)

python db_manager.py %*

