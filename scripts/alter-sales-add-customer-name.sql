-- SQL Script for Adding Customer Name to Sales Table in Supabase
-- Run this script in Supabase SQL Editor

-- Add customer_name column to sales table
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255) DEFAULT 'customer1';

-- Add comment for documentation
COMMENT ON COLUMN sales.customer_name IS 'Customer name (required for credit payments, default: customer1)';

-- For existing records, ensure customer_name has a value
UPDATE sales 
SET customer_name = 'customer1' 
WHERE customer_name IS NULL OR customer_name = '';

-- Verify the changes
SELECT 
  id,
  sale_date,
  customer_name,
  payment_type,
  net_amount,
  status
FROM sales
ORDER BY created_at DESC
LIMIT 10;
