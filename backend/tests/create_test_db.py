"""
创建测试数据库 - 电商平台模拟数据
包含：用户、商品、订单、订单明细、产品分类等表
覆盖场景：简单查询、聚合统计、趋势分析、排名、占比分析、对比分析
"""
import random
import sqlite3
import sys
from datetime import datetime, timedelta
from pathlib import Path

DB_PATH = Path(__file__).parent / "test_ecommerce.db"

CATEGORIES = [
    ("电子产品", "手机、电脑、平板等电子设备"),
    ("服装鞋帽", "男装、女装、鞋子、帽子"),
    ("食品饮料", "零食、饮品、生鲜食品"),
    ("家居家装", "家具、装饰、收纳用品"),
    ("美妆护肤", "化妆品、护肤品、香水"),
    ("图书文具", "书籍、笔记本、文具"),
    ("运动户外", "运动器材、户外装备"),
    ("母婴用品", "奶粉、纸尿裤、玩具"),
]

PRODUCTS = [
    ("iPhone 15 Pro", "电子产品", 7999, 120),
    ("MacBook Air M3", "电子产品", 8999, 65),
    ("iPad Air", "电子产品", 4799, 90),
    ("AirPods Pro", "电子产品", 1899, 200),
    ("华为 Mate 60", "电子产品", 5999, 150),
    ("小米14", "电子产品", 3999, 180),
    ("男士休闲夹克", "服装鞋帽", 299, 500),
    ("女士连衣裙", "服装鞋帽", 199, 600),
    ("运动跑鞋", "服装鞋帽", 499, 400),
    ("羽绒服", "服装鞋帽", 899, 300),
    ("坚果礼盒", "食品饮料", 89, 1000),
    ("进口咖啡豆", "食品饮料", 128, 800),
    ("有机牛奶", "食品饮料", 69, 1500),
    ("精酿啤酒", "食品饮料", 59, 700),
    ("北欧沙发", "家居家装", 3999, 50),
    ("智能台灯", "家居家装", 199, 300),
    ("收纳盒套装", "家居家装", 49, 800),
    ("兰蔻精华液", "美妆护肤", 799, 250),
    ("雅诗兰黛面霜", "美妆护肤", 599, 200),
    ("口红套装", "美妆护肤", 299, 350),
    ("Python编程", "图书文具", 79, 500),
    ("钢笔礼盒", "图书文具", 199, 200),
    ("瑜伽垫", "运动户外", 129, 400),
    ("登山背包", "运动户外", 349, 150),
    ("婴儿奶粉", "母婴用品", 299, 600),
    ("儿童益智玩具", "母婴用品", 149, 400),
]

CITIES = ["北京", "上海", "广州", "深圳", "杭州", "成都", "武汉", "南京", "重庆", "西安"]

FIRST_NAMES = ["张", "李", "王", "刘", "陈", "杨", "赵", "黄", "周", "吴", "徐", "孙"]
LAST_PARTS = ["伟", "芳", "娜", "敏", "强", "磊", "洋", "艳", "勇", "军", "杰", "静",
              "秀英", "明", "超", "丽", "华", "平", "刚", "桂英"]

ORDER_STATUS = ["completed", "completed", "completed", "completed", "pending", "cancelled"]
PAYMENT_METHODS = ["支付宝", "微信支付", "银行卡", "信用卡"]


