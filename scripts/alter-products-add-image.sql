-- Optional product images stored in Supabase Storage.
-- Run this script once in the Supabase SQL Editor before uploading images.

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS image_path TEXT;

COMMENT ON COLUMN public.products.image_path IS
'Relative path of the optional product image in the product-images Storage bucket';

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'product-images',
  'product-images',
  TRUE,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
CREATE POLICY "Public can view product images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-images');

-- The application does not have login/permissions yet. These policies match
-- the current anonymous product-management access and should be tightened when
-- authentication is introduced.
DROP POLICY IF EXISTS "Public can upload product images" ON storage.objects;
CREATE POLICY "Public can upload product images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Public can update product images" ON storage.objects;
CREATE POLICY "Public can update product images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'product-images')
WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Public can delete product images" ON storage.objects;
CREATE POLICY "Public can delete product images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'product-images');
