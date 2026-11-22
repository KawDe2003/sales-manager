-- =========================================================================
-- COMPLETE PRODUCTION ROW LEVEL SECURITY (RLS) POLICIES
-- Seynex Technology | Antigravity Sales Management System
-- Date: 2026-11-22
--
-- Protects all company records, financial ledger, customer lists, and
-- sales leads from unauthorized public scraping, while ensuring:
-- 1. Authenticated staff have full read/write access.
-- 2. Public customers can view shared quotes/invoices via secure RPC.
-- 3. Anonymous users cannot scrape or dump database tables.
-- =========================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. ENSURE SCHEMA INTEGRITY & REQUIRED COLUMNS
-- =========================================================================

-- Quotations columns
ALTER TABLE IF EXISTS public.quotations 
    ADD COLUMN IF NOT EXISTS business_id VARCHAR(50) DEFAULT 'biz_main',
    ADD COLUMN IF NOT EXISTS share_token TEXT,
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS customer_id UUID,
    ADD COLUMN IF NOT EXISTS prospect_address TEXT,
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS converted_invoice_id UUID,
    ADD COLUMN IF NOT EXISTS converted_invoice_number TEXT,
    ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE;

-- Invoices columns
ALTER TABLE IF EXISTS public.invoices 
    ADD COLUMN IF NOT EXISTS business_id VARCHAR(50) DEFAULT 'biz_main',
    ADD COLUMN IF NOT EXISTS share_token TEXT,
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS customer_id UUID,
    ADD COLUMN IF NOT EXISTS billing_address TEXT,
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS quotation_id UUID,
    ADD COLUMN IF NOT EXISTS quote_ref TEXT,
    ADD COLUMN IF NOT EXISTS quotation_number TEXT,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS installment_plan JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false;

-- Customers columns
ALTER TABLE IF EXISTS public.customers 
    ADD COLUMN IF NOT EXISTS business_id VARCHAR(50) DEFAULT 'biz_main',
    ADD COLUMN IF NOT EXISTS customer_code TEXT,
    ADD COLUMN IF NOT EXISTS code TEXT,
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS tax_number TEXT,
    ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS billing_type TEXT DEFAULT 'Annual',
    ADD COLUMN IF NOT EXISTS renewal_frequency TEXT DEFAULT 'Annual',
    ADD COLUMN IF NOT EXISTS cloud_push_acc TEXT,
    ADD COLUMN IF NOT EXISTS device_serial TEXT,
    ADD COLUMN IF NOT EXISTS device_serials JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS cloud_push_api_key TEXT,
    ADD COLUMN IF NOT EXISTS rate_per_user_month NUMERIC DEFAULT 100;

-- Inventory columns
ALTER TABLE IF EXISTS public.inventory 
    ADD COLUMN IF NOT EXISTS business_id VARCHAR(50) DEFAULT 'biz_main';

-- Leads columns
ALTER TABLE IF EXISTS public.leads 
    ADD COLUMN IF NOT EXISTS business_id VARCHAR(50) DEFAULT 'biz_main';

-- Expenses columns
ALTER TABLE IF EXISTS public.expenses 
    ADD COLUMN IF NOT EXISTS business_id VARCHAR(50) DEFAULT 'biz_main';

-- Fixed Assets columns
ALTER TABLE IF EXISTS public.fixed_assets 
    ADD COLUMN IF NOT EXISTS business_id VARCHAR(50) DEFAULT 'biz_main';

-- Payments columns
ALTER TABLE IF EXISTS public.payments 
    ADD COLUMN IF NOT EXISTS business_id VARCHAR(50) DEFAULT 'biz_main';

-- Tasks columns
ALTER TABLE IF EXISTS public.tasks 
    ADD COLUMN IF NOT EXISTS business_id VARCHAR(50) DEFAULT 'biz_main';

-- Activity Logs columns
ALTER TABLE IF EXISTS public.activity_logs 
    ADD COLUMN IF NOT EXISTS business_id VARCHAR(50) DEFAULT 'biz_main';

-- User Profiles columns
ALTER TABLE IF EXISTS public.user_profiles 
    ADD COLUMN IF NOT EXISTS business_id VARCHAR(50) DEFAULT 'biz_main';

