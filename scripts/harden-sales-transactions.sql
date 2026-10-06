-- Atomic checkout, server-side totals, idempotency, compact audit trail, and void workflow.
-- Run once in Supabase SQL Editor after the authentication/permission migrations.

BEGIN;

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS idempotency_key UUID;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS voided_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS voided_by_name VARCHAR(255);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS void_reason VARCHAR(500);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS paid_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS paid_by_name VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_idempotency_key_unique ON public.sales(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_voided_at ON public.sales(voided_at) WHERE voided_at IS NOT NULL;

ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_status_check;
ALTER TABLE public.sales
  ADD CONSTRAINT sales_status_check CHECK (status IN ('draft', 'completed', 'voided'));

CREATE TABLE IF NOT EXISTS public.sale_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE RESTRICT,
  action VARCHAR(40) NOT NULL CHECK (action IN (
    'sale_completed', 'payment_marked_paid', 'payment_marked_unpaid', 'sale_voided'
  )),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_name VARCHAR(255) NOT NULL,
  reason VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sale_audit_logs_sale_created ON public.sale_audit_logs(sale_id, created_at DESC);

ALTER TABLE public.sale_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sale_audit_manager_select ON public.sale_audit_logs;
CREATE POLICY sale_audit_manager_select ON public.sale_audit_logs
  FOR SELECT TO authenticated USING (public.is_app_manager());
GRANT SELECT ON public.sale_audit_logs TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.sale_audit_logs FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_sale_seller()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE seller_display_name TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'draft' AND NEW.status = 'completed' THEN
    SELECT name INTO seller_display_name FROM public.profiles WHERE id = auth.uid() AND is_active = TRUE;
    IF seller_display_name IS NULL THEN RAISE EXCEPTION 'ACTIVE_USER_REQUIRED'; END IF;
    NEW.seller_id := auth.uid();
    NEW.seller_name := seller_display_name;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.seller_id IS NOT NULL THEN
    NEW.seller_id := OLD.seller_id;
    NEW.seller_name := OLD.seller_name;
    RETURN NEW;
  END IF;

  SELECT name INTO seller_display_name FROM public.profiles WHERE id = auth.uid() AND is_active = TRUE;
  IF seller_display_name IS NULL THEN RAISE EXCEPTION 'ACTIVE_USER_REQUIRED'; END IF;
  NEW.seller_id := auth.uid();
  NEW.seller_name := seller_display_name;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_non_draft_sale_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.status <> 'draft' THEN
    RAISE EXCEPTION 'COMPLETED_SALE_CANNOT_BE_DELETED';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS prevent_non_draft_sale_delete ON public.sales;
CREATE TRIGGER prevent_non_draft_sale_delete
  BEFORE DELETE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.prevent_non_draft_sale_delete();

CREATE OR REPLACE FUNCTION public._sale_result(p_sale_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT TO_JSONB(s) || JSONB_BUILD_OBJECT(
    'items', COALESCE((
      SELECT JSONB_AGG(TO_JSONB(si) ORDER BY si.created_at, si.id)
      FROM public.sale_items si WHERE si.sale_id = s.id
    ), '[]'::JSONB)
  )
  FROM public.sales s WHERE s.id = p_sale_id;
$$;

CREATE OR REPLACE FUNCTION public._replace_checkout_items(p_sale_id UUID, p_items JSONB)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  item JSONB;
  product_row RECORD;
  quantity_value NUMERIC(10,3);
  expected_price NUMERIC(10,2);
  line_total NUMERIC(10,2);
  total_value NUMERIC(10,2) := 0;
BEGIN
  IF p_items IS NULL OR JSONB_TYPEOF(p_items) <> 'array' OR JSONB_ARRAY_LENGTH(p_items) = 0 THEN
    RAISE EXCEPTION 'ITEMS_REQUIRED';
  END IF;

  DELETE FROM public.sale_items WHERE sale_id = p_sale_id;

  FOR item IN SELECT value FROM JSONB_ARRAY_ELEMENTS(p_items)
  LOOP
    IF NULLIF(item ->> 'product_id', '') IS NULL THEN RAISE EXCEPTION 'PRODUCT_ID_REQUIRED'; END IF;
    IF COALESCE(item ->> 'quantity', '') !~ '^\d{1,7}(\.\d{1,3})?$' THEN
      RAISE EXCEPTION 'INVALID_QUANTITY';
    END IF;
    quantity_value := (item ->> 'quantity')::NUMERIC;
    IF quantity_value <= 0 OR quantity_value > 9999999.999 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;

    SELECT id, product_name, barcode, sale_price
      INTO product_row
      FROM public.products
      WHERE id = (item ->> 'product_id')::UUID;
    IF NOT FOUND THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND:%', item ->> 'product_id'; END IF;

    IF NULLIF(item ->> 'unit_price', '') IS NOT NULL THEN
      expected_price := (item ->> 'unit_price')::NUMERIC;
      IF ABS(expected_price - product_row.sale_price) >= 0.01 THEN
        RAISE EXCEPTION 'PRICE_CHANGED:%:%', product_row.product_name, product_row.sale_price;
      END IF;
    END IF;

    line_total := ROUND(product_row.sale_price * quantity_value, 2);
    INSERT INTO public.sale_items (
      sale_id, product_id, product_name, barcode, unit_price, quantity, total_price
    ) VALUES (
      p_sale_id, product_row.id, product_row.product_name, product_row.barcode,
      product_row.sale_price, quantity_value, line_total
    );
    total_value := total_value + line_total;
  END LOOP;

  RETURN total_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_sale_transaction(
  p_idempotency_key UUID,
  p_sale_date DATE,
  p_customer_id UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_address TEXT,
  p_discount NUMERIC,
  p_payment_type TEXT,
  p_document_type TEXT,
  p_amount_paid NUMERIC,
  p_status TEXT,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor RECORD;
  customer_row RECORD;
  existing_sale_id UUID;
  new_sale_id UUID;
  total_value NUMERIC(10,2);
  discount_value NUMERIC(10,2) := ROUND(COALESCE(p_discount, 0), 2);
  net_value NUMERIC(10,2);
  paid_value NUMERIC(10,2) := ROUND(COALESCE(p_amount_paid, 0), 2);
  customer_name_value TEXT := NULLIF(BTRIM(p_customer_name), '');
  customer_phone_value TEXT := NULLIF(BTRIM(p_customer_phone), '');
  customer_address_value TEXT := NULLIF(BTRIM(p_customer_address), '');
BEGIN
  SELECT id, name INTO actor FROM public.profiles WHERE id = auth.uid() AND is_active = TRUE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ACTIVE_USER_REQUIRED'; END IF;
  IF p_idempotency_key IS NULL THEN RAISE EXCEPTION 'IDEMPOTENCY_KEY_REQUIRED'; END IF;

  SELECT id INTO existing_sale_id FROM public.sales WHERE idempotency_key = p_idempotency_key;
  IF existing_sale_id IS NOT NULL THEN RETURN public._sale_result(existing_sale_id); END IF;

  IF p_status NOT IN ('draft', 'completed') THEN RAISE EXCEPTION 'INVALID_SALE_STATUS'; END IF;
  IF p_payment_type NOT IN ('cash', 'credit') THEN RAISE EXCEPTION 'INVALID_PAYMENT_TYPE'; END IF;
  IF NOT ((p_payment_type = 'credit' AND p_document_type = 'invoice') OR
          (p_payment_type = 'cash' AND p_document_type IN ('sales_slip', 'company_receipt'))) THEN
    RAISE EXCEPTION 'INVALID_DOCUMENT_TYPE';
  END IF;

  IF p_customer_id IS NOT NULL THEN
    SELECT *, COALESCE(NULLIF(BTRIM(full_name), ''), NULLIF(BTRIM(company_name), '')) AS display_name
      INTO customer_row FROM public.customers WHERE id = p_customer_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'CUSTOMER_NOT_FOUND'; END IF;
    customer_name_value := customer_row.display_name;
    customer_phone_value := customer_row.phone;
    customer_address_value := customer_row.address;
  END IF;
  IF p_document_type IN ('invoice', 'company_receipt') AND customer_name_value IS NULL THEN
    RAISE EXCEPTION 'CUSTOMER_NAME_REQUIRED';
  END IF;

  BEGIN
    INSERT INTO public.sales (
      idempotency_key, sale_date, customer_id, customer_name, customer_phone, customer_address,
      seller_id, seller_name, total_amount, discount, net_amount, payment_type, document_type,
      payment_status, amount_paid, change_amount, status
    ) VALUES (
      p_idempotency_key, COALESCE(p_sale_date, CURRENT_DATE), p_customer_id, customer_name_value,
      customer_phone_value, customer_address_value, actor.id, actor.name, 0, discount_value, 0,
      p_payment_type, p_document_type, 'unpaid', 0, 0, p_status
    ) RETURNING id INTO new_sale_id;
  EXCEPTION WHEN unique_violation THEN
    -- A concurrent retry with the same key waits for the first transaction,
    -- then returns that sale instead of creating a duplicate.
    SELECT id INTO existing_sale_id FROM public.sales WHERE idempotency_key = p_idempotency_key;
    IF existing_sale_id IS NOT NULL THEN RETURN public._sale_result(existing_sale_id); END IF;
    RAISE;
  END;

  total_value := public._replace_checkout_items(new_sale_id, p_items);
  IF discount_value < 0 OR discount_value > total_value THEN RAISE EXCEPTION 'INVALID_DISCOUNT'; END IF;
  net_value := total_value - discount_value;

  IF p_status = 'completed' AND p_payment_type = 'cash' AND paid_value < net_value THEN
    RAISE EXCEPTION 'INSUFFICIENT_PAYMENT';
  END IF;

  UPDATE public.sales SET
    total_amount = total_value,
    net_amount = net_value,
    payment_status = CASE WHEN p_status = 'completed' AND p_payment_type = 'cash' THEN 'paid' ELSE 'unpaid' END,
    paid_at = CASE WHEN p_status = 'completed' AND p_payment_type = 'cash' THEN NOW() ELSE NULL END,
    paid_by = CASE WHEN p_status = 'completed' AND p_payment_type = 'cash' THEN actor.id ELSE NULL END,
    paid_by_name = CASE WHEN p_status = 'completed' AND p_payment_type = 'cash' THEN actor.name ELSE NULL END,
    amount_paid = CASE WHEN p_status = 'completed' AND p_payment_type = 'cash' THEN paid_value ELSE 0 END,
    change_amount = CASE WHEN p_status = 'completed' AND p_payment_type = 'cash' THEN paid_value - net_value ELSE 0 END
  WHERE id = new_sale_id;

  IF p_status = 'completed' THEN
    INSERT INTO public.sale_audit_logs(sale_id, action, actor_id, actor_name)
    VALUES (new_sale_id, 'sale_completed', actor.id, actor.name);
  END IF;
  RETURN public._sale_result(new_sale_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_draft_sale_transaction(
  p_sale_id UUID,
  p_sale_date DATE,
  p_customer_id UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_address TEXT,
  p_discount NUMERIC,
  p_payment_type TEXT,
  p_document_type TEXT,
  p_amount_paid NUMERIC,
  p_status TEXT,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor RECORD;
  sale_row RECORD;
  customer_row RECORD;
  total_value NUMERIC(10,2);
  discount_value NUMERIC(10,2) := ROUND(COALESCE(p_discount, 0), 2);
  net_value NUMERIC(10,2);
  paid_value NUMERIC(10,2) := ROUND(COALESCE(p_amount_paid, 0), 2);
  customer_name_value TEXT := NULLIF(BTRIM(p_customer_name), '');
  customer_phone_value TEXT := NULLIF(BTRIM(p_customer_phone), '');
  customer_address_value TEXT := NULLIF(BTRIM(p_customer_address), '');
BEGIN
  SELECT id, name INTO actor FROM public.profiles WHERE id = auth.uid() AND is_active = TRUE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ACTIVE_USER_REQUIRED'; END IF;
  SELECT * INTO sale_row FROM public.sales WHERE id = p_sale_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SALE_NOT_DRAFT'; END IF;
  IF sale_row.status <> 'draft' THEN RAISE EXCEPTION 'SALE_NOT_DRAFT'; END IF;
  IF p_status NOT IN ('draft', 'completed') THEN RAISE EXCEPTION 'INVALID_SALE_STATUS'; END IF;
  IF p_payment_type NOT IN ('cash', 'credit') THEN RAISE EXCEPTION 'INVALID_PAYMENT_TYPE'; END IF;
  IF NOT ((p_payment_type = 'credit' AND p_document_type = 'invoice') OR
          (p_payment_type = 'cash' AND p_document_type IN ('sales_slip', 'company_receipt'))) THEN
    RAISE EXCEPTION 'INVALID_DOCUMENT_TYPE';
  END IF;

  IF p_customer_id IS NOT NULL THEN
    SELECT *, COALESCE(NULLIF(BTRIM(full_name), ''), NULLIF(BTRIM(company_name), '')) AS display_name
      INTO customer_row FROM public.customers WHERE id = p_customer_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'CUSTOMER_NOT_FOUND'; END IF;
    customer_name_value := customer_row.display_name;
    customer_phone_value := customer_row.phone;
    customer_address_value := customer_row.address;
  END IF;
  IF p_document_type IN ('invoice', 'company_receipt') AND customer_name_value IS NULL THEN
    RAISE EXCEPTION 'CUSTOMER_NAME_REQUIRED';
  END IF;

  total_value := public._replace_checkout_items(p_sale_id, p_items);
  IF discount_value < 0 OR discount_value > total_value THEN RAISE EXCEPTION 'INVALID_DISCOUNT'; END IF;
  net_value := total_value - discount_value;
  IF p_status = 'completed' AND p_payment_type = 'cash' AND paid_value < net_value THEN
    RAISE EXCEPTION 'INSUFFICIENT_PAYMENT';
  END IF;

  UPDATE public.sales SET
    sale_date = COALESCE(p_sale_date, CURRENT_DATE), customer_id = p_customer_id,
    customer_name = customer_name_value, customer_phone = customer_phone_value,
    customer_address = customer_address_value, total_amount = total_value,
    discount = discount_value, net_amount = net_value, payment_type = p_payment_type,
    document_type = p_document_type, status = p_status,
    payment_status = CASE WHEN p_status = 'completed' AND p_payment_type = 'cash' THEN 'paid' ELSE 'unpaid' END,
    paid_at = CASE WHEN p_status = 'completed' AND p_payment_type = 'cash' THEN NOW() ELSE NULL END,
    paid_by = CASE WHEN p_status = 'completed' AND p_payment_type = 'cash' THEN actor.id ELSE NULL END,
    paid_by_name = CASE WHEN p_status = 'completed' AND p_payment_type = 'cash' THEN actor.name ELSE NULL END,
    amount_paid = CASE WHEN p_status = 'completed' AND p_payment_type = 'cash' THEN paid_value ELSE 0 END,
    change_amount = CASE WHEN p_status = 'completed' AND p_payment_type = 'cash' THEN paid_value - net_value ELSE 0 END
  WHERE id = p_sale_id;

  IF p_status = 'completed' THEN
    INSERT INTO public.sale_audit_logs(sale_id, action, actor_id, actor_name)
    VALUES (p_sale_id, 'sale_completed', actor.id, actor.name);
  END IF;
  RETURN public._sale_result(p_sale_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_invoice_payment_status_transaction(
  p_sale_id UUID,
  p_payment_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE actor RECORD; sale_row RECORD;
BEGIN
  SELECT id, name INTO actor FROM public.profiles WHERE id = auth.uid() AND is_active = TRUE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ACTIVE_USER_REQUIRED'; END IF;
  IF p_payment_status NOT IN ('paid', 'unpaid') THEN RAISE EXCEPTION 'INVALID_PAYMENT_STATUS'; END IF;
  SELECT * INTO sale_row FROM public.sales WHERE id = p_sale_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'COMPLETED_INVOICE_NOT_FOUND'; END IF;
  IF sale_row.status <> 'completed' OR sale_row.document_type <> 'invoice' THEN
    RAISE EXCEPTION 'COMPLETED_INVOICE_NOT_FOUND';
  END IF;
  IF sale_row.payment_status = p_payment_status THEN RETURN public._sale_result(p_sale_id); END IF;

  UPDATE public.sales SET
    payment_status = p_payment_status,
    paid_at = CASE WHEN p_payment_status = 'paid' THEN NOW() ELSE NULL END,
    paid_by = CASE WHEN p_payment_status = 'paid' THEN actor.id ELSE NULL END,
    paid_by_name = CASE WHEN p_payment_status = 'paid' THEN actor.name ELSE NULL END,
    amount_paid = CASE WHEN p_payment_status = 'paid' THEN net_amount ELSE 0 END,
    change_amount = 0
  WHERE id = p_sale_id;
  INSERT INTO public.sale_audit_logs(sale_id, action, actor_id, actor_name)
  VALUES (p_sale_id, CASE WHEN p_payment_status = 'paid' THEN 'payment_marked_paid' ELSE 'payment_marked_unpaid' END, actor.id, actor.name);
  RETURN public._sale_result(p_sale_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.void_sale_transaction(p_sale_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE actor RECORD; sale_row RECORD; reason_value TEXT := NULLIF(BTRIM(p_reason), '');
BEGIN
  SELECT id, name, role INTO actor FROM public.profiles WHERE id = auth.uid() AND is_active = TRUE;
  IF NOT FOUND OR actor.role NOT IN ('admin', 'shop_owner') THEN RAISE EXCEPTION 'MANAGER_REQUIRED'; END IF;
  IF reason_value IS NULL OR CHAR_LENGTH(reason_value) < 3 OR CHAR_LENGTH(reason_value) > 500 THEN
    RAISE EXCEPTION 'VOID_REASON_REQUIRED';
  END IF;
  SELECT * INTO sale_row FROM public.sales WHERE id = p_sale_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'COMPLETED_SALE_NOT_FOUND'; END IF;
  IF sale_row.status <> 'completed' THEN RAISE EXCEPTION 'COMPLETED_SALE_NOT_FOUND'; END IF;

  UPDATE public.sales SET status = 'voided', voided_at = NOW(), voided_by = actor.id,
    voided_by_name = actor.name, void_reason = reason_value
  WHERE id = p_sale_id;
  INSERT INTO public.sale_audit_logs(sale_id, action, actor_id, actor_name, reason)
  VALUES (p_sale_id, 'sale_voided', actor.id, actor.name, reason_value);
  RETURN public._sale_result(p_sale_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_draft_sale_transaction(p_sale_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE actor RECORD; sale_row RECORD;
BEGIN
  SELECT id, role INTO actor FROM public.profiles WHERE id = auth.uid() AND is_active = TRUE;
  IF NOT FOUND OR actor.role NOT IN ('admin', 'shop_owner') THEN RAISE EXCEPTION 'MANAGER_REQUIRED'; END IF;
  SELECT id, status INTO sale_row FROM public.sales WHERE id = p_sale_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SALE_NOT_FOUND'; END IF;
  IF sale_row.status <> 'draft' THEN RAISE EXCEPTION 'COMPLETED_SALE_CANNOT_BE_DELETED'; END IF;
  DELETE FROM public.sales WHERE id = p_sale_id;
END;
$$;

-- All sale mutations must pass through the functions above. This prevents a
-- browser client from bypassing total calculation or changing a completed bill.
REVOKE INSERT, UPDATE, DELETE ON public.sales, public.sale_items FROM anon, authenticated;

REVOKE ALL ON FUNCTION public._sale_result(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._replace_checkout_items(UUID, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_sale_transaction(UUID, DATE, UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, NUMERIC, TEXT, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_draft_sale_transaction(UUID, DATE, UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, NUMERIC, TEXT, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_invoice_payment_status_transaction(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.void_sale_transaction(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_draft_sale_transaction(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_sale_transaction(UUID, DATE, UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, NUMERIC, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_draft_sale_transaction(UUID, DATE, UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, NUMERIC, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_invoice_payment_status_transaction(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.void_sale_transaction(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_draft_sale_transaction(UUID) TO authenticated;

-- Make newly created RPC signatures available to PostgREST immediately.
NOTIFY pgrst, 'reload schema';

COMMIT;
