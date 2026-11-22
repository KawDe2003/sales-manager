-- Migration: Create team_members table for cloud-backed user accounts and cross-device authentication
-- Created: 2026-11-22

CREATE TABLE IF NOT EXISTS public.team_members (
    id TEXT PRIMARY KEY,
    business_id TEXT DEFAULT 'biz_main',
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'Sales Representative',
    department TEXT DEFAULT 'General',
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'Active',
    password TEXT NOT NULL,
    must_change_password BOOLEAN DEFAULT false,
    expiry_date TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Allow full access for anon and authenticated users
DROP POLICY IF EXISTS "Full access on team_members" ON public.team_members;
CREATE POLICY "Full access on team_members" ON public.team_members FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Seed initial default enterprise accounts
INSERT INTO public.team_members (id, business_id, name, email, role, department, status, password)
VALUES 
    ('76bb4580-2006-464f-aab8-64029dbe9540', 'biz_main', 'Seynex Administrator', 'admin@seynex.lk', 'Admin', 'Executive Management', 'Active', 'seynex2026'),
    ('e2a87062-8e1e-4509-91a5-e362fa91901a', 'biz_main', 'Seynex Sales Representative', 'sales@seynex.lk', 'Sales Representative', 'Enterprise Sales', 'Active', 'seynex2026'),
    ('b4317154-8c88-4660-84cf-cb864b22b7a9', 'biz_main', 'Seynex Accountant', 'accounts@seynex.lk', 'Accountant', 'Finance & Accounting', 'Active', 'seynex2026')
ON CONFLICT (email) DO UPDATE 
SET password = EXCLUDED.password, status = EXCLUDED.status;
