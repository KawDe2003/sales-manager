-- MASTER SQL SCHEMA FOR SALES MANAGER
-- RUN THIS IN SUPABASE SQL EDITOR

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    customer_code TEXT,
    gym_name TEXT NOT NULL,
    name TEXT,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    tax_id TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    lead_source TEXT DEFAULT 'Walk-in',
    purchase_date DATE,
    renewal_date DATE,
    renewal_frequency TEXT DEFAULT 'Annual',
    last_renewal_date DATE,
    renewal_status TEXT DEFAULT 'Active',
    status TEXT DEFAULT 'Active',
    notes JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. QUOTATIONS TABLE
CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    customer_id UUID,
    share_key TEXT UNIQUE NOT NULL,
    quote_number TEXT NOT NULL,
    date DATE NOT NULL,
    valid_until DATE,
    prospect_name TEXT,
    prospect_phone TEXT,
    amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Pending',
    items JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    terms TEXT,
    counter_offers JSONB DEFAULT '[]'::jsonb,
    rejection_reason TEXT,
    created_by TEXT DEFAULT 'Staff',
    version INTEGER DEFAULT 1,
    converted_invoice_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. INVOICES TABLE
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    quotation_id UUID,
    share_key TEXT UNIQUE NOT NULL,
    invoice_number TEXT NOT NULL,
    date DATE NOT NULL,
    due_date DATE,
    customer_id UUID,
    amount NUMERIC DEFAULT 0,
    subtotal NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    tax NUMERIC DEFAULT 0,
    amount_paid NUMERIC DEFAULT 0,
    outstanding_balance NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Draft',
    payment_terms TEXT DEFAULT 'Net 14',
    items JSONB DEFAULT '[]'::jsonb,
    prospect_name TEXT,
    notes TEXT,
    terms TEXT,
    created_by TEXT DEFAULT 'Staff',
    is_renewal BOOLEAN DEFAULT false,
    renewal_source_invoice_id UUID,
    reminder_sent BOOLEAN DEFAULT false,
    installment_plan JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. INVENTORY / CATALOG TABLE
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    item_type TEXT,
    price NUMERIC DEFAULT 0,
    cost_price NUMERIC DEFAULT 0,
    stock INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 5,
    tax_rate NUMERIC DEFAULT 0,
    unit TEXT DEFAULT 'package',
    status TEXT DEFAULT 'Active',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. LEADS TABLE
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    gym_name TEXT NOT NULL,
    prospect_name TEXT,
    address TEXT,
    phone TEXT,
    status TEXT DEFAULT 'New',
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    category TEXT,
    amount NUMERIC DEFAULT 0,
    date DATE DEFAULT CURRENT_DATE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    customer_id UUID,
    document_id UUID,
    receipt_number TEXT,
    invoice_number TEXT,
    customer_name TEXT,
    amount NUMERIC DEFAULT 0,
    payment_type TEXT,
    payment_method TEXT DEFAULT 'Bank Transfer',
    reference_number TEXT,
    notes TEXT,
    remaining_balance NUMERIC DEFAULT 0,
    recorded_by TEXT DEFAULT 'Staff',
    payment_timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. SYSTEM NOTIFICATIONS TABLE
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

-- 8. ACTIVITY LOGS TABLE
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    log_type TEXT,
    message TEXT,
    details TEXT,
    log_timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 9. USER PROFILES (CONFIG) TABLE
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    config JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- 9. FIXED ASSETS TABLE
CREATE TABLE IF NOT EXISTS fixed_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    asset_code TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'Gym Equipment',
    purchase_date DATE,
    purchase_cost NUMERIC DEFAULT 0,
    useful_life_years NUMERIC DEFAULT 5,
    salvage_value NUMERIC DEFAULT 0,
    depreciation_method TEXT DEFAULT 'Straight Line (SLM)',
    depreciation_rate NUMERIC DEFAULT 0,
    location TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE fixed_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- CLOUD SYNCHRONIZATION POLICIES (RUN THIS IN SUPABASE SQL EDITOR TO ENABLE CLOUD SYNC)
-- =========================================================================
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename IN ('customers', 'quotations', 'invoices', 'inventory', 'leads', 'expenses', 'payments', 'fixed_assets', 'tasks', 'activity_logs', 'user_profiles')
    LOOP
        EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY;', tbl);
    END LOOP;
END $$;

-- If you prefer keeping RLS enabled, alternative permissive policies:
-- CREATE POLICY "App sync all customers" ON customers FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "App sync all quotations" ON quotations FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "App sync all invoices" ON invoices FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "App sync all inventory" ON inventory FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "App sync all leads" ON leads FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "App sync all expenses" ON expenses FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "App sync all payments" ON payments FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "App sync all activity_logs" ON activity_logs FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "App sync all user_profiles" ON user_profiles FOR ALL USING (true) WITH CHECK (true);

-- 10. ACCOUNTS (CHART OF ACCOUNTS) TABLE
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- asset, liability, equity, revenue, expense
    statement_category TEXT,
    is_current BOOLEAN DEFAULT true,
    parent_id TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 11. JOURNAL ENTRIES TABLE
CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    date DATE NOT NULL,
    reference TEXT NOT NULL,
    description TEXT,
    created_by TEXT DEFAULT 'System',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 12. JOURNAL LINES TABLE
CREATE TABLE IF NOT EXISTS journal_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL,
    debit NUMERIC DEFAULT 0,
    credit NUMERIC DEFAULT 0,
    memo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manage own accounts" ON accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Manage own journal_entries" ON journal_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Manage own journal_lines" ON journal_lines FOR ALL USING (auth.uid() = user_id);

-- 13. BILL OF MATERIALS (BOM) TABLE
CREATE TABLE IF NOT EXISTS boms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    product_name TEXT NOT NULL,
    product_sku TEXT,
    output_unit TEXT DEFAULT 'Unit',
    batch_yield NUMERIC DEFAULT 1,
    material_cost_per_unit NUMERIC DEFAULT 0,
    labor_hours NUMERIC DEFAULT 0,
    labor_rate_per_hour NUMERIC DEFAULT 0,
    labor_cost NUMERIC DEFAULT 0,
    overhead_cost NUMERIC DEFAULT 0,
    total_cost_per_unit NUMERIC DEFAULT 0,
    suggested_retail_price NUMERIC DEFAULT 0,
    components JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 14. PRODUCTION ORDERS (MO) TABLE
CREATE TABLE IF NOT EXISTS production_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    order_number TEXT NOT NULL,
    bom_id TEXT,
    product_name TEXT NOT NULL,
    product_sku TEXT,
    quantity_to_produce NUMERIC NOT NULL DEFAULT 1,
    batch_number TEXT NOT NULL,
    start_date DATE,
    due_date DATE,
    status TEXT DEFAULT 'Planned', -- Planned, In Progress, Quality Check, Completed, Cancelled
    priority TEXT DEFAULT 'Normal', -- Normal, High, Urgent
    assigned_to TEXT,
    notes TEXT,
    unit_cost NUMERIC DEFAULT 0,
    total_batch_cost NUMERIC DEFAULT 0,
    components JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE boms ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manage own boms" ON boms FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Manage own production_orders" ON production_orders FOR ALL USING (auth.uid() = user_id);

