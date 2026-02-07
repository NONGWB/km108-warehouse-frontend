-- SQL Script to Verify and Check Tables Required for Dashboard
-- Run this in Supabase SQL Editor to check if all required tables exist

-- 1. Check if sales table exists and has correct columns
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'sales'
ORDER BY ordinal_position;

-- 2. Check if products table exists and has sale_price column
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;

-- 3. Check if contacts table exists
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'contacts'
ORDER BY ordinal_position;

-- 4. Check current data in sales table
SELECT 
  COUNT(*) as total_sales,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sales,
  SUM(CASE WHEN status = 'completed' THEN net_amount ELSE 0 END) as total_revenue
FROM sales;

-- 5. Check current data in products table
SELECT 
  COUNT(*) as total_products,
  SUM(sale_price) as total_inventory_value
FROM products;

-- 6. Check current data in contacts table
SELECT 
  COUNT(*) as total_contacts
FROM contacts;
