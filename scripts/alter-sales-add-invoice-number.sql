-- Add permanent daily invoice numbers in INV-DDMMYYYYXXXX format.
-- Example: the first invoice on 5 October 2026 is INV-051020260001.
-- Run this script in the Supabase SQL Editor.

ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS document_number VARCHAR(30);

CREATE TABLE IF NOT EXISTS public.document_sequences (
  document_type VARCHAR(30) NOT NULL,
  sequence_date DATE NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (document_type, sequence_date),
  CONSTRAINT document_sequences_last_number_check CHECK (last_number >= 0)
);

-- Backfill completed historical invoices deterministically by creation order.
WITH ranked_invoices AS (
  SELECT
    id,
    sale_date::date AS invoice_date,
    ROW_NUMBER() OVER (
      PARTITION BY sale_date::date
      ORDER BY created_at, id
    ) AS daily_number
  FROM public.sales
  WHERE document_type = 'invoice'
    AND status = 'completed'
)
UPDATE public.sales AS sale
SET document_number =
  'INV-'
  || TO_CHAR(ranked.invoice_date, 'DDMMYYYY')
  || LPAD(ranked.daily_number::text, 4, '0')
FROM ranked_invoices AS ranked
WHERE sale.id = ranked.id
  AND sale.document_number IS NULL;

-- Continue future sequences after the historical invoice count for each date.
INSERT INTO public.document_sequences (document_type, sequence_date, last_number)
SELECT
  'invoice',
  sale_date::date,
  COUNT(*)::integer
FROM public.sales
WHERE document_type = 'invoice'
  AND status = 'completed'
GROUP BY sale_date::date
ON CONFLICT (document_type, sequence_date)
DO UPDATE SET last_number = GREATEST(
  public.document_sequences.last_number,
  EXCLUDED.last_number
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_document_number_unique
ON public.sales(document_number)
WHERE document_number IS NOT NULL;

CREATE OR REPLACE FUNCTION public.assign_invoice_document_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invoice_date DATE;
  next_number INTEGER;
BEGIN
  IF NEW.document_type <> 'invoice'
    OR NEW.status <> 'completed'
    OR NULLIF(BTRIM(NEW.document_number), '') IS NOT NULL THEN
    RETURN NEW;
  END IF;

  invoice_date := NEW.sale_date::date;

  INSERT INTO public.document_sequences (
    document_type,
    sequence_date,
    last_number
  )
  VALUES ('invoice', invoice_date, 1)
  ON CONFLICT (document_type, sequence_date)
  DO UPDATE SET last_number = public.document_sequences.last_number + 1
  RETURNING last_number INTO next_number;

  IF next_number > 9999 THEN
    RAISE EXCEPTION 'Daily invoice limit exceeded for %', invoice_date;
  END IF;

  NEW.document_number :=
    'INV-'
    || TO_CHAR(invoice_date, 'DDMMYYYY')
    || LPAD(next_number::text, 4, '0');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_invoice_document_number ON public.sales;
CREATE TRIGGER assign_invoice_document_number
  BEFORE INSERT OR UPDATE OF status, document_type, sale_date
  ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_invoice_document_number();

ALTER TABLE public.document_sequences ENABLE ROW LEVEL SECURITY;

COMMENT ON COLUMN public.sales.document_number IS
'Permanent invoice number in INV-DDMMYYYYXXXX format';

COMMENT ON TABLE public.document_sequences IS
'Atomic per-day counters used to assign document numbers';
