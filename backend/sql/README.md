# 数据库 SQL 脚本说明

## 文件结构

```
sql/
├── init_schema.sql                    # 数据库表结构初始化（必需）
├── migrate_add_template_columns.sql   # 迁移脚本（修复表结构）
├── init_data.sql                      # 示例数据初始化（可选）
├── init_test_database.sql             # 测试数据库初始化（开发/测试）
├── init_test_datasource.sql           # 测试数据源配置初始化
├── create_test_database.sh            # 创建测试数据库脚本（Linux/macOS）
├── create_test_database.bat           # 创建测试数据库脚本（Windows）
├── README.md                          # 本文档
└── TEST_DATABASE.md                   # 测试数据库说明
```

## 文件说明

### 1. `init_schema.sql` - 数据库表结构初始化

**用途**：创建所有必需的数据表

**包含的表**：
- `data_sources` - 数据源配置表
- `model_configs` - 模型配置表
- `model_route_strategies` - 模型路由策略表
- `query_templates` - 查询模板表
- `template_versions` - 模板版本历史表
- `query_logs` - 查询日志表
- `model_call_logs` - 模型调用日志表
- `quota_usage` - 配额使用表

**使用场景**：
- 首次部署
- 全新安装
- 重置数据库

**执行方式**：
```bash
# 使用管理工具（推荐）
db.bat init          # Windows
./db.sh init         # Linux/macOS

# 直接使用 psql
psql -U datamind -d datamind -f sql/init_schema.sql

# 使用 Docker Compose
docker-compose exec postgres psql -U datamind -d datamind -f /path/to/sql/init_schema.sql
```

### 2. `migrate_add_template_columns.sql` - 迁移脚本

**用途**：为已存在的 `query_templates` 表添加缺失的列

**添加的列**：
- `default_chart_type` - 默认图表类型
- `nl_examples` - 自然语言示例
- `parameters` - 参数定义
- `default_model_scenario` - 默认模型场景
- `permission_scope` - 权限范围
- `status` - 状态
- `version` - 版本号
- `created_by` - 创建人

**使用场景**：
- 升级现有数据库
- 修复表结构
- 从旧版本迁移

**执行方式**：
```bash
# 使用管理工具（推荐）
db.bat migrate        # Windows
./db.sh migrate       # Linux/macOS

# 直接使用 psql
psql -U datamind -d datamind -f sql/migrate_add_template_columns.sql
```

### 3. `init_data.sql` - 初始化示例数据

**用途**：插入示例模板数据（可选）

**包含的模板**：
1. 销售数据统计
2. 用户活跃度分析
3. 产品分类销售占比
4. 地区销售排行
5. 月度趋势对比
6. 客户价值分析
7. 库存预警
8. 渠道效果分析

**使用场景**：
- 开发环境
- 演示环境
- 测试环境

**执行方式**：
```bash
# 使用管理工具（推荐）
db.bat data          # Windows
./db.sh data         # Linux/macOS

# 直接使用 psql
psql -U datamind -d datamind -f sql/init_data.sql
```

**注意**：
- 使用 `WHERE NOT EXISTS` 避免重复插入
- 可以安全地多次执行
- 生产环境请谨慎使用

## 执行顺序

### 首次部署
```bash
# 1. 初始化表结构
db.bat init

# 2. （可选）初始化示例数据
db.bat data
```

### 升级现有数据库
```bash
# 1. 执行迁移脚本
db.bat migrate

# 2. （可选）添加示例数据
db.bat data
```

## 验证

执行完成后，可以使用以下命令验证：

```bash
# 查看数据库状态
db.bat status        # Windows
./db.sh status       # Linux/macOS

# 或直接查询
psql -U datamind -d datamind -c "\dt"                    # 列出所有表
psql -U datamind -d datamind -c "SELECT COUNT(*) FROM query_templates;"  # 查看模板数量
```

## 注意事项

1. **备份数据**：在生产环境执行任何 SQL 脚本前，请先备份数据库
2. **权限检查**：确保数据库用户有足够的权限（CREATE TABLE, ALTER TABLE, INSERT 等）
3. **连接配置**：确保 `DATABASE_URL` 环境变量或配置文件中的数据库连接信息正确
4. **执行顺序**：先执行 `init_schema.sql`，再根据需要执行其他脚本

### 4. `init_test_database.sql` - 测试数据库初始化

**用途**：创建测试数据库，包含示例表和数据

**包含的表**：
- `orders` - 订单表（500条记录）
- `products` - 产品表（12个产品）
- `customers` - 客户表（8个客户）
- `user_logins` - 用户登录表（2000条记录）
- `channel_visits` - 渠道访问表（1000条记录）

**使用场景**：
- 开发环境
- 测试环境
- 演示环境

**执行方式**：
```bash
# 使用管理工具（推荐）
db.bat test-db        # Windows
./db.sh test-db       # Linux/macOS

# 手动创建
psql -U postgres -c "CREATE DATABASE datamind_test;"
psql -U datamind -d datamind_test -f sql/init_test_database.sql
```

**详细说明**：参见 [TEST_DATABASE.md](TEST_DATABASE.md)

### 5. `init_test_datasource.sql` - 测试数据源配置初始化

**用途**：在主数据库中创建测试数据源的配置，并关联所有模板

**功能**：
- 在 `data_sources` 表中插入测试数据库配置
- 将所有模板的 `data_source_id` 更新为测试数据源ID

**使用场景**：
- 开发环境
- 测试环境
- 演示环境

**执行方式**：
```bash
# 使用管理工具（推荐）
db.bat test-datasource        # Windows
./db.sh test-datasource       # Linux/macOS

# 直接使用 psql
psql -U datamind -d datamind -f sql/init_test_datasource.sql
```

**前置条件**：
- 测试数据库 `datamind_test` 必须已创建（执行 `db.bat test-db`）
- 主数据库表结构已初始化（执行 `db.bat init`）
- 模板数据已初始化（执行 `db.bat data`）

**完整流程**：
```bash
# 1. 初始化主数据库
db.bat init

# 2. 初始化模板数据
db.bat data

# 3. 创建测试数据库
db.bat test-db

# 4. 配置测试数据源
db.bat test-datasource
```

## 故障排除

### 表已存在错误
如果表已存在，可以：
- 使用 `migrate` 命令添加缺失的列
- 使用 `reset` 命令重置数据库（会删除所有数据）

### 权限错误
确保数据库用户有足够的权限：
```sql
GRANT ALL PRIVILEGES ON DATABASE datamind TO datamind;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO datamind;
```

### 连接失败
1. 检查 PostgreSQL 服务是否运行
2. 验证 `DATABASE_URL` 配置是否正确
3. 确认数据库用户权限
