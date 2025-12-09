@echo off
REM DataMind 后端启动脚本（Windows）

echo 启动 DataMind 后端服务...

REM 检查虚拟环境
if not exist "venv" (
    echo 创建虚拟环境...
    python -m venv venv
)

REM 激活虚拟环境
call venv\Scripts\activate.bat

REM 安装依赖
echo 安装依赖...
pip install -r requirements.txt

REM 启动服务
echo 启动服务...
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

pause
