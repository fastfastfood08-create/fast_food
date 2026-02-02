-- ============================================
-- قاعدة بيانات نظام إدارة المطعم
-- Restaurant Management System Database
-- متوافق مع Supabase (PostgreSQL)
-- ============================================

-- تنظيف الجداول القديمة إذا وجدت (حذف بترتيب عكسي بسبب العلاقات)
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS meal_sizes CASCADE;
DROP TABLE IF EXISTS meals CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

-- ============================================
-- جدول الأقسام (Categories)
-- ============================================
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    icon TEXT DEFAULT '📁',
    "order" INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- جدول الوجبات (Meals)
-- ============================================
CREATE TABLE meals (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image TEXT,
    price DOUBLE PRECISION DEFAULT 0,
    active BOOLEAN DEFAULT true,
    popular BOOLEAN DEFAULT false,
    "order" INTEGER DEFAULT 0,
    has_sizes BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- جدول أحجام الوجبات (Meal Sizes)
-- ============================================
CREATE TABLE meal_sizes (
    id SERIAL PRIMARY KEY,
    meal_id INTEGER NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price DOUBLE PRECISION NOT NULL
);

-- ============================================
-- جدول الطلبات (Orders)
-- ============================================
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    customer_address TEXT,
    location TEXT,
    total DOUBLE PRECISION NOT NULL,
    subtotal DOUBLE PRECISION DEFAULT 0,
    delivery_cost DOUBLE PRECISION DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    order_type VARCHAR(50) DEFAULT 'delivery',
    notes TEXT,
    rating INTEGER,
    review TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- جدول عناصر الطلبات (Order Items)
-- ============================================
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    meal_id INTEGER NOT NULL,
    meal_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    price DOUBLE PRECISION NOT NULL,
    size VARCHAR(100)
);

-- ============================================
-- جدول الإعدادات (Settings)
-- ============================================
CREATE TABLE settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    restaurant_name VARCHAR(255) DEFAULT 'مطعمي',
    phone VARCHAR(50) DEFAULT '0555123456',
    address TEXT DEFAULT 'الجزائر العاصمة',
    currency VARCHAR(10) DEFAULT 'دج',
    is_open BOOLEAN DEFAULT true,
    allow_pre_orders BOOLEAN DEFAULT true,
    min_pre_order_hours INTEGER DEFAULT 1,
    max_pre_order_hours INTEGER DEFAULT 24,
    open_time VARCHAR(10) DEFAULT '10:00',
    close_time VARCHAR(10) DEFAULT '23:00',
    delivery_enabled BOOLEAN DEFAULT true,
    delivery_type VARCHAR(50) DEFAULT 'fixed',
    delivery_fixed_cost DOUBLE PRECISION DEFAULT 200,
    delivery_free_above DOUBLE PRECISION DEFAULT 2000,
    delivery_cost_per_km DOUBLE PRECISION DEFAULT 50,
    delivery_max_distance DOUBLE PRECISION DEFAULT 15,
    admin_password VARCHAR(255) DEFAULT 'admin123'
);

-- ============================================
-- إنشاء الفهارس (Indexes) لتحسين الأداء
-- ============================================
CREATE INDEX idx_meals_category_id ON meals(category_id);
CREATE INDEX idx_meals_active ON meals(active);
CREATE INDEX idx_categories_active ON categories(active);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- ============================================
-- إنشاء Triggers لتحديث updated_at تلقائياً
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meals_updated_at
    BEFORE UPDATE ON meals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- إدراج البيانات الافتراضية
-- ============================================

-- إعدادات المطعم
INSERT INTO settings (id, restaurant_name, phone, address, currency, is_open, delivery_type, delivery_fixed_cost, admin_password)
VALUES (1, 'مطعمي', '0555123456', 'الجزائر العاصمة', 'دج', true, 'fixed', 200, 'admin123')
ON CONFLICT (id) DO NOTHING;

-- الأقسام الافتراضية

-- وجبات افتراضية
INSERT INTO meals (category_id, name, description, price, active, popular, "order", has_sizes) VALUES
-- بيتزا
(1, 'بيتزا مارغريتا', 'صلصة طماطم طازجة، جبن موزاريلا، ريحان طازج', 800, true, true, 1, true),
(1, 'بيتزا خضار', 'فلفل ملون، زيتون، فطر، بصل، طماطم، جبن موزاريلا', 900, true, false, 2, true),
(1, 'بيتزا اللحم', 'لحم مفروم، فلفل، بصل، جبن موزاريلا، صلصة خاصة', 1000, true, true, 3, true),
-- برغر
(2, 'برغر كلاسيك', 'لحم بقري، جبن شيدر، خس، طماطم، بصل، صلصة خاصة', 600, true, true, 1, true),
(2, 'برغر دجاج', 'صدر دجاج مقرمش، خس، طماطم، صوص الثوم', 550, true, false, 2, false),
-- شاورما
(3, 'شاورما دجاج', 'دجاج متبل، بطاطس، ثوم، مخلل، خبز عربي', 400, true, true, 1, true),
(3, 'شاورما لحم', 'لحم متبل، بطاطس، ثوم، مخلل، خبز عربي', 500, true, false, 2, true),
-- طاكوس
(4, 'طاكوس دجاج', 'دجاج متبل، جبن، خس، صلصة حارة', 350, true, false, 1, false),
(4, 'طاكوس لحم', 'لحم مفروم، جبن، خس، طماطم، صلصة خاصة', 400, true, false, 2, false),
-- سلطات
(5, 'سلطة سيزر', 'خس روماني، صدر دجاج مشوي، جبن بارميزان، صوص سيزر', 500, true, false, 1, false),
(5, 'سلطة يونانية', 'خيار، طماطم، زيتون، جبن فيتا، بصل أحمر', 400, true, false, 2, false),
-- مشروبات
(6, 'كوكا كولا', 'مشروب غازي بارد', 100, true, false, 1, false),
(6, 'عصير برتقال', 'عصير برتقال طبيعي طازج', 200, true, false, 2, false),
(6, 'ماء معدني', 'ماء معدني نقي', 50, true, false, 3, false),
-- حلويات
(7, 'تيراميسو', 'كعكة إيطالية بالقهوة والماسكاربوني', 400, true, true, 1, false),
(7, 'براوني', 'كعكة شوكولاتة غنية مع آيس كريم', 350, true, false, 2, false);

-- أحجام الوجبات
INSERT INTO meal_sizes (meal_id, name, price) VALUES
-- بيتزا مارغريتا
(1, 'صغيرة', 800),
(1, 'وسط', 1200),
(1, 'كبيرة', 1600),
-- بيتزا خضار
(2, 'صغيرة', 900),
(2, 'وسط', 1400),
(2, 'كبيرة', 1900),
-- بيتزا اللحم
(3, 'صغيرة', 1000),
(3, 'وسط', 1500),
(3, 'كبيرة', 2000),
-- برغر كلاسيك
(4, 'Single', 600),
(4, 'Double', 900),
(4, 'Triple', 1200),
-- شاورما دجاج
(6, 'عادي', 400),
(6, 'جامبو', 600),
-- شاورما لحم
(7, 'عادي', 500),
(7, 'جامبو', 700);

-- ============================================
-- تمكين Row Level Security (RLS) - اختياري
-- ============================================
-- ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- سياسات للقراءة العامة
-- CREATE POLICY "Allow public read on categories" ON categories FOR SELECT USING (true);
-- CREATE POLICY "Allow public read on meals" ON meals FOR SELECT USING (true);

-- ============================================
-- انتهى إنشاء قاعدة البيانات بنجاح!
-- ============================================
