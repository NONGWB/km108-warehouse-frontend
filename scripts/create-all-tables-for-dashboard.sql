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
-- 3. Create Customers Table
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_type VARCHAR(20) NOT NULL CHECK (customer_type IN ('individual', 'corporate')),
  full_name VARCHAR(255),
  company_name VARCHAR(255),
  address TEXT,
  phone VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT customers_name_by_type_check CHECK (
    (customer_type = 'individual' AND NULLIF(BTRIM(full_name), '') IS NOT NULL AND company_name IS NULL)
    OR
    (customer_type = 'corporate' AND NULLIF(BTRIM(company_name), '') IS NOT NULL AND full_name IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_customers_full_name ON customers(full_name);
CREATE INDEX IF NOT EXISTS idx_customers_company_name ON customers(company_name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on customers" ON customers
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 4. Create Sales Tables
-- ============================================
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_number VARCHAR(30),
  sale_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(255) DEFAULT 'customer1',
  customer_phone VARCHAR(50),
  customer_address TEXT,
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('cash', 'credit')),
  document_type VARCHAR(30) NOT NULL DEFAULT 'sales_slip' CHECK (document_type IN ('sales_slip', 'invoice', 'company_receipt')),
  payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
  paid_at TIMESTAMP WITH TIME ZONE,
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
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  barcode VARCHAR(100),
  unit_price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS document_sequences (
  document_type VARCHAR(30) NOT NULL,
  sequence_date DATE NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (document_type, sequence_date),
  CONSTRAINT document_sequences_last_number_check CHECK (last_number >= 0)
);

-- Create indexes for sales
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_updated_at ON sales(updated_at);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_document_payment_status ON sales(document_type, payment_status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_document_number_unique ON sales(document_number) WHERE document_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);

-- Enable RLS for sales
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_sequences ENABLE ROW LEVEL SECURITY;

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
-- 5. Create Order Notes Table (if needed)
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
-- 6. Create Update Triggers
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

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sales_updated_at ON sales;
CREATE TRIGGER update_sales_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION assign_invoice_document_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invoice_date DATE;
  next_number INTEGER;
BEGIN
  IF NEW.document_type <> 'invoice'
    OR NEW.status <> 'completed'
    OR NULLIF(BTRIM(NEW.document_number), '') IS NOT NULL THEN
    RETURN NEW;
  END IF;

  invoice_date := NEW.sale_date::date;

  INSERT INTO document_sequences (document_type, sequence_date, last_number)
  VALUES ('invoice', invoice_date, 1)
  ON CONFLICT (document_type, sequence_date)
  DO UPDATE SET last_number = document_sequences.last_number + 1
  RETURNING last_number INTO next_number;

  IF next_number > 9999 THEN
    RAISE EXCEPTION 'Daily invoice limit exceeded for %', invoice_date;
  END IF;

  NEW.document_number :=
    'INV-'
    || TO_CHAR(invoice_date, 'DDMMYYYY')
    || LPAD(next_number::text, 4, '0');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_invoice_document_number ON sales;
CREATE TRIGGER assign_invoice_document_number
  BEFORE INSERT OR UPDATE OF status, document_type, sale_date
  ON sales
  FOR EACH ROW
  EXECUTE FUNCTION assign_invoice_document_number();

DROP TRIGGER IF EXISTS update_order_notes_updated_at ON order_notes;
CREATE TRIGGER update_order_notes_updated_at
  BEFORE UPDATE ON order_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. Verify All Tables
-- ============================================
SELECT 
  'All tables created successfully!' as message;

-- Show table counts
SELECT 'products' as table_name, COUNT(*) as row_count FROM products
UNION ALL
SELECT 'contacts', COUNT(*) FROM contacts
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'sales', COUNT(*) FROM sales
UNION ALL
SELECT 'sale_items', COUNT(*) FROM sale_items
UNION ALL
SELECT 'order_notes', COUNT(*) FROM order_notes;
