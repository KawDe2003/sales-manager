-- SUPABASE MIGRATION: 20260809153000_production_hardening.sql
-- PRODUCTION HARDENING & BACKEND INTEGRITY FOR GYMSALES PRO

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. HARDEN EXISTING TABLES WITH CONSTRAINTS & FOREIGN KEYS

-- Customers Table
ALTER TABLE customers 
    ALTER COLUMN gym_name SET NOT NULL,
    ADD CONSTRAINT chk_annual_fee_non_negative CHECK (annual_fee >= 0);

-- Invoices Table
ALTER TABLE invoices
    ALTER COLUMN invoice_number SET NOT NULL,
    ALTER COLUMN date SET NOT NULL,
    ADD CONSTRAINT chk_invoice_amount_non_negative CHECK (amount >= 0);

-- Inventory Table
ALTER TABLE inventory
    ALTER COLUMN name SET NOT NULL,
    ADD CONSTRAINT chk_inventory_price_non_negative CHECK (price >= 0),
    ADD CONSTRAINT chk_inventory_stock_non_negative CHECK (stock >= 0);

-- Expenses Table
ALTER TABLE expenses
    ALTER COLUMN date SET NOT NULL,
    ADD CONSTRAINT chk_expense_amount_non_negative CHECK (amount >= 0);

-- Payments Table
ALTER TABLE payments
    ALTER COLUMN amount SET NOT NULL,
    ADD CONSTRAINT chk_payment_amount_positive CHECK (amount > 0);

-- Fixed Assets Table
ALTER TABLE fixed_assets
    ALTER COLUMN asset_code SET NOT NULL,
    ALTER COLUMN name SET NOT NULL,
    ADD CONSTRAINT chk_purchase_cost_non_negative CHECK (purchase_cost >= 0),
    ADD CONSTRAINT chk_salvage_value_non_negative CHECK (salvage_value >= 0);


-- 2. DOUBLE-ENTRY GENERAL LEDGER TABLES (LKAS 1 & LKAS 7 RECONCILIATION)

-- Chart of Accounts Table
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'Asset', 'Liability', 'Equity', 'Revenue', 'Expense'
    statement_category TEXT NOT NULL,
    is_current BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_account_type CHECK (type IN ('Asset', 'Liability', 'Equity', 'Revenue', 'Expense'))
);

-- Journal Entries Header Table
CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    date DATE NOT NULL,
    reference TEXT NOT NULL,
    description TEXT NOT NULL,
    created_by TEXT DEFAULT 'System',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Journal Lines Detail Table
CREATE TABLE IF NOT EXISTS journal_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL REFERENCES accounts(id),
    debit NUMERIC DEFAULT 0 NOT NULL,
    credit NUMERIC DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_line_debit_non_negative CHECK (debit >= 0),
    CONSTRAINT chk_line_credit_non_negative CHECK (credit >= 0),
    CONSTRAINT chk_line_has_amount CHECK (debit > 0 OR credit > 0)
);

-- Payment Allocations Table
CREATE TABLE IF NOT EXISTS payment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    allocated_amount NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_allocated_amount_positive CHECK (allocated_amount > 0)
);

-- Depreciation Schedules Table
CREATE TABLE IF NOT EXISTS depreciation_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    asset_id UUID NOT NULL REFERENCES fixed_assets(id) ON DELETE CASCADE,
    period_date DATE NOT NULL,
    depreciation_amount NUMERIC NOT NULL,
    accumulated_depreciation NUMERIC NOT NULL,
    book_value NUMERIC NOT NULL,
    journal_entry_id UUID REFERENCES journal_entries(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_dep_amount_non_negative CHECK (depreciation_amount >= 0)
);


-- 3. BALANCED JOURNAL ENTRY TRIGGER (DEBITS = CREDITS)

CREATE OR REPLACE FUNCTION fn_check_journal_entry_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_total_debit NUMERIC;
    v_total_credit NUMERIC;
    v_entry_id UUID;
BEGIN
    v_entry_id := COALESCE(NEW.journal_entry_id, OLD.journal_entry_id);
    
    SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
    INTO v_total_debit, v_total_credit
    FROM journal_lines
    WHERE journal_entry_id = v_entry_id;

    IF ABS(v_total_debit - v_total_credit) > 0.001 THEN
        RAISE EXCEPTION 'UNBALANCED JOURNAL ENTRY: Total Debits (LKR %) must equal Total Credits (LKR %) for Journal Entry ID %', 
            v_total_debit, v_total_credit, v_entry_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply Constraint Trigger on Deferred Check
