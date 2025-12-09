# DataMind 快速开始指南

本文档将指导您快速部署和运行 DataMind 项目。

## 目录

- [环境要求](#环境要求)
- [方式一：使用 UV 部署（推荐）](#方式一使用-uv-部署推荐)
- [方式二：使用 Conda 部署](#方式二使用-conda-部署)
- [方式三：使用 Docker Compose 部署中间件](#方式三使用-docker-compose-部署中间件)
- [配置说明](#配置说明)
- [启动服务](#启动服务)
- [常见问题](#常见问题)

## 环境要求

### 基础要求
- Python 3.10 或更高版本
- Node.js 18+ 和 npm/yarn（前端开发）
- Git

### 中间件要求（生产环境）
- PostgreSQL 15+（或使用 Docker Compose）
- Redis 7+（或使用 Docker Compose）
- Milvus 2.3+（或使用 Docker Compose）

## 方式一：使用 UV 部署（推荐）

[UV](https://github.com/astral-sh/uv) 是一个极快的 Python 包管理器和项目管理工具。

### 1. 安装 UV

#### Windows
```powershell
# 使用 PowerShell
irm https://astral.sh/uv/install.ps1 | iex
```

#### Linux/macOS
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

或者使用 pip 安装：
```bash
pip install uv
```

### 2. 使用 UV 创建项目环境

```bash
cd backend

# 创建虚拟环境并安装依赖
uv venv
uv pip install -r requirements.txt

# 或者使用 pyproject.toml（如果已创建）
uv sync
```

### 3. 激活虚拟环境

#### Windows
```powershell
.venv\Scripts\Activate.ps1
```

#### Linux/macOS
```bash
source .venv/bin/activate
```

### 4. 启动服务

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### UV 常用命令

```bash
# 安装依赖
uv pip install -r requirements.txt

# 添加新依赖
uv pip install package-name

# 更新依赖
uv pip install --upgrade package-name

# 导出依赖
uv pip freeze > requirements.txt

# 使用 pyproject.toml（推荐）
uv sync              # 安装所有依赖
uv add package-name  # 添加新依赖
uv remove package-name  # 移除依赖
```

## 方式二：使用 Conda 部署

Conda 是一个强大的包和环境管理系统，特别适合数据科学项目。

### 1. 安装 Conda

如果您还没有安装 Conda，请访问 [Miniconda](https://docs.conda.io/en/latest/miniconda.html) 或 [Anaconda](https://www.anaconda.com/) 下载安装。

### 2. 创建 Conda 环境

```bash
cd backend

# 创建 Python 3.10 环境
conda create -n datamind python=3.10 -y

# 激活环境
conda activate datamind
```

### 3. 安装系统依赖（可选）

某些 Python 包需要系统级别的依赖，可以使用 conda 安装：

```bash
# PostgreSQL 客户端库
conda install -c conda-forge postgresql -y

# 其他系统依赖
conda install -c conda-forge gcc g++ -y
```

### 4. 安装 Python 依赖

```bash
# 使用 pip 安装（推荐，因为 requirements.txt 更完整）
pip install -r requirements.txt

# 或者使用 conda（部分包可能不可用）
conda install -c conda-forge fastapi uvicorn sqlalchemy -y
pip install -r requirements.txt  # 安装 conda 中没有的包
```

### 5. 启动服务

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Conda 常用命令

```bash
# 列出所有环境
conda env list

# 激活环境
conda activate datamind

# 停用环境
conda deactivate

# 导出环境配置
conda env export > environment.yml

# 从配置文件创建环境
conda env create -f environment.yml

# 删除环境
conda env remove -n datamind

# 更新 conda
conda update conda
```

### 创建 environment.yml（可选）

如果您想使用 conda 管理环境，可以创建 `environment.yml` 文件：

```yaml
name: datamind
channels:
  - conda-forge
  - defaults
dependencies:
  - python=3.10
  - pip
  - pip:
    - -r requirements.txt
```

然后使用：
```bash
conda env create -f environment.yml
conda activate datamind
```

## 方式三：使用 Docker Compose 部署中间件

对于生产环境，建议使用 Docker Compose 部署所有中间件服务。

### 1. 安装 Docker 和 Docker Compose

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)（包含 Docker Compose）
- 或单独安装 [Docker Compose](https://docs.docker.com/compose/install/)

### 2. 启动中间件服务

```bash
# 在项目根目录
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 3. 验证服务

```bash
# 检查 PostgreSQL
docker-compose exec postgres psql -U datamind -d datamind -c "SELECT version();"

# 检查 Redis
docker-compose exec redis redis-cli ping

# 检查 Milvus
curl http://localhost:9091/healthz
```

### 4. 停止服务

```bash
# 停止所有服务
docker-compose down

# 停止并删除数据卷（注意：会删除所有数据）
docker-compose down -v
```

### Docker Compose 服务说明

| 服务 | 端口 | 说明 |
|------|------|------|
| PostgreSQL | 5432 | 主数据库 |
| Redis | 6379 | 缓存服务 |
| Milvus | 19530 | 向量数据库 |
| Attu | 3001 | Milvus 可视化工具 |
| MinIO | 9000, 9001 | 对象存储（Milvus 使用） |
| etcd | 2379 | 分布式键值存储（Milvus 使用） |

## 配置说明

### 1. 创建环境变量文件

在 `backend` 目录下创建 `.env` 文件：

```env
# 应用配置
APP_NAME=DataMind
APP_VERSION=1.0.0
DEBUG=True
LOG_LEVEL=INFO

# API配置
API_PREFIX=/api/v1
CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]

# 数据库配置（使用 Docker Compose 中的 PostgreSQL）
DATABASE_URL=postgresql://datamind:datamind123@localhost:5432/datamind

# 或者使用 SQLite（开发环境）
# DATABASE_URL=sqlite:///./datamind.db

# Redis 配置（使用 Docker Compose 中的 Redis）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# 安全配置
SECRET_KEY=your-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30

# 查询配置
QUERY_TIMEOUT=30
MAX_QUERY_ROWS=10000
ENABLE_QUERY_CACHE=True
CACHE_TTL=300

# 模型网关配置
MODEL_GATEWAY_ENABLED=True
MODEL_REQUEST_TIMEOUT=60
MODEL_MAX_RETRIES=3

# 向量库配置
CHROMADB_PERSIST_DIRECTORY=./chroma_db
MILVUS_HOST=localhost
MILVUS_PORT=19530

# 可观测性配置
ENABLE_TRACING=True
ENABLE_METRICS=True
```

### 2. 初始化数据库

```bash
cd backend

# 激活虚拟环境（根据您使用的方式）
# UV: source .venv/bin/activate 或 .venv\Scripts\Activate.ps1
# Conda: conda activate datamind

# 运行数据库迁移（如果使用 Alembic）
# alembic upgrade head

# 或者手动创建表（如果使用 SQLAlchemy）
python -c "from app.models.database import Base; from app.core.config import get_settings; from sqlalchemy import create_engine; engine = create_engine(get_settings().database_url); Base.metadata.create_all(engine)"
```

## 启动服务

### 后端服务

```bash
cd backend

# 激活虚拟环境
# UV 方式
source .venv/bin/activate  # Linux/macOS
# 或 .venv\Scripts\Activate.ps1  # Windows

# Conda 方式
conda activate datamind

# 启动服务
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

后端服务将在 `http://localhost:8000` 启动，API 文档在：
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### 前端服务

```bash
cd frontend

# 安装依赖
npm install
# 或
yarn install

# 启动开发服务器
npm run dev
# 或
yarn dev
```

前端应用将在 `http://localhost:5173` 启动（Vite 默认端口）。

## 完整部署流程示例

### 使用 UV + Docker Compose（推荐）

```bash
# 1. 启动中间件
docker-compose up -d

# 2. 设置后端环境
cd backend
uv venv
uv pip install -r requirements.txt
source .venv/bin/activate  # 或 Windows: .venv\Scripts\Activate.ps1

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库连接等

# 4. 初始化数据库
python -c "from app.models.database import Base; from app.core.config import get_settings; from sqlalchemy import create_engine; engine = create_engine(get_settings().database_url); Base.metadata.create_all(engine)"

# 5. 启动后端
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 6. 启动前端（新终端）
cd frontend
npm install
npm run dev
```

### 使用 Conda + Docker Compose

```bash
# 1. 启动中间件
docker-compose up -d

# 2. 设置后端环境
cd backend
conda create -n datamind python=3.10 -y
conda activate datamind
pip install -r requirements.txt

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 4. 初始化数据库
python -c "from app.models.database import Base; from app.core.config import get_settings; from sqlalchemy import create_engine; engine = create_engine(get_settings().database_url); Base.metadata.create_all(engine)"

# 5. 启动后端
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 6. 启动前端（新终端）
cd frontend
npm install
npm run dev
```

## 常见问题

### 1. UV 安装失败

**问题**: Windows PowerShell 执行策略限制

**解决**:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 2. Conda 环境激活失败

**问题**: conda 命令未找到

**解决**: 
- 确保已正确安装 Conda
- 重新打开终端
- 检查 PATH 环境变量

### 3. PostgreSQL 连接失败

**问题**: 无法连接到 PostgreSQL

**解决**:
- 确保 Docker Compose 服务已启动: `docker-compose ps`
- 检查 `.env` 文件中的 `DATABASE_URL` 配置
- 验证端口 5432 未被占用

### 4. Milvus 连接失败

**问题**: 无法连接到 Milvus

**解决**:
- 确保 Milvus 及其依赖（etcd, minio）都已启动
- 检查 Milvus 健康状态: `curl http://localhost:9091/healthz`
- 验证端口 19530 未被占用

### 5. 依赖安装失败

**问题**: 某些包安装失败（如 psycopg2-binary）

**解决**:
- **Windows**: 可能需要安装 Visual C++ 构建工具
- **Linux**: 安装系统依赖: `sudo apt-get install python3-dev libpq-dev`
- **macOS**: 安装 Xcode Command Line Tools: `xcode-select --install`

### 6. 端口冲突

**问题**: 端口已被占用

**解决**:
- 修改 `docker-compose.yml` 中的端口映射
- 或修改后端启动命令中的端口: `--port 8001`
- 或修改前端 `vite.config.ts` 中的端口配置

## 下一步

- 查看 [开发文档](DEVELOPMENT.md) 了解项目架构
- 查看 [API 文档](http://localhost:8000/docs) 了解 API 接口
- 查看 [架构文档](ARCHITECTURE.md) 了解系统设计

## 获取帮助

如果遇到问题，请：
1. 查看本文档的常见问题部分
2. 检查项目的 Issue 列表
3. 提交新的 Issue 描述您的问题