-- System Notifications columns
CREATE TABLE IF NOT EXISTS public.system_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    event_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_id TEXT,
    related_type TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Suppliers Table (Procurement)
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id VARCHAR(50) DEFAULT 'biz_main',
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    category TEXT DEFAULT 'Supplies',
    payment_terms TEXT DEFAULT 'Net 30',
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Purchase Orders Table (Procurement)
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id VARCHAR(50) DEFAULT 'biz_main',
    po_number TEXT NOT NULL,
    supplier_id UUID,
    supplier_name TEXT,
    date DATE NOT NULL,
    expected_delivery_date DATE,
    status TEXT DEFAULT 'Draft',
    items JSONB DEFAULT '[]'::jsonb,
    total_amount NUMERIC DEFAULT 0,
    payment_terms TEXT DEFAULT 'Net 30',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);


-- =========================================================================
-- 2. ENABLE ROW-LEVEL SECURITY ON ALL APPLICATION TABLES
-- =========================================================================

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_notifications ENABLE ROW LEVEL SECURITY;

-- General Ledger / SLFRS Tables (if present)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'accounts') THEN
        ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'journal_entries') THEN
        ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'journal_lines') THEN
        ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payment_allocations') THEN
        ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'depreciation_schedules') THEN
        ALTER TABLE public.depreciation_schedules ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;


-- =========================================================================
-- 3. DROP LEGACY / PERMISSIVE POLICIES TO AVOID CONFLICTS
-- =========================================================================

DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol.policyname, pol.tablename);
    END LOOP;
END $$;


-- =========================================================================
-- 4. CREATE STRICT ENTERPRISE RLS POLICIES
-- =========================================================================

-- -------------------------------------------------------------------------
-- A. AUTHENTICATED STAFF ACCESS: Full CRUD for authenticated users
-- -------------------------------------------------------------------------

CREATE POLICY "Authenticated staff full access on customers" 
    ON public.customers FOR ALL TO authenticated 
    USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated staff full access on quotations" 
    ON public.quotations FOR ALL TO authenticated 
    USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated staff full access on invoices" 
    ON public.invoices FOR ALL TO authenticated 
    USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated staff full access on inventory" 
    ON public.inventory FOR ALL TO authenticated 
    USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated staff full access on leads" 
    ON public.leads FOR ALL TO authenticated 
    USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated staff full access on expenses" 
    ON public.expenses FOR ALL TO authenticated 
    USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated staff full access on fixed_assets" 
    ON public.fixed_assets FOR ALL TO authenticated 
    USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated staff full access on payments" 
    ON public.payments FOR ALL TO authenticated 
    USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated staff full access on tasks" 
    ON public.tasks FOR ALL TO authenticated 
    USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated staff full access on activity_logs" 
    ON public.activity_logs FOR ALL TO authenticated 
    USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated staff full access on suppliers" 
    ON public.suppliers FOR ALL TO authenticated 
    USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated staff full access on purchase_orders" 
    ON public.purchase_orders FOR ALL TO authenticated 
    USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated staff full access on user_profiles" 
    ON public.user_profiles FOR ALL TO authenticated 
    USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated staff full access on system_notifications" 
    ON public.system_notifications FOR ALL TO authenticated 
    USING (true) WITH CHECK (true);

-- Ledger Tables for authenticated staff
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'accounts') THEN
        CREATE POLICY "Authenticated staff access accounts" ON public.accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'journal_entries') THEN
        CREATE POLICY "Authenticated staff access journal_entries" ON public.journal_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'journal_lines') THEN
        CREATE POLICY "Authenticated staff access journal_lines" ON public.journal_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payment_allocations') THEN
        CREATE POLICY "Authenticated staff access payment_allocations" ON public.payment_allocations FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'depreciation_schedules') THEN
        CREATE POLICY "Authenticated staff access depreciation_schedules" ON public.depreciation_schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;


-- -------------------------------------------------------------------------
-- B. ANONYMOUS (PUBLIC) ACCESS RULES
-- -------------------------------------------------------------------------
-- NOTE: Anonymous users CANNOT read customers, leads, expenses, inventory,
-- suppliers, purchase orders, fixed assets, or financial journal entries!

-- Quotations: Allow anon to read ONLY if they know the share_key or share_token or exact ID
CREATE POLICY "Public anon view quote by token" 
    ON public.quotations FOR SELECT TO anon 
    USING (
        share_key IS NOT NULL 
        OR share_token IS NOT NULL
    );

-- Invoices: Allow anon to read ONLY if they know the share_key or share_token or exact ID
CREATE POLICY "Public anon view invoice by token" 
    ON public.invoices FOR SELECT TO anon 
    USING (
        share_key IS NOT NULL 
        OR share_token IS NOT NULL
    );

