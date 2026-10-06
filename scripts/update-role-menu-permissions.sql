-- Permission adjustment for existing installations.
-- Seller may read/create/update back-office data, but may not delete persisted records.
-- Run once in Supabase SQL Editor after create-auth-and-permissions.sql.

DROP POLICY IF EXISTS products_manager_insert ON public.products;
DROP POLICY IF EXISTS products_manager_update ON public.products;
DROP POLICY IF EXISTS products_authenticated_insert ON public.products;
DROP POLICY IF EXISTS products_authenticated_update ON public.products;
CREATE POLICY products_authenticated_insert ON public.products
  FOR INSERT TO authenticated WITH CHECK (public.is_active_app_user());
CREATE POLICY products_authenticated_update ON public.products
  FOR UPDATE TO authenticated USING (public.is_active_app_user()) WITH CHECK (public.is_active_app_user());

DROP POLICY IF EXISTS contacts_manager_insert ON public.contacts;
DROP POLICY IF EXISTS contacts_manager_update ON public.contacts;
DROP POLICY IF EXISTS contacts_authenticated_insert ON public.contacts;
DROP POLICY IF EXISTS contacts_authenticated_update ON public.contacts;
CREATE POLICY contacts_authenticated_insert ON public.contacts
  FOR INSERT TO authenticated WITH CHECK (public.is_active_app_user());
CREATE POLICY contacts_authenticated_update ON public.contacts
  FOR UPDATE TO authenticated USING (public.is_active_app_user()) WITH CHECK (public.is_active_app_user());

DROP POLICY IF EXISTS customers_manager_insert ON public.customers;
DROP POLICY IF EXISTS customers_manager_update ON public.customers;
DROP POLICY IF EXISTS customers_authenticated_insert ON public.customers;
DROP POLICY IF EXISTS customers_authenticated_update ON public.customers;
CREATE POLICY customers_authenticated_insert ON public.customers
  FOR INSERT TO authenticated WITH CHECK (public.is_active_app_user());
CREATE POLICY customers_authenticated_update ON public.customers
  FOR UPDATE TO authenticated USING (public.is_active_app_user()) WITH CHECK (public.is_active_app_user());

DROP POLICY IF EXISTS order_notes_manager_insert ON public.order_notes;
DROP POLICY IF EXISTS order_notes_manager_update ON public.order_notes;
DROP POLICY IF EXISTS order_notes_authenticated_insert ON public.order_notes;
DROP POLICY IF EXISTS order_notes_authenticated_update ON public.order_notes;
CREATE POLICY order_notes_authenticated_insert ON public.order_notes
  FOR INSERT TO authenticated WITH CHECK (public.is_active_app_user());
CREATE POLICY order_notes_authenticated_update ON public.order_notes
  FOR UPDATE TO authenticated USING (public.is_active_app_user()) WITH CHECK (public.is_active_app_user());

DROP POLICY IF EXISTS order_note_items_manager_insert ON public.order_note_items;
DROP POLICY IF EXISTS order_note_items_manager_update ON public.order_note_items;
DROP POLICY IF EXISTS order_note_items_manager_delete ON public.order_note_items;
DROP POLICY IF EXISTS order_note_items_authenticated_insert ON public.order_note_items;
DROP POLICY IF EXISTS order_note_items_authenticated_update ON public.order_note_items;
DROP POLICY IF EXISTS order_note_items_authenticated_delete ON public.order_note_items;
CREATE POLICY order_note_items_authenticated_insert ON public.order_note_items
  FOR INSERT TO authenticated WITH CHECK (public.is_active_app_user());
CREATE POLICY order_note_items_authenticated_update ON public.order_note_items
  FOR UPDATE TO authenticated USING (public.is_active_app_user()) WITH CHECK (public.is_active_app_user());
CREATE POLICY order_note_items_authenticated_delete ON public.order_note_items
  FOR DELETE TO authenticated USING (public.is_active_app_user());

DROP POLICY IF EXISTS "Authenticated users can manage product images" ON storage.objects;
DROP POLICY IF EXISTS "Active users can manage product images" ON storage.objects;
DROP POLICY IF EXISTS "Active users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Active users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Managers can delete product images" ON storage.objects;
CREATE POLICY "Active users can upload product images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.is_active_app_user());
CREATE POLICY "Active users can update product images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND public.is_active_app_user())
  WITH CHECK (bucket_id = 'product-images' AND public.is_active_app_user());
CREATE POLICY "Managers can delete product images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND public.is_app_manager());
