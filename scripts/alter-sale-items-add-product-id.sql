-- Link sale items to products while keeping product details as historical snapshots.
-- Run this script once in the Supabase SQL Editor.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- The current legacy products table may not have an ID yet.
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();

UPDATE public.products
SET id = gen_random_uuid()
WHERE id IS NULL;

ALTER TABLE public.products
ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.products
ALTER COLUMN id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_id_key'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_id_key UNIQUE (id);
  END IF;
END
$$;

ALTER TABLE public.sale_items
ADD COLUMN IF NOT EXISTS product_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sale_items_product_id_fkey'
      AND conrelid = 'public.sale_items'::regclass
  ) THEN
    ALTER TABLE public.sale_items
      ADD CONSTRAINT sale_items_product_id_fkey
      FOREIGN KEY (product_id)
      REFERENCES public.products(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_sale_items_product_id
ON public.sale_items(product_id);

-- Backfill old sale items only when their barcode/name matches exactly one product.
WITH unique_product_matches AS (
  SELECT
    sale_item.id AS sale_item_id,
    MIN(product.id::text)::uuid AS product_id
  FROM public.sale_items AS sale_item
  JOIN public.products AS product
    ON (
      NULLIF(BTRIM(sale_item.barcode), '') IS NOT NULL
      AND product.barcode = sale_item.barcode
    ) OR (
      NULLIF(BTRIM(sale_item.barcode), '') IS NULL
      AND product.product_name = sale_item.product_name
    )
  WHERE sale_item.product_id IS NULL
  GROUP BY sale_item.id
  HAVING COUNT(*) = 1
)
UPDATE public.sale_items AS sale_item
SET product_id = matched.product_id
FROM unique_product_matches AS matched
WHERE sale_item.id = matched.sale_item_id;

COMMENT ON COLUMN public.sale_items.product_id IS
'Product reference for reporting and future stock deduction; nullable to preserve historical sales when a product is deleted';