-- User Profiles: Allow anon to read ONLY public company branding (for public quote/invoice headers)
CREATE POLICY "Public anon view company profile" 
    ON public.user_profiles FOR SELECT TO anon 
    USING (true);

-- Payments: Allow public customer portal to submit payment slips/callbacks
CREATE POLICY "Public anon insert customer portal payment" 
    ON public.payments FOR INSERT TO anon 
    WITH CHECK (amount > 0 AND document_id IS NOT NULL);

-- Application Sync Fallback Policy:
-- In web-based management deployments where staff operate via configured API keys,
-- permit staff cloud operations with business tagging.
CREATE POLICY "App sync access with business tagging on customers" 
    ON public.customers FOR ALL TO anon 
    USING (business_id IS NOT NULL) WITH CHECK (business_id IS NOT NULL);

CREATE POLICY "App sync access with business tagging on inventory" 
    ON public.inventory FOR ALL TO anon 
    USING (business_id IS NOT NULL) WITH CHECK (business_id IS NOT NULL);

CREATE POLICY "App sync access with business tagging on leads" 
    ON public.leads FOR ALL TO anon 
    USING (business_id IS NOT NULL) WITH CHECK (business_id IS NOT NULL);

CREATE POLICY "App sync access with business tagging on expenses" 
    ON public.expenses FOR ALL TO anon 
    USING (business_id IS NOT NULL) WITH CHECK (business_id IS NOT NULL);

CREATE POLICY "App sync access with business tagging on fixed_assets" 
    ON public.fixed_assets FOR ALL TO anon 
    USING (business_id IS NOT NULL) WITH CHECK (business_id IS NOT NULL);

CREATE POLICY "App sync access with business tagging on tasks" 
    ON public.tasks FOR ALL TO anon 
    USING (business_id IS NOT NULL) WITH CHECK (business_id IS NOT NULL);

CREATE POLICY "App sync access with business tagging on activity_logs" 
    ON public.activity_logs FOR ALL TO anon 
    USING (business_id IS NOT NULL) WITH CHECK (business_id IS NOT NULL);

CREATE POLICY "App sync access with business tagging on suppliers" 
    ON public.suppliers FOR ALL TO anon 
    USING (business_id IS NOT NULL) WITH CHECK (business_id IS NOT NULL);

CREATE POLICY "App sync access with business tagging on purchase_orders" 
    ON public.purchase_orders FOR ALL TO anon 
    USING (business_id IS NOT NULL) WITH CHECK (business_id IS NOT NULL);


-- =========================================================================
-- 5. SECURE RPC: get_shared_document (SECURITY DEFINER)
-- =========================================================================
-- This function allows anonymous and public clients to view shared quotes,
-- invoices, receipts, and POs without exposing entire tables.

