-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CUSTOMERS TABLE
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- QUOTATIONS TABLE
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

-- INVOICES TABLE
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    share_key TEXT UNIQUE NOT NULL,
    invoice_number TEXT NOT NULL,
    date DATE NOT NULL,
    due_date DATE,
    customer_id UUID, -- Optional: links to a customer record
    amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Draft',
    items JSONB DEFAULT '[]'::jsonb,
    reminder_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR AUTHENTICATED USERS (Full Access to own data)
CREATE POLICY "Users can manage their own customers" ON customers
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own quotations" ON quotations
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own invoices" ON invoices
    FOR ALL USING (auth.uid() = user_id);

-- PUBLIC POLICIES FOR SHARED LINKS (Read Access by share_key)
CREATE POLICY "Public can view quotations by share_key" ON quotations
    FOR SELECT USING (true); -- We use the unguessable share_key for security

CREATE POLICY "Public can view invoices by share_key" ON invoices
    FOR SELECT USING (true);