def create_database():
    if DB_PATH.exists():
        DB_PATH.unlink()

    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    cursor.executescript("""
        CREATE TABLE categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT
        );

        CREATE TABLE products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            price REAL NOT NULL,
            stock INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        );

        CREATE TABLE customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT,
            city TEXT,
            gender TEXT,
            age INTEGER,
            vip_level INTEGER DEFAULT 0,
            registered_at TEXT NOT NULL
        );

        CREATE TABLE orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            order_date TEXT NOT NULL,
            total_amount REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            payment_method TEXT,
            FOREIGN KEY (customer_id) REFERENCES customers(id)
        );

        CREATE TABLE order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            unit_price REAL NOT NULL,
            subtotal REAL NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        );

        CREATE TABLE daily_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL UNIQUE,
            order_count INTEGER NOT NULL DEFAULT 0,
            revenue REAL NOT NULL DEFAULT 0,
            new_customers INTEGER NOT NULL DEFAULT 0,
            active_users INTEGER NOT NULL DEFAULT 0
        );
    """)

    random.seed(42)

    for name, desc in CATEGORIES:
        cursor.execute("INSERT INTO categories (name, description) VALUES (?, ?)", (name, desc))

    base_date = datetime(2025, 6, 1)
    for name, category, price, stock in PRODUCTS:
        days_ago = random.randint(30, 180)
        created = (base_date - timedelta(days=days_ago)).strftime("%Y-%m-%d")
        cursor.execute(
            "INSERT INTO products (name, category, price, stock, created_at) VALUES (?,?,?,?,?)",
            (name, category, price, stock, created),
        )

    customers = []
    for i in range(200):
        fname = random.choice(FIRST_NAMES)
        lname = random.choice(LAST_PARTS)
        full_name = fname + lname
        email = f"user{i+1}@example.com"
        city = random.choice(CITIES)
        gender = random.choice(["男", "女"])
        age = random.randint(18, 60)
        vip = random.choices([0, 1, 2, 3], weights=[50, 30, 15, 5])[0]
        days_ago = random.randint(1, 365)
        reg_date = (base_date - timedelta(days=days_ago)).strftime("%Y-%m-%d")
        cursor.execute(
            "INSERT INTO customers (name, email, city, gender, age, vip_level, registered_at) "
            "VALUES (?,?,?,?,?,?,?)",
            (full_name, email, city, gender, age, vip, reg_date),
        )
        customers.append(i + 1)

    product_rows = cursor.execute("SELECT id, price FROM products").fetchall()
    products_db = {row[0]: row[1] for row in product_rows}

    start_date = datetime(2025, 10, 1)
    end_date = datetime(2026, 2, 28)
    delta = (end_date - start_date).days

    order_id = 0
    daily_agg: dict[str, dict] = {}

    for day_offset in range(delta + 1):
        current_date = start_date + timedelta(days=day_offset)
        date_str = current_date.strftime("%Y-%m-%d")
        weekday = current_date.weekday()

        base_orders = random.randint(8, 25)
        if weekday >= 5:
            base_orders = int(base_orders * 1.4)
        if current_date.month == 11 and 10 <= current_date.day <= 12:
            base_orders = int(base_orders * 3)
        if current_date.month == 12 and 10 <= current_date.day <= 13:
            base_orders = int(base_orders * 2.5)
        if current_date.month == 1 and current_date.day <= 3:
            base_orders = int(base_orders * 2)

        day_revenue = 0.0
        new_cust = random.randint(0, 5)
        active = random.randint(base_orders, base_orders + 30)

        for _ in range(base_orders):
            cid = random.choice(customers)
            status = random.choice(ORDER_STATUS)
            payment = random.choice(PAYMENT_METHODS)

            num_items = random.randint(1, 4)
            chosen_products = random.sample(list(products_db.keys()), min(num_items, len(products_db)))

            total = 0.0
            items = []
            for pid in chosen_products:
                qty = random.randint(1, 3)
                price = products_db[pid]
                discount = random.choice([1.0, 0.95, 0.9, 0.85])
                unit = round(price * discount, 2)
                sub = round(unit * qty, 2)
                total += sub
                items.append((pid, qty, unit, sub))

            total = round(total, 2)
            order_id += 1

            cursor.execute(
                "INSERT INTO orders (customer_id, order_date, total_amount, status, payment_method) "
                "VALUES (?,?,?,?,?)",
                (cid, date_str, total, status, payment),
            )
            real_order_id = cursor.lastrowid
            for pid, qty, unit, sub in items:
                cursor.execute(
                    "INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) "
                    "VALUES (?,?,?,?,?)",
                    (real_order_id, pid, qty, unit, sub),
                )

            if status == "completed":
                day_revenue += total

        daily_agg[date_str] = {
            "order_count": base_orders,
            "revenue": round(day_revenue, 2),
            "new_customers": new_cust,
            "active_users": active,
        }

    for date_str, stats in daily_agg.items():
        cursor.execute(
            "INSERT INTO daily_stats (date, order_count, revenue, new_customers, active_users) "
            "VALUES (?,?,?,?,?)",
            (date_str, stats["order_count"], stats["revenue"], stats["new_customers"], stats["active_users"]),
        )

    conn.commit()

    print(f"✅ 测试数据库创建成功: {DB_PATH}")
    print(f"   分类: {cursor.execute('SELECT COUNT(*) FROM categories').fetchone()[0]} 条")
    print(f"   商品: {cursor.execute('SELECT COUNT(*) FROM products').fetchone()[0]} 条")
    print(f"   客户: {cursor.execute('SELECT COUNT(*) FROM customers').fetchone()[0]} 条")
    print(f"   订单: {cursor.execute('SELECT COUNT(*) FROM orders').fetchone()[0]} 条")
    print(f"   订单明细: {cursor.execute('SELECT COUNT(*) FROM order_items').fetchone()[0]} 条")
    print(f"   每日统计: {cursor.execute('SELECT COUNT(*) FROM daily_stats').fetchone()[0]} 条")

    conn.close()
    return str(DB_PATH)


if __name__ == "__main__":
    create_database()
