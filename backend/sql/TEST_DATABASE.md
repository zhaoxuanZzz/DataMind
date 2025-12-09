# 测试数据库说明

## 概述

测试数据库 `datamind_test` 包含示例表和数据，用于测试系统模板功能。所有表和数据都经过精心设计，能够完美适配系统中的查询模板。

## 快速开始

### 使用管理工具创建（推荐）

```bash
# Windows
db.bat test-db

# Linux/macOS
./db.sh test-db
```

### 手动创建

```bash
# 1. 创建数据库
psql -U postgres -c "CREATE DATABASE datamind_test;"

# 2. 执行初始化脚本
psql -U datamind -d datamind_test -f sql/init_test_database.sql
```

## 数据库结构

### 1. orders（订单表）
用于以下模板：
- 销售数据统计
- 地区销售排行
- 月度趋势对比
- 客户价值分析

**主要字段**：
- `id` - 订单ID
- `order_no` - 订单号
- `customer_id` - 客户ID
- `product_id` - 产品ID
- `category_name` - 产品分类
- `amount` - 订单金额
- `order_date` - 订单日期
- `region` - 地区
- `channel` - 渠道

**数据量**：约 500 条订单记录（过去6个月）

### 2. products（产品表）
用于以下模板：
- 产品分类销售占比
- 库存预警

**主要字段**：
- `id` - 产品ID
- `product_name` - 产品名称
- `category` - 产品分类
- `category_name` - 分类名称
- `price` - 价格
- `current_stock` - 当前库存
- `min_stock` - 最低库存

**数据量**：12 个产品（包含低库存商品用于测试）

### 3. customers（客户表）
用于以下模板：
- 客户价值分析

**主要字段**：
- `id` - 客户ID
- `customer_name` - 客户名称
- `email` - 邮箱
- `phone` - 电话
- `region` - 地区
- `customer_level` - 客户等级

**数据量**：8 个客户

### 4. user_logins（用户登录表）
用于以下模板：
- 用户活跃度分析

**主要字段**：
- `id` - 登录记录ID
- `user_id` - 用户ID
- `login_time` - 登录时间
- `ip_address` - IP地址
- `device` - 设备类型

**数据量**：约 2000 条登录记录（过去3个月）

### 5. channel_visits（渠道访问表）
用于以下模板：
- 渠道效果分析

**主要字段**：
- `id` - 访问记录ID
- `user_id` - 用户ID
- `channel` - 渠道名称
- `visit_date` - 访问日期
- `converted` - 是否转化
- `conversion_value` - 转化价值

**数据量**：约 1000 条访问记录（过去2个月）

## 视图

### v_sales_summary（销售统计视图）
按月汇总销售数据，包括：
- 订单数
- 总销售额
- 平均订单金额
- 客户数

### v_category_sales（产品分类统计视图）
按产品分类汇总销售数据。

## 在系统中使用

### 方法一：使用管理工具（推荐）

```bash
# 1. 创建测试数据库
db.bat test-db

# 2. 初始化测试数据源配置（自动创建数据源并关联模板）
db.bat test-datasource
```

执行后，系统会自动：
- 在主数据库中创建测试数据源配置
- 将所有模板关联到测试数据源

### 方法二：手动创建数据源

如果不想使用管理工具，可以在 DataMind 系统中手动创建一个新的数据源：

```json
{
  "name": "测试数据库",
  "type": "postgresql",
  "connection_info": {
    "host": "localhost",
    "port": 5432,
    "user": "datamind",
    "password": "datamind123",
    "database": "datamind_test"
  }
}
```

然后手动将模板的 `data_source_id` 设置为测试数据源的ID。

### 3. 测试模板

使用以下模板测试：

1. **销售数据统计** - 查询订单数据
2. **用户活跃度分析** - 查询用户登录数据
3. **产品分类销售占比** - 查询产品分类数据
4. **地区销售排行** - 查询地区销售数据
5. **月度趋势对比** - 对比不同月份的销售
6. **客户价值分析** - 分析客户价值分布
7. **库存预警** - 查询低库存商品
8. **渠道效果分析** - 分析渠道转化效果

## 数据说明

### 时间范围
- **订单数据**：过去6个月
- **登录数据**：过去3个月
- **渠道访问**：过去2个月

### 数据特点
- 数据随机生成，但符合业务逻辑
- 包含各种场景：高价值客户、低库存商品、不同渠道等
- 数据量适中，便于测试和演示

## 维护

### 重新生成数据

如果需要重新生成测试数据：

```bash
# 删除并重新创建
db.bat test-db
# 或
./db.sh test-db
```

### 查看数据统计

```sql
-- 连接到测试数据库
psql -U datamind -d datamind_test

-- 查看各表数据量
SELECT 'orders' AS table_name, COUNT(*) AS count FROM orders
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'user_logins', COUNT(*) FROM user_logins
UNION ALL
SELECT 'channel_visits', COUNT(*) FROM channel_visits;
```

## 注意事项

1. **测试环境专用**：此数据库仅用于开发和测试，不要在生产环境使用
2. **数据会变化**：每次执行脚本都会重新生成随机数据
3. **权限要求**：创建数据库需要 `CREATEDB` 权限
4. **连接配置**：确保数据库连接信息正确

## 故障排除

### 数据库已存在
如果数据库已存在，工具会提示是否重新创建。选择 `y` 会删除旧数据库并重新创建。

### 权限不足
如果遇到权限错误，确保数据库用户有足够的权限：
```sql
-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE datamind_test TO datamind;
```

### 连接失败
检查：
1. PostgreSQL 服务是否运行
2. 连接信息是否正确
3. 防火墙设置

