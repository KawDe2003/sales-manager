-- MASTER SQL SCHEMA FOR SALES MANAGER
-- RUN THIS IN SUPABASE SQL EDITOR

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    gym_name TEXT NOT NULL,
    name TEXT,
    email TEXT,
    phone TEXT,
    dob DATE,
    purchase_date DATE,
    renewal_date DATE,
    annual_fee NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Active',
    notes JSONB DEFAULT '[]'::jsonb,
    last_reminder_days_diff INTEGER,
    last_birthday_sent_year INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. QUOTATIONS TABLE
CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    share_key TEXT UNIQUE NOT NULL,
    quote_number TEXT NOT NULL,
    date DATE NOT NULL,
    prospect_name TEXT,
    prospect_phone TEXT,
    amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Pending',
    items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. INVOICES TABLE
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    share_key TEXT UNIQUE NOT NULL,
    invoice_number TEXT NOT NULL,
    date DATE NOT NULL,
    due_date DATE,
    customer_id UUID,
    amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Draft',
    items JSONB DEFAULT '[]'::jsonb,
    prospect_name TEXT,
    reminder_sent BOOLEAN DEFAULT false,
    installment_plan JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. INVENTORY TABLE
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    item_type TEXT,
    price NUMERIC DEFAULT 0,
    stock INTEGER DEFAULT 0,
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
    amount NUMERIC DEFAULT 0,
    payment_type TEXT,
    payment_timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
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
    location TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE fixed_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR OWNERS (Full Access)
CREATE POLICY "Manage own customers" ON customers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Manage own quotations" ON quotations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Manage own invoices" ON invoices FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Manage own inventory" ON inventory FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Manage own leads" ON leads FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Manage own expenses" ON expenses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Manage own payments" ON payments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Manage own activity_logs" ON activity_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Manage own user_profiles" ON user_profiles FOR ALL USING (auth.uid() = user_id);

-- PUBLIC READ ACCESS FOR SHARED DOCUMENTS & PORTAL
CREATE POLICY "View quotations by share_key" ON quotations FOR SELECT USING (true);
CREATE POLICY "View invoices by share_key" ON invoices FOR SELECT USING (true);
CREATE POLICY "View customers for portal" ON customers FOR SELECT USING (true);
CREATE POLICY "View payments for portal" ON payments FOR SELECT USING (true);
CREATE POLICY "Insert payments from portal" ON payments FOR INSERT WITH CHECK (true);