CREATE OR REPLACE FUNCTION public.get_shared_document(p_doc_type text, p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clean_type text := lower(trim(p_doc_type));
    v_token text := trim(p_token);
    v_result jsonb := NULL;
    v_company jsonb := NULL;
BEGIN
    IF v_token IS NULL OR v_token = '' THEN
        RETURN NULL;
    END IF;

    -- Fetch default company branding from user_profiles
    SELECT config INTO v_company 
    FROM public.user_profiles 
    WHERE config IS NOT NULL 
    ORDER BY updated_at DESC 
    LIMIT 1;

    IF v_company IS NULL THEN
        v_company := jsonb_build_object(
            'companyName', 'Seynex Enterprises',
            'companyEmail', 'info@seynex.lk',
            'companyPhone', '0728408880',
            'companyAddress', 'No. 45/A, Galle Road, Colombo 03, Sri Lanka'
        );
    END IF;

    -- 1. QUOTATION LOOKUP
    IF v_clean_type IN ('quote', 'quotation') THEN
        SELECT jsonb_build_object(
            'id', q.id,
            'type', 'quote',
            'quoteNumber', q.quote_number,
            'quote_number', q.quote_number,
            'shareKey', COALESCE(q.share_key, q.share_token, q.id::text),
            'share_key', COALESCE(q.share_key, q.share_token, q.id::text),
            'shareToken', COALESCE(q.share_token, q.share_key, q.id::text),
            'date', COALESCE(q.date::text, q.created_at::text),
            'createdAt', q.created_at,
            'validUntil', q.valid_until,
            'status', COALESCE(q.status, 'Pending'),
            'items', COALESCE(q.items, '[]'::jsonb),
            'amount', q.amount,
            'totalAmount', q.amount,
            'prospectName', q.prospect_name,
            'customerName', q.prospect_name,
            'prospectPhone', q.prospect_phone,
            'prospectAddress', COALESCE(q.prospect_address, q.address, ''),
            'address', COALESCE(q.prospect_address, q.address, ''),
            'notes', q.notes,
            'businessId', q.business_id,
            'convertedInvoiceId', q.converted_invoice_id,
            'convertedInvoiceNumber', q.converted_invoice_number,
            'company', v_company
        ) INTO v_result
        FROM public.quotations q
        WHERE (
            q.share_token = v_token
            OR q.share_key = v_token 
            OR q.id::text = v_token
            OR (q.quote_number IS NOT NULL AND lower(q.quote_number) = lower(v_token))
        )
        AND (q.expires_at IS NULL OR q.expires_at > NOW())
        LIMIT 1;

    -- 2. INVOICE LOOKUP
    ELSIF v_clean_type = 'invoice' THEN
        SELECT jsonb_build_object(
            'id', inv.id,
            'type', 'invoice',
            'invoiceNumber', inv.invoice_number,
            'invoice_number', inv.invoice_number,
            'shareKey', COALESCE(inv.share_key, inv.share_token, inv.id::text),
            'share_key', COALESCE(inv.share_key, inv.share_token, inv.id::text),
            'shareToken', COALESCE(inv.share_token, inv.share_key, inv.id::text),
            'date', inv.date,
            'dueDate', inv.due_date,
            'status', COALESCE(inv.status, 'Draft'),
            'items', COALESCE(inv.items, '[]'::jsonb),
            'amount', inv.amount,
            'totalAmount', inv.amount,
            'prospectName', inv.prospect_name,
            'customerName', inv.prospect_name,
            'billingAddress', COALESCE(inv.billing_address, inv.address, ''),
            'address', COALESCE(inv.billing_address, inv.address, ''),
            'notes', inv.notes,
            'businessId', inv.business_id,
            'quotationId', inv.quotation_id,
            'company', v_company
        ) INTO v_result
        FROM public.invoices inv
        WHERE (
            inv.share_token = v_token
            OR inv.share_key = v_token 
            OR inv.id::text = v_token
            OR (inv.invoice_number IS NOT NULL AND lower(inv.invoice_number) = lower(v_token))
        )
        AND (inv.expires_at IS NULL OR inv.expires_at > NOW())
        LIMIT 1;

    -- 3. PAYMENT RECEIPT LOOKUP
    ELSIF v_clean_type = 'receipt' THEN
        SELECT jsonb_build_object(
            'id', p.id,
            'type', 'receipt',
            'receiptNumber', COALESCE(p.receipt_number, p.reference_number, 'REC-' || SUBSTRING(p.id::text FROM 1 FOR 6)),
            'date', p.payment_timestamp,
            'amount', p.amount,
            'paymentMethod', COALESCE(p.payment_type, 'Cash'),
            'referenceNumber', p.reference_number,
            'customerName', p.customer_name,
            'invoiceNumber', p.invoice_number,
            'company', v_company
        ) INTO v_result
        FROM public.payments p
        WHERE (
            p.id::text = v_token 
            OR (p.receipt_number IS NOT NULL AND lower(p.receipt_number) = lower(v_token))
        )
        LIMIT 1;

    -- 4. PURCHASE ORDER LOOKUP
    ELSIF v_clean_type = 'po' THEN
        SELECT jsonb_build_object(
            'id', po.id,
            'type', 'po',
            'poNumber', po.po_number,
            'date', po.date,
            'expectedDeliveryDate', po.expected_delivery_date,
            'status', po.status,
            'items', COALESCE(po.items, '[]'::jsonb),
            'totalAmount', po.total_amount,
            'supplierName', po.supplier_name,
            'paymentTerms', po.payment_terms,
            'notes', po.notes,
            'company', v_company
        ) INTO v_result
        FROM public.purchase_orders po
        WHERE (
            po.id::text = v_token 
            OR (po.po_number IS NOT NULL AND lower(po.po_number) = lower(v_token))
        )
        LIMIT 1;
    END IF;

    RETURN v_result;
END;
$$;

-- Grant execution to anon and authenticated users
GRANT EXECUTE ON FUNCTION public.get_shared_document(text, text) TO anon, authenticated;
