-- SQL Script for Adding Payment Fields to Sales Table in Supabase
-- Run this script in Supabase SQL Editor

-- Add amount_paid and change_amount columns to sales table
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS change_amount DECIMAL(10, 2) DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN sales.amount_paid IS 'Amount paid by customer (for cash payments)';
COMMENT ON COLUMN sales.change_amount IS 'Change returned to customer (calculated: amount_paid - net_amount)';

-- For existing records, set default values
-- For credit payments, amount_paid should equal net_amount (no change)
UPDATE sales 
SET amount_paid = net_amount, 
    change_amount = 0 
WHERE payment_type = 'credit' AND amount_paid IS NULL;

-- For cash payments, if amount_paid is null, set it equal to net_amount (assume exact payment)
UPDATE sales 
SET amount_paid = net_amount, 
    change_amount = 0 
WHERE payment_type = 'cash' AND amount_paid IS NULL;

-- Verify the changes
SELECT 
  id,
  sale_date,
  payment_type,
  net_amount,
  amount_paid,
  change_amount,
  status
FROM sales
ORDER BY created_at DESC
LIMIT 10;
