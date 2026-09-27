-- ADD QUOTATION REFERENCE COLUMNS TO INVOICES TABLE
-- Allows direct tracking and display of original Quotation number (Ref: QT-XXXX)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS quote_ref TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS quotation_number TEXT;
