-- Add document type for the three POS workflows:
-- cash + sales slip, credit + invoice, cash + company receipt.

ALTER TABLE sales
ADD COLUMN IF NOT EXISTS document_type VARCHAR(30) NOT NULL DEFAULT 'sales_slip';

UPDATE sales
SET document_type = 'invoice'
WHERE payment_type = 'credit';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sales_document_type_check'
      AND conrelid = 'sales'::regclass
  ) THEN
    ALTER TABLE sales
    ADD CONSTRAINT sales_document_type_check
    CHECK (document_type IN ('sales_slip', 'invoice', 'company_receipt'));
  END IF;
END $$;

COMMENT ON COLUMN sales.document_type IS
'sales_slip = cash store slip, invoice = credit invoice, company_receipt = formal receipt for cash payment';
