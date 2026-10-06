-- Login, roles, row-level permissions, seller audit fields, and avatar storage.
-- Run once in Supabase SQL Editor before creating the first admin account.

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'seller' CHECK (role IN ('admin', 'shop_owner', 'seller')),
  avatar_path TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS seller_name VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_sales_seller_id ON public.sales(seller_id);

CREATE OR REPLACE FUNCTION public.set_sale_seller()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE seller_display_name TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.seller_id IS NOT NULL THEN
    NEW.seller_id := OLD.seller_id;
    NEW.seller_name := OLD.seller_name;
    RETURN NEW;
  END IF;

  SELECT name INTO seller_display_name FROM public.profiles WHERE id = auth.uid() AND is_active = TRUE;
  IF seller_display_name IS NULL THEN
    RAISE EXCEPTION 'Active seller profile not found';
  END IF;
  NEW.seller_id := auth.uid();
  NEW.seller_name := seller_display_name;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_sale_seller ON public.sales;
CREATE TRIGGER set_sale_seller
  BEFORE INSERT OR UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.set_sale_seller();

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role TEXT;
  requested_username TEXT;
BEGIN
  requested_role := COALESCE(NEW.raw_app_meta_data ->> 'role', 'seller');
  IF requested_role NOT IN ('admin', 'shop_owner', 'seller') THEN
    requested_role := 'seller';
  END IF;

  requested_username := LOWER(COALESCE(
    NEW.raw_app_meta_data ->> 'username',
    SPLIT_PART(COALESCE(NEW.email, ''), '@', 1)
  ));

  INSERT INTO public.profiles (id, username, name, role)
  VALUES (
    NEW.id,
    requested_username,
    COALESCE(NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'name'), ''), requested_username),
    requested_role
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() AND is_active = TRUE;
$$;

CREATE OR REPLACE FUNCTION public.is_active_app_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active = TRUE);
$$;

CREATE OR REPLACE FUNCTION public.is_app_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.current_app_role() IN ('admin', 'shop_owner'), FALSE);
$$;

CREATE OR REPLACE FUNCTION public.protect_profile_security_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND (
    NEW.id IS DISTINCT FROM OLD.id OR
    NEW.username IS DISTINCT FROM OLD.username OR
    NEW.role IS DISTINCT FROM OLD.role OR
    NEW.is_active IS DISTINCT FROM OLD.is_active
  ) THEN
    RAISE EXCEPTION 'Protected profile fields can only be changed by the user management service';
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_security_fields ON public.profiles;
CREATE TRIGGER protect_profile_security_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_security_fields();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE policy_row RECORD;
BEGIN
  FOR policy_row IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles', 'products', 'contacts', 'customers', 'sales', 'sale_items',
        'order_notes', 'order_note_items', 'document_sequences'
      )
  LOOP
    EXECUTE FORMAT('DROP POLICY IF EXISTS %I ON %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  END LOOP;
END $$;

CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_app_manager());
CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() AND public.is_active_app_user())
  WITH CHECK (id = auth.uid());

-- Active users can read/create/update back-office data. Only Admin and Shop Owner can delete.
CREATE POLICY products_select ON public.products FOR SELECT TO authenticated USING (public.is_active_app_user());
CREATE POLICY products_authenticated_insert ON public.products FOR INSERT TO authenticated WITH CHECK (public.is_active_app_user());
CREATE POLICY products_authenticated_update ON public.products FOR UPDATE TO authenticated USING (public.is_active_app_user()) WITH CHECK (public.is_active_app_user());
CREATE POLICY products_manager_delete ON public.products FOR DELETE TO authenticated USING (public.is_app_manager());

CREATE POLICY contacts_select ON public.contacts FOR SELECT TO authenticated USING (public.is_active_app_user());
CREATE POLICY contacts_authenticated_insert ON public.contacts FOR INSERT TO authenticated WITH CHECK (public.is_active_app_user());
CREATE POLICY contacts_authenticated_update ON public.contacts FOR UPDATE TO authenticated USING (public.is_active_app_user()) WITH CHECK (public.is_active_app_user());
CREATE POLICY contacts_manager_delete ON public.contacts FOR DELETE TO authenticated USING (public.is_app_manager());

CREATE POLICY customers_select ON public.customers FOR SELECT TO authenticated USING (public.is_active_app_user());
CREATE POLICY customers_authenticated_insert ON public.customers FOR INSERT TO authenticated WITH CHECK (public.is_active_app_user());
CREATE POLICY customers_authenticated_update ON public.customers FOR UPDATE TO authenticated USING (public.is_active_app_user()) WITH CHECK (public.is_active_app_user());
CREATE POLICY customers_manager_delete ON public.customers FOR DELETE TO authenticated USING (public.is_app_manager());

