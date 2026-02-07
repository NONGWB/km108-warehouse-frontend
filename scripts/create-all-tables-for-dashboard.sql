-- SQL Script to Create ALL Tables Required for Dashboard
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. Create Products Table
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_name VARCHAR(255) NOT NULL,
  barcode VARCHAR(100),
  sale_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  store1_name VARCHAR(255) DEFAULT '',
  store1_price DECIMAL(10, 2) DEFAULT 0,
  store2_name VARCHAR(255) DEFAULT '',
  store2_price DECIMAL(10, 2) DEFAULT 0,
  store3_name VARCHAR(255) DEFAULT '',
  store3_price DECIMAL(10, 2) DEFAULT 0,
  store4_name VARCHAR(255) DEFAULT '',
  store4_price DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for products
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(product_name);

-- Enable RLS for products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policy for products
CREATE POLICY "Allow all operations on products" ON products
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 2. Create Contacts Table
-- ============================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  line_id VARCHAR(100),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for contacts
CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);

-- Enable RLS for contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Create policy for contacts
CREATE POLICY "Allow all operations on contacts" ON contacts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 3. Create Sales Tables
-- ============================================
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  customer_name VARCHAR(255) DEFAULT 'customer1',
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('cash', 'credit')),
  amount_paid DECIMAL(10, 2) DEFAULT 0,
  change_amount DECIMAL(10, 2) DEFAULT 0,
  status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create sale_items table
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  barcode VARCHAR(100),
  unit_price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for sales
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_updated_at ON sales(updated_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);

-- Enable RLS for sales
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- Create policies for sales
CREATE POLICY "Allow all operations on sales" ON sales
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on sale_items" ON sale_items
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 4. Create Order Notes Table (if needed)
-- ============================================
CREATE TABLE IF NOT EXISTS order_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_name VARCHAR(255) NOT NULL,
  barcode VARCHAR(100),
  quantity INTEGER NOT NULL DEFAULT 1,
  note TEXT,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for order_notes
CREATE INDEX IF NOT EXISTS idx_order_notes_completed ON order_notes(is_completed);
CREATE INDEX IF NOT EXISTS idx_order_notes_created_at ON order_notes(created_at);

-- Enable RLS for order_notes
ALTER TABLE order_notes ENABLE ROW LEVEL SECURITY;

-- Create policy for order_notes
CREATE POLICY "Allow all operations on order_notes" ON order_notes
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 5. Create Update Triggers
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sales_updated_at ON sales;
CREATE TRIGGER update_sales_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_order_notes_updated_at ON order_notes;
CREATE TRIGGER update_order_notes_updated_at
  BEFORE UPDATE ON order_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. Verify All Tables
-- ============================================
SELECT 
  'All tables created successfully!' as message;

-- Show table counts
SELECT 'products' as table_name, COUNT(*) as row_count FROM products
UNION ALL
SELECT 'contacts', COUNT(*) FROM contacts
UNION ALL
SELECT 'sales', COUNT(*) FROM sales
UNION ALL
SELECT 'sale_items', COUNT(*) FROM sale_items
UNION ALL
SELECT 'order_notes', COUNT(*) FROM order_notes;
