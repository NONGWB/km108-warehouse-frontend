-- SQL Script for Creating Sales Tables in Supabase
-- Run this script in Supabase SQL Editor

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_number VARCHAR(30),
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_name VARCHAR(255),
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
  quantity NUMERIC(10, 3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_updated_at ON sales(updated_at);
CREATE INDEX IF NOT EXISTS idx_sales_document_payment_status ON sales(document_type, payment_status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_document_number_unique ON sales(document_number) WHERE document_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for sales table
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

-- Enable Row Level Security (RLS)
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_sequences ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust based on your security requirements)
-- For development, allow all operations
CREATE POLICY "Allow all operations on sales" ON sales
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on sale_items" ON sale_items
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- If you want to restrict access to authenticated users only, use these policies instead:
-- DROP POLICY "Allow all operations on sales" ON sales;
-- DROP POLICY "Allow all operations on sale_items" ON sale_items;
-- 
-- CREATE POLICY "Authenticated users can do all on sales" ON sales
--   FOR ALL
--   USING (auth.role() = 'authenticated')
--   WITH CHECK (auth.role() = 'authenticated');
-- 
-- CREATE POLICY "Authenticated users can do all on sale_items" ON sale_items
--   FOR ALL
--   USING (auth.role() = 'authenticated')
--   WITH CHECK (auth.role() = 'authenticated');

-- Comments for documentation
COMMENT ON TABLE sales IS 'Store sales/transactions with draft and completed status';
COMMENT ON TABLE sale_items IS 'Items within each sale transaction with unit price at time of sale';
COMMENT ON COLUMN sales.unit_price IS 'Price at the time of sale (historical price)';
COMMENT ON COLUMN sales.status IS 'draft = not yet completed, completed = transaction finished';
COMMENT ON COLUMN sales.payment_type IS 'Payment method: cash or credit';
COMMENT ON COLUMN sales.document_type IS 'Document: sales slip, invoice, or company receipt';
COMMENT ON COLUMN sales.payment_status IS 'Payment settlement: unpaid or paid';
COMMENT ON COLUMN sales.document_number IS 'Permanent invoice number in INV-DDMMYYYYXXXX format';
