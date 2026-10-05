-- Customer master data and optional link from sales.
-- Run this script in Supabase SQL Editor.

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

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on customers" ON customers;
CREATE POLICY "Allow all operations on customers" ON customers
  FOR ALL
  USING (true)
  WITH CHECK (true);

ALTER TABLE sales
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

ALTER TABLE sales
ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);

ALTER TABLE sales
ADD COLUMN IF NOT EXISTS customer_address TEXT;

CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);

COMMENT ON TABLE customers IS 'Customer master data for individuals and companies';
COMMENT ON COLUMN sales.customer_id IS 'Optional link to the customer master record';
COMMENT ON COLUMN sales.customer_phone IS 'Customer phone snapshot at the time of sale';
COMMENT ON COLUMN sales.customer_address IS 'Customer address snapshot at the time of sale';