DROP TRIGGER IF EXISTS trg_check_journal_entry_balance ON journal_lines;
CREATE CONSTRAINT TRIGGER trg_check_journal_entry_balance
AFTER INSERT OR UPDATE OR DELETE ON journal_lines
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION fn_check_journal_entry_balance();


-- 4. ATOMIC PAYMENT TRANSACTION FUNCTION (PL/pgSQL)

CREATE OR REPLACE FUNCTION record_payment_transaction(
    p_user_id UUID,
    p_customer_id UUID,
    p_invoice_id UUID,
    p_amount NUMERIC,
    p_payment_type TEXT,
    p_payment_date DATE
) RETURNS JSONB AS $$
DECLARE
    v_payment_id UUID;
    v_journal_id UUID;
    v_invoice_num TEXT;
    v_inv_amount NUMERIC;
    v_allocated_sum NUMERIC;
    v_new_status TEXT;
BEGIN
    -- 1. Insert Payment Record
    INSERT INTO payments (user_id, customer_id, document_id, amount, payment_type, payment_timestamp)
    VALUES (p_user_id, p_customer_id, p_invoice_id, p_amount, p_payment_type, p_payment_date::timestamp)
    RETURNING id INTO v_payment_id;

    -- 2. Insert Payment Allocation
    INSERT INTO payment_allocations (user_id, payment_id, invoice_id, allocated_amount)
    VALUES (p_user_id, v_payment_id, p_invoice_id, p_amount);

    -- 3. Calculate Invoice Paid Total & Status
    SELECT invoice_number, amount INTO v_invoice_num, v_inv_amount
    FROM invoices WHERE id = p_invoice_id;

    SELECT COALESCE(SUM(allocated_amount), 0) INTO v_allocated_sum
    FROM payment_allocations WHERE invoice_id = p_invoice_id;

    IF v_allocated_sum >= v_inv_amount THEN
        v_new_status := 'Paid';
    ELSIF v_allocated_sum > 0 THEN
        v_new_status := 'Partially Paid';
    ELSE
        v_new_status := 'Sent';
    END IF;

    UPDATE invoices SET status = v_new_status WHERE id = p_invoice_id;

    -- 4. Post Double-Entry Journal Entry (Debit Bank 1020, Credit AR 1100)
    INSERT INTO journal_entries (user_id, date, reference, description, created_by)
    VALUES (p_user_id, p_payment_date, 'PMT-' || SUBSTRING(v_payment_id::text FROM 1 FOR 8), 
            'Payment received for invoice ' || v_invoice_num, 'System')
    RETURNING id INTO v_journal_id;

    INSERT INTO journal_lines (user_id, journal_entry_id, account_id, debit, credit)
    VALUES 
        (p_user_id, v_journal_id, '1020', p_amount, 0),
        (p_user_id, v_journal_id, '1100', 0, p_amount);

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'journal_entry_id', v_journal_id,
        'invoice_status', v_new_status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. PERFORMANCE INDEXES FOR DEBTORS AGING & FINANCIAL REPORTS

CREATE INDEX IF NOT EXISTS idx_invoices_user_date ON invoices(user_id, date);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(user_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_user_date ON payments(user_id, payment_timestamp);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_inv ON payment_allocations(invoice_id);


-- 6. HARDEN ROW LEVEL SECURITY POLICIES (TIGHTEN MULTI-TENANT ISOLATION)

-- Enable RLS on newly created tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE depreciation_schedules ENABLE ROW LEVEL SECURITY;

-- Owner Isolation Policies for Ledger Tables
CREATE POLICY "Owner access accounts" ON accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Owner access journal_entries" ON journal_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Owner access journal_lines" ON journal_lines FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Owner access payment_allocations" ON payment_allocations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Owner access depreciation_schedules" ON depreciation_schedules FOR ALL USING (auth.uid() = user_id);

-- Drop Overly Broad Public Read/Write Policies
DROP POLICY IF EXISTS "View customers for portal" ON customers;
DROP POLICY IF EXISTS "View payments for portal" ON payments;
DROP POLICY IF EXISTS "Insert payments from portal" ON payments;
DROP POLICY IF EXISTS "View quotations by share_key" ON quotations;
DROP POLICY IF EXISTS "View invoices by share_key" ON invoices;

-- Restrict Public Share Link Access Strictly by Token Matching
CREATE POLICY "Public invoice by share_key" ON invoices 
    FOR SELECT USING (share_key IS NOT NULL AND share_key = current_setting('request.headers', true)::json->>'x-share-key');

CREATE POLICY "Public quotation by share_key" ON quotations 
    FOR SELECT USING (share_key IS NOT NULL AND share_key = current_setting('request.headers', true)::json->>'x-share-key');
