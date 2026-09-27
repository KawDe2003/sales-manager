-- Migration: 20260927000100_cleanup_unuseful_columns.sql
-- Description: Drop obsolete, unuseful columns from customers table to maintain a clean, standardized schema

-- 1. Remove legacy gym-specific columns from customers
ALTER TABLE IF EXISTS customers DROP COLUMN IF EXISTS last_reminder_days_diff;
ALTER TABLE IF EXISTS customers DROP COLUMN IF EXISTS last_birthday_sent_year;
ALTER TABLE IF EXISTS customers DROP COLUMN IF EXISTS annual_fee;
ALTER TABLE IF EXISTS customers DROP COLUMN IF EXISTS dob;

-- 2. Add documentation comments
COMMENT ON TABLE customers IS 'Production customer and corporate client registry for Sales Management System';
