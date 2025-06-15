-- Smart Order Intake Database Schema
-- Run this in your Supabase SQL editor

-- Orders table to store processed email orders
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    raw_email TEXT NOT NULL,
    customer_name TEXT,
    customer_email TEXT,
    customer_company TEXT,
    delivery_address TEXT,
    delivery_date TEXT,
    urgency TEXT CHECK (urgency IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    line_items JSONB NOT NULL DEFAULT '[]',
    confidence_score REAL NOT NULL DEFAULT 0,
    status TEXT CHECK (status IN ('received', 'processing', 'ai_parsed', 'validating', 'needs_review', 'approved', 'rejected')) DEFAULT 'received',
    flags JSONB NOT NULL DEFAULT '[]',
    suggestions JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table (optional - can sync from CSV)
CREATE TABLE IF NOT EXISTS products (
    product_code TEXT PRIMARY KEY,
    product_name TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    available_in_stock INTEGER NOT NULL DEFAULT 0,
    min_order_quantity INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    category_code TEXT,
    category_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customers table for tracking customer history
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    name TEXT,
    company TEXT,
    phone TEXT,
    address TEXT,
    order_count INTEGER DEFAULT 0,
    total_spent REAL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order validation results table
CREATE TABLE IF NOT EXISTS order_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
    validation_type TEXT NOT NULL, -- 'sku_check', 'inventory_check', 'moq_check', etc.
    is_valid BOOLEAN NOT NULL,
    error_message TEXT,
    suggestions JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_confidence ON orders(confidence_score);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_code);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- RLS (Row Level Security) policies
-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_validations ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (adjust as needed)
CREATE POLICY "Allow all for authenticated users" ON orders FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON products FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON customers FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON order_validations FOR ALL TO authenticated USING (true);

-- Allow read access for anonymous users (for demo purposes)
CREATE POLICY "Allow read for anonymous" ON orders FOR SELECT TO anon USING (true);
CREATE POLICY "Allow read for anonymous" ON products FOR SELECT TO anon USING (true);

-- Functions for automatic timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for testing (optional)
-- INSERT INTO products (product_code, product_name, price, available_in_stock, min_order_quantity, description, category_code, category_name) VALUES
-- ('DSK-0001', 'Desk TRÄNHOLM 19', 902.78, 31, 2, 'A modern desk named Desk TRÄNHOLM 19, designed with style and functionality in mind.', 'DSK', 'Desks'),
-- ('CHR-0026', 'Chair STRÅSUND 813', 387.53, 20, 10, 'A modern chair named Chair STRÅSUND 813, designed with style and functionality in mind.', 'CHR', 'Chairs'),
-- ('SFA-0126', 'Sofa TRÄNMARK 164', 594.60, 14, 2, 'A modern sofa named Sofa TRÄNMARK 164, designed with style and functionality in mind.', 'SFA', 'Sofas');

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated; 