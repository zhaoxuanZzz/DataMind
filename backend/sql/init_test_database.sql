-- ============================================
-- DataMind 测试数据库初始化脚本 (PostgreSQL)
-- ============================================
-- 此脚本创建一个测试数据库，包含示例表和数据
-- 用于测试系统模板功能
-- ============================================
-- 执行方式:
--   1. 创建数据库: CREATE DATABASE datamind_test;
--   2. 执行脚本: psql -U datamind -d datamind_test -f sql/init_test_database.sql
-- ============================================

-- ============================================
-- 1. 订单表 (orders) - 用于销售相关模板
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_no VARCHAR(50) NOT NULL UNIQUE,
    customer_id INTEGER NOT NULL,
    product_id INTEGER,
    category_name VARCHAR(100),
    amount DECIMAL(10, 2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    order_date DATE NOT NULL,
    region VARCHAR(50),
    channel VARCHAR(50),
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_region ON orders(region);
CREATE INDEX IF NOT EXISTS idx_orders_category_name ON orders(category_name);

-- ============================================
-- 2. 产品表 (products) - 用于产品相关模板
-- ============================================
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    category_name VARCHAR(100),
    price DECIMAL(10, 2) NOT NULL,
    current_stock INTEGER NOT NULL DEFAULT 0,
    min_stock INTEGER NOT NULL DEFAULT 100,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_category_name ON products(category_name);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

-- ============================================
-- 3. 客户表 (customers) - 用于客户价值分析
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    region VARCHAR(50),
    customer_level VARCHAR(50) DEFAULT '普通客户',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_region ON customers(region);
CREATE INDEX IF NOT EXISTS idx_customers_level ON customers(customer_level);

-- ============================================
-- 4. 用户登录表 (user_logins) - 用于用户活跃度分析
-- ============================================
CREATE TABLE IF NOT EXISTS user_logins (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    login_time TIMESTAMP NOT NULL,
    ip_address VARCHAR(50),
    device VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_logins_user_id ON user_logins(user_id);
CREATE INDEX IF NOT EXISTS idx_user_logins_login_time ON user_logins(login_time);
CREATE INDEX IF NOT EXISTS idx_user_logins_created_at ON user_logins(created_at);

-- ============================================
-- 5. 渠道访问表 (channel_visits) - 用于渠道效果分析
-- ============================================
CREATE TABLE IF NOT EXISTS channel_visits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    channel VARCHAR(50) NOT NULL,
    visit_date DATE NOT NULL,
    converted BOOLEAN DEFAULT FALSE,
    conversion_value DECIMAL(10, 2),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_channel_visits_channel ON channel_visits(channel);
CREATE INDEX IF NOT EXISTS idx_channel_visits_visit_date ON channel_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_channel_visits_converted ON channel_visits(converted);

-- ============================================
-- 插入测试数据
-- ============================================

-- 插入产品数据
INSERT INTO products (product_name, category, category_name, price, current_stock, min_stock) VALUES
('iPhone 15 Pro', '电子产品', '手机', 8999.00, 150, 50),
('MacBook Pro', '电子产品', '电脑', 12999.00, 80, 30),
('iPad Air', '电子产品', '平板', 4599.00, 200, 100),
('AirPods Pro', '电子产品', '耳机', 1899.00, 300, 150),
('Nike运动鞋', '服装鞋帽', '运动鞋', 599.00, 500, 200),
('Adidas T恤', '服装鞋帽', '服装', 299.00, 800, 300),
('咖啡机', '家用电器', '厨房电器', 1999.00, 120, 50),
('空气净化器', '家用电器', '生活电器', 2999.00, 90, 40),
('办公桌', '家具', '办公家具', 1299.00, 200, 100),
('办公椅', '家具', '办公家具', 899.00, 150, 80),
('低库存商品A', '测试', '测试分类', 99.00, 50, 100),
('低库存商品B', '测试', '测试分类', 199.00, 30, 100)
ON CONFLICT DO NOTHING;

-- 插入客户数据
INSERT INTO customers (customer_name, email, phone, region, customer_level) VALUES
('张三', 'zhangsan@example.com', '13800138001', '北京', '高价值客户'),
('李四', 'lisi@example.com', '13800138002', '上海', '中价值客户'),
('王五', 'wangwu@example.com', '13800138003', '广州', '普通客户'),
('赵六', 'zhaoliu@example.com', '13800138004', '深圳', '高价值客户'),
('钱七', 'qianqi@example.com', '13800138005', '杭州', '中价值客户'),
('孙八', 'sunba@example.com', '13800138006', '成都', '普通客户'),
('周九', 'zhoujiu@example.com', '13800138007', '武汉', '高价值客户'),
('吴十', 'wushi@example.com', '13800138008', '西安', '中价值客户')
ON CONFLICT DO NOTHING;

-- 插入订单数据（生成过去6个月的数据）
DO $$
DECLARE
    i INTEGER;
    order_date DATE;
    customer_id_val INTEGER;
    product_id_val INTEGER;
    category_name_val VARCHAR(100);
    amount_val DECIMAL(10, 2);
    region_val VARCHAR(50);
    channel_val VARCHAR(50);
BEGIN
    -- 生成过去6个月的订单数据
    FOR i IN 1..500 LOOP
        order_date := CURRENT_DATE - (RANDOM() * 180)::INTEGER;
        customer_id_val := 1 + (RANDOM() * 7)::INTEGER;
        product_id_val := 1 + (RANDOM() * 11)::INTEGER;
        
        -- 根据产品ID获取分类
        SELECT category_name INTO category_name_val FROM products WHERE id = product_id_val;
        
        amount_val := (100 + RANDOM() * 9000)::DECIMAL(10, 2);
        region_val := (ARRAY['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安'])[1 + (RANDOM() * 7)::INTEGER];
        channel_val := (ARRAY['线上', '线下', 'APP', '小程序', '第三方平台'])[1 + (RANDOM() * 4)::INTEGER];
        
        INSERT INTO orders (
            order_no, customer_id, product_id, category_name, 
            amount, quantity, order_date, region, channel
        ) VALUES (
            'ORD' || LPAD(i::TEXT, 6, '0'),
            customer_id_val,
            product_id_val,
            category_name_val,
            amount_val,
            1 + (RANDOM() * 5)::INTEGER,
            order_date,
            region_val,
            channel_val
        ) ON CONFLICT (order_no) DO NOTHING;
    END LOOP;
END $$;

-- 插入用户登录数据（生成过去3个月的数据）
DO $$
DECLARE
    i INTEGER;
    login_time TIMESTAMP;
    user_id_val INTEGER;
BEGIN
    FOR i IN 1..2000 LOOP
        login_time := CURRENT_TIMESTAMP - (RANDOM() * 90 * 24 * 3600)::INTEGER * INTERVAL '1 second';
        user_id_val := 1 + (RANDOM() * 100)::INTEGER;
        
        INSERT INTO user_logins (user_id, login_time, ip_address, device) VALUES (
            user_id_val,
            login_time,
            '192.168.' || (RANDOM() * 255)::INTEGER || '.' || (RANDOM() * 255)::INTEGER,
            (ARRAY['PC', 'Mobile', 'Tablet'])[1 + (RANDOM() * 2)::INTEGER]
        );
    END LOOP;
END $$;

-- 插入渠道访问数据（生成过去2个月的数据）
DO $$
DECLARE
    i INTEGER;
    visit_date DATE;
    channel_val VARCHAR(50);
    converted_val BOOLEAN;
BEGIN
    FOR i IN 1..1000 LOOP
        visit_date := CURRENT_DATE - (RANDOM() * 60)::INTEGER;
        channel_val := (ARRAY['搜索引擎', '社交媒体', '直接访问', '推荐链接', '广告'])[1 + (RANDOM() * 4)::INTEGER];
        converted_val := RANDOM() > 0.7; -- 30% 转化率
        
        INSERT INTO channel_visits (user_id, channel, visit_date, converted, conversion_value) VALUES (
            1 + (RANDOM() * 100)::INTEGER,
            channel_val,
            visit_date,
            converted_val,
            CASE WHEN converted_val THEN (RANDOM() * 1000)::DECIMAL(10, 2) ELSE NULL END
        );
    END LOOP;
END $$;

-- ============================================
-- 创建视图（可选，方便查询）
-- ============================================

-- 销售统计视图
CREATE OR REPLACE VIEW v_sales_summary AS
SELECT 
    DATE_TRUNC('month', order_date) AS month,
    COUNT(*) AS order_count,
    SUM(amount) AS total_amount,
    AVG(amount) AS avg_amount,
    COUNT(DISTINCT customer_id) AS customer_count
FROM orders
GROUP BY DATE_TRUNC('month', order_date);

-- 产品分类统计视图
CREATE OR REPLACE VIEW v_category_sales AS
SELECT 
    category_name,
    COUNT(*) AS order_count,
    SUM(amount) AS total_amount,
    AVG(amount) AS avg_amount
FROM orders
GROUP BY category_name;

-- ============================================
-- 完成
-- ============================================
SELECT 
    '测试数据库初始化完成！' AS message,
    (SELECT COUNT(*) FROM orders) AS orders_count,
    (SELECT COUNT(*) FROM products) AS products_count,
    (SELECT COUNT(*) FROM customers) AS customers_count,
    (SELECT COUNT(*) FROM user_logins) AS logins_count,
    (SELECT COUNT(*) FROM channel_visits) AS visits_count;



