-- Add a separate payment lifecycle for invoices.
-- Run this script in the Supabase SQL Editor before using invoice history.

ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid';

ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sales_payment_status_check'
      AND conrelid = 'public.sales'::regclass
  ) THEN
    ALTER TABLE public.sales
      ADD CONSTRAINT sales_payment_status_check
      CHECK (payment_status IN ('unpaid', 'paid'));
  END IF;
END
$$;

-- Cash transactions are already settled. Existing credit invoices remain unpaid
-- until a user explicitly confirms receipt of payment from the history screen.
UPDATE public.sales
SET
  payment_status = CASE
    WHEN status = 'completed' AND payment_type = 'cash' THEN 'paid'
    ELSE 'unpaid'
  END,
  paid_at = CASE
    WHEN status = 'completed' AND payment_type = 'cash'
      THEN COALESCE(paid_at, updated_at, created_at)
    ELSE NULL
  END;

CREATE INDEX IF NOT EXISTS idx_sales_document_payment_status
ON public.sales(document_type, payment_status);

COMMENT ON COLUMN public.sales.payment_status IS
'Payment settlement status, separate from the sale lifecycle status';

COMMENT ON COLUMN public.sales.paid_at IS
'Date and time when the invoice was confirmed as fully paid';