CREATE POLICY sales_select ON public.sales FOR SELECT TO authenticated USING (public.is_active_app_user());
CREATE POLICY sales_insert ON public.sales FOR INSERT TO authenticated WITH CHECK (public.is_active_app_user() AND seller_id = auth.uid());
CREATE POLICY sales_update ON public.sales FOR UPDATE TO authenticated USING (public.is_active_app_user()) WITH CHECK (public.is_active_app_user());
CREATE POLICY sales_manager_delete ON public.sales FOR DELETE TO authenticated USING (public.is_app_manager());

CREATE POLICY sale_items_select ON public.sale_items FOR SELECT TO authenticated USING (public.is_active_app_user());
CREATE POLICY sale_items_insert ON public.sale_items FOR INSERT TO authenticated WITH CHECK (public.is_active_app_user());
CREATE POLICY sale_items_update ON public.sale_items FOR UPDATE TO authenticated USING (public.is_active_app_user()) WITH CHECK (public.is_active_app_user());
-- Sale editing replaces its child rows; active cashiers therefore need child-row delete permission.
-- Deleting the persisted sale itself remains manager-only.
CREATE POLICY sale_items_delete_for_sale_edit ON public.sale_items FOR DELETE TO authenticated USING (public.is_active_app_user());

CREATE POLICY order_notes_select ON public.order_notes FOR SELECT TO authenticated USING (public.is_active_app_user());
CREATE POLICY order_notes_authenticated_insert ON public.order_notes FOR INSERT TO authenticated WITH CHECK (public.is_active_app_user());
CREATE POLICY order_notes_authenticated_update ON public.order_notes FOR UPDATE TO authenticated USING (public.is_active_app_user()) WITH CHECK (public.is_active_app_user());
CREATE POLICY order_notes_manager_delete ON public.order_notes FOR DELETE TO authenticated USING (public.is_app_manager());

ALTER TABLE public.order_note_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY order_note_items_select ON public.order_note_items FOR SELECT TO authenticated USING (public.is_active_app_user());
CREATE POLICY order_note_items_authenticated_insert ON public.order_note_items FOR INSERT TO authenticated WITH CHECK (public.is_active_app_user());
CREATE POLICY order_note_items_authenticated_update ON public.order_note_items FOR UPDATE TO authenticated USING (public.is_active_app_user()) WITH CHECK (public.is_active_app_user());
-- Required when editing a stock note because its child rows are replaced by the API.
CREATE POLICY order_note_items_authenticated_delete ON public.order_note_items FOR DELETE TO authenticated USING (public.is_active_app_user());

-- Sequence rows are only touched by the SECURITY DEFINER invoice-number trigger.
REVOKE ALL ON public.document_sequences FROM anon, authenticated;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products, public.contacts, public.customers,
  public.sales, public.sale_items, public.order_notes, public.order_note_items TO authenticated;
REVOKE ALL ON public.profiles, public.products, public.contacts, public.customers,
  public.sales, public.sale_items, public.order_notes, public.order_note_items,
  public.document_sequences FROM anon;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('user-avatars', 'user-avatars', TRUE, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
DECLARE policy_row RECORD;
BEGIN
  FOR policy_row IN SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname IN (
      'Authenticated users can manage product images', 'Active users can manage product images',
      'Active users can upload product images', 'Active users can update product images',
      'Managers can delete product images', 'Users can upload own avatar',
      'Users can update own avatar', 'Users can delete own avatar'
    )
  LOOP
    EXECUTE FORMAT('DROP POLICY IF EXISTS %I ON storage.objects', policy_row.policyname);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Public can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Public can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Public can delete product images" ON storage.objects;

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
CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'user-avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'user-avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT)
  WITH CHECK (bucket_id = 'user-avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY "Users can delete own avatar" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'user-avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);

-- Backfill profiles for Auth users that existed before this migration.
INSERT INTO public.profiles (id, username, name, role)
SELECT
  user_row.id,
  LOWER(COALESCE(user_row.raw_app_meta_data ->> 'username', SPLIT_PART(COALESCE(user_row.email, ''), '@', 1))),
  COALESCE(NULLIF(BTRIM(user_row.raw_user_meta_data ->> 'name'), ''), SPLIT_PART(COALESCE(user_row.email, ''), '@', 1)),
  CASE WHEN user_row.raw_app_meta_data ->> 'role' IN ('admin', 'shop_owner', 'seller')
    THEN user_row.raw_app_meta_data ->> 'role' ELSE 'seller' END
FROM auth.users AS user_row
ON CONFLICT (id) DO NOTHING;
