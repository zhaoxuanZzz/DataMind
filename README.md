# DataMind（数据灵析）

智能数据分析与可视化工具，支持自然语言查询、多数据源接入、自动图表推荐。

## 项目结构

```
DataMind/
├── backend/              # 后端服务（Python + LangChain + LangGraph）
│   ├── app/             # 应用主目录
│   │   ├── api/         # API 路由
│   │   ├── core/        # 核心配置和日志
│   │   ├── models/      # 数据模型（Pydantic + SQLAlchemy）
│   │   ├── services/    # 业务服务（编排引擎、模型网关）
│   │   ├── connectors/  # 数据连接器（MySQL、PostgreSQL、ChromaDB、Milvus）
│   │   └── utils/       # 工具函数（加密、缓存）
│   ├── requirements.txt # Python 依赖
│   ├── .env.example     # 环境变量配置示例
│   └── start.sh/start.bat  # 启动脚本
├── frontend/            # 前端应用（TypeScript + React）
│   ├── src/
│   │   ├── components/  # 组件
│   │   ├── pages/       # 页面
│   │   ├── services/    # API 服务
│   │   ├── types/       # TypeScript 类型定义
│   │   └── utils/       # 工具函数
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml   # Docker Compose 配置（中间件服务）
├── pyproject.toml       # UV 项目配置
├── QUICKSTART.md        # 快速开始文档
├── DEVELOPMENT.md       # 开发文档
├── ARCHITECTURE.md      # 架构文档
├── DESIGN.md            # 设计文档
└── README.md            # 项目说明
```

## 技术栈

### 后端
- Python 3.10+
- FastAPI - Web框架
- LangChain + LangGraph - AI编排引擎
- SQLAlchemy - ORM
- pymysql / psycopg2 - 关系型数据库驱动
- chromadb / pymilvus - 向量库驱动
- loguru - 日志
- cryptography - 加密

### 前端
- TypeScript
- React 18
- Ant Design - UI组件库
- ECharts - 图表库
- Vite - 构建工具
- Axios - HTTP客户端

## 快速开始

> 📖 **详细部署指南**: 请查看 [快速开始文档](QUICKSTART.md)，包含 UV 和 Conda 两种部署方式。

### 环境要求
- Python 3.10+
- Node.js 18+
- npm 或 yarn
- Docker 和 Docker Compose（用于部署中间件，可选）

### 部署方式

#### 方式一：使用 UV（推荐）
```bash
# 安装 UV
# Windows: irm https://astral.sh/uv/install.ps1 | iex
# Linux/macOS: curl -LsSf https://astral.sh/uv/install.sh | sh

cd backend
uv venv
uv pip install -r requirements.txt
source .venv/bin/activate  # Windows: .venv\Scripts\Activate.ps1
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 方式二：使用 Conda
```bash
cd backend
conda create -n datamind python=3.10 -y
conda activate datamind
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 方式三：使用传统 venv
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 启动中间件（生产环境）

使用 Docker Compose 启动 PostgreSQL、Redis、Milvus 等中间件：

```bash
# 在项目根目录
docker-compose up -d

# 查看服务状态
docker-compose ps
```

### 前端启动

```bash
cd frontend
npm install
npm run dev
```

前端应用将在 `http://localhost:5173` 启动（Vite 默认端口）

### API 文档

后端服务启动后，访问：
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 核心功能

### ✅ 已实现
- [x] 数据源管理（MySQL、PostgreSQL、ChromaDB、Milvus）
- [x] 数据连接器抽象层
- [x] 模型网关框架（支持阿里云、豆包、Kimi、OpenAI）
- [x] LangGraph编排引擎框架
- [x] 查询API和日志记录
- [x] 前端基础页面（工作台、查询、数据源管理、日志）
- [x] 加密存储连接信息
- [x] 缓存机制

### 🚧 开发中
- [ ] 完整的意图解析（LLM集成）
- [ ] SQL自动生成（基于schema）
- [ ] 向量检索完整实现
- [ ] 可视化推荐算法优化
- [ ] 模型路由策略完整实现
- [ ] 配额管理和限流
- [ ] 查询模板管理
- [ ] 权限和认证

## 配置说明

### 后端配置
复制 `backend/.env.example` 为 `backend/.env` 并修改配置：

```env
# 数据库配置
DATABASE_URL=sqlite:///./datamind.db

# 安全配置
SECRET_KEY=your-secret-key-change-in-production

# 查询配置
QUERY_TIMEOUT=30
MAX_QUERY_ROWS=10000
```

### 前端配置
前端通过代理访问后端API，配置在 `frontend/vite.config.ts` 中。

## API文档

启动后端服务后，访问：
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 开发规范

### 代码结构
- 模块化设计，职责清晰
- 接口统一，易于扩展
- 完善的错误处理和日志记录
- 遵循 RESTful API 设计规范

### 代码风格
- Python: 遵循 PEP 8
- TypeScript: 使用 ESLint 规则
- 注释清晰，文档完善

## 架构特点

1. **可扩展性**
   - 数据连接器采用工厂模式，易于添加新数据源
   - 模型网关支持多模型提供商
   - 前端组件模块化，易于扩展

2. **可复用性**
   - 统一的连接器接口
   - 通用的模型调用封装
   - 可复用的前端组件和服务

3. **可维护性**
   - 清晰的分层架构
   - 完善的日志和错误处理
   - 统一的配置管理

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
