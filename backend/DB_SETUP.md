# 数据库设置指南

## 快速开始

### 1. 初始化数据库表结构

```bash
# Windows
db.bat init

# Linux/macOS
chmod +x db.sh
./db.sh init
```

### 2. 执行迁移（如果需要）

如果数据库表已存在但缺少某些列，执行迁移：

```bash
# Windows
db.bat migrate

# Linux/macOS
./db.sh migrate
```

### 3. 初始化示例数据（可选）

```bash
# Windows
db.bat data

# Linux/macOS
./db.sh data
```

## 完整命令列表

| 命令 | 说明 | 使用场景 |
|------|------|----------|
| `init` | 初始化数据库表结构 | 首次部署、全新安装 |
| `migrate` | 执行迁移脚本 | 升级现有数据库 |
| `data` | 初始化示例数据 | 开发/演示环境 |
| `status` | 显示数据库状态 | 查看表和数据统计 |
| `reset` | 重置数据库（危险） | 清空所有数据并重建 |

## 详细说明

### 初始化表结构 (`init`)

创建所有必需的数据表：
- `data_sources` - 数据源配置
- `model_configs` - 模型配置
- `model_route_strategies` - 模型路由策略
- `query_templates` - 查询模板
- `template_versions` - 模板版本历史
- `query_logs` - 查询日志
- `model_call_logs` - 模型调用日志
- `quota_usage` - 配额使用

### 执行迁移 (`migrate`)

为已存在的表添加缺失的列，主要用于：
- 修复 `query_templates` 表缺少的列
- 升级数据库结构

### 初始化数据 (`data`)

插入示例模板数据，包括：
- 销售数据统计模板
- 用户活跃度分析模板
- 产品分类销售占比模板

### 查看状态 (`status`)

显示数据库基本信息：
- 数据库名称
- 表列表
- 每个表的行数

### 重置数据库 (`reset`)

⚠️ **危险操作**：删除所有表和数据，然后重新创建表结构。

```bash
# 需要确认
db.bat reset

# 强制执行（跳过确认）
db.bat reset --force
```

## 手动执行 SQL

如果不想使用管理工具，也可以直接执行 SQL 文件：

```bash
# 使用 psql
psql -U datamind -d datamind -h localhost -p 5432 -f sql/init_schema.sql
psql -U datamind -d datamind -h localhost -p 5432 -f sql/migrate_add_template_columns.sql
psql -U datamind -d datamind -h localhost -p 5432 -f sql/init_data.sql

# 使用 Docker Compose
docker-compose exec postgres psql -U datamind -d datamind -f /path/to/sql/init_schema.sql
```

## 配置要求

确保 `backend/.env` 文件或环境变量中配置了正确的数据库连接：

```env
DATABASE_URL=postgresql://datamind:datamind123@localhost:5432/datamind
```

## 故障排除

### 连接失败

1. 检查 PostgreSQL 服务是否运行
2. 验证 `DATABASE_URL` 配置是否正确
3. 确认数据库用户权限

### 表已存在错误

如果表已存在，可以：
- 使用 `migrate` 命令添加缺失的列
- 使用 `reset` 命令重置数据库（会删除所有数据）

### 权限错误

确保数据库用户有足够的权限：
- CREATE TABLE
- CREATE INDEX
- ALTER TABLE
- DROP TABLE

## 文件结构

```
backend/
├── db_manager.py          # Python 管理工具
├── db.bat                 # Windows 快捷命令
├── db.sh                  # Linux/macOS 快捷命令
├── sql/
│   ├── init_schema.sql           # 表结构初始化
│   ├── migrate_add_template_columns.sql  # 迁移脚本
│   ├── init_data.sql             # 示例数据
│   └── README.md                 # SQL 脚本说明
└── DB_SETUP.md            # 本文档
```

