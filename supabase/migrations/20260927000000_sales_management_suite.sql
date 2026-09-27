-- =========================================================================
-- MASTER SQL SCHEMA & MIGRATION: SALES MANAGEMENT SUITE ENHANCEMENTS
-- Seynex Technology | Antigravity Sales Management System
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENHANCE CUSTOMERS TABLE
ALTER TABLE customers 
    ADD COLUMN IF NOT EXISTS customer_code TEXT,
    ADD COLUMN IF NOT EXISTS contact_person TEXT,
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS tax_id TEXT,
    ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS lead_source TEXT DEFAULT 'Walk-in',
    ADD COLUMN IF NOT EXISTS renewal_frequency TEXT DEFAULT 'Annual',
    ADD COLUMN IF NOT EXISTS last_renewal_date DATE,
    ADD COLUMN IF NOT EXISTS renewal_status TEXT DEFAULT 'Active';

-- 2. ENHANCE QUOTATIONS TABLE
ALTER TABLE quotations 
    ADD COLUMN IF NOT EXISTS customer_id UUID,
    ADD COLUMN IF NOT EXISTS valid_until DATE,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS terms TEXT,
    ADD COLUMN IF NOT EXISTS counter_offers JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT 'Staff',
    ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS converted_invoice_id UUID;

-- 3. ENHANCE INVOICES TABLE
ALTER TABLE invoices 
    ADD COLUMN IF NOT EXISTS quotation_id UUID,
    ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS discount NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS outstanding_balance NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'Net 14',
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS terms TEXT,
    ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT 'Staff',
    ADD COLUMN IF NOT EXISTS is_renewal BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS renewal_source_invoice_id UUID;

-- 4. ENHANCE PAYMENTS TABLE
ALTER TABLE payments 
    ADD COLUMN IF NOT EXISTS receipt_number TEXT,
    ADD COLUMN IF NOT EXISTS invoice_number TEXT,
    ADD COLUMN IF NOT EXISTS customer_name TEXT,
    ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Bank Transfer',
    ADD COLUMN IF NOT EXISTS reference_number TEXT,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS remaining_balance NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS recorded_by TEXT DEFAULT 'Staff';

-- 5. ENHANCE INVENTORY TABLE (CATALOG SUPPORT)
ALTER TABLE inventory 
    ADD COLUMN IF NOT EXISTS tax_rate NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'package',
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';

-- 6. SYSTEM NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS system_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    event_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_id TEXT,
    related_type TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Ensure RLS is configured or disabled for sync
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename IN ('customers', 'quotations', 'invoices', 'inventory', 'leads', 'expenses', 'payments', 'fixed_assets', 'system_notifications')
    LOOP
        EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY;', tbl);
    END LOOP;
END $$;
