-- Allow weighed products to use quantities such as 0.250 or 1.500 kilograms.
-- Existing quantities within the NUMERIC(10, 3) range are converted without losing value.

BEGIN;

ALTER TABLE public.sale_items
  ALTER COLUMN quantity TYPE NUMERIC(10, 3)
  USING quantity::NUMERIC(10, 3);

ALTER TABLE public.sale_items
  ALTER COLUMN quantity SET DEFAULT 1;

ALTER TABLE public.sale_items
  DROP CONSTRAINT IF EXISTS sale_items_quantity_positive;

ALTER TABLE public.sale_items
  ADD CONSTRAINT sale_items_quantity_positive CHECK (quantity > 0);

COMMIT;
