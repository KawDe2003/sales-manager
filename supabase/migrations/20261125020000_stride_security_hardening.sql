-- =========================================================================
-- STRIDE SECURITY HARDENING MIGRATION
-- Seynex Sales Manager
-- 1. P0: Tighten anon RLS policies (remove public raw SELECT * exposure)
-- 2. S/D: Server-side OTP challenge table & RPCs with 60s cooldown
-- 3. T: Server-side submit_portal_payment RPC enforcing 'Pending Verification'
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PRIVATE OTP CHALLENGES TABLE (No public anon SELECT access)
CREATE TABLE IF NOT EXISTS public.portal_otp_challenges (
  phone_last9 text PRIMARY KEY,
  otp_code text NOT NULL,
  expires_at timestamptz NOT NULL,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0
);

ALTER TABLE public.portal_otp_challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No direct public access to portal_otp_challenges" ON public.portal_otp_challenges;

-- Generate OTP with 60-second per-phone cooldown & 10-minute expiration
CREATE OR REPLACE FUNCTION public.create_portal_otp(p_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_digits text := regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g');
  v_last9 text;
  v_existing record;
  v_code text;
  v_wait_sec integer;
BEGIN
  IF length(v_digits) < 9 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid mobile phone number.');
  END IF;
  v_last9 := right(v_digits, 9);

  SELECT * INTO v_existing FROM public.portal_otp_challenges WHERE phone_last9 = v_last9;
  IF FOUND AND v_existing.last_sent_at > (now() - interval '60 seconds') THEN
    v_wait_sec := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_existing.last_sent_at + interval '60 seconds' - now())))::integer);
    RETURN jsonb_build_object('ok', false, 'cooldown', v_wait_sec, 'error', format('Please wait %s seconds before requesting another OTP.', v_wait_sec));
  END IF;

  v_code := lpad((floor(random() * 9000 + 1000))::int::text, 4, '0');

  INSERT INTO public.portal_otp_challenges (phone_last9, otp_code, expires_at, last_sent_at, attempts)
  VALUES (v_last9, v_code, now() + interval '10 minutes', now(), 0)
  ON CONFLICT (phone_last9) DO UPDATE SET
    otp_code = EXCLUDED.otp_code,
    expires_at = EXCLUDED.expires_at,
    last_sent_at = EXCLUDED.last_sent_at,
    attempts = 0;

  RETURN jsonb_build_object('ok', true, 'code', v_code, 'expiresInSeconds', 600);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_portal_otp(text) TO anon, authenticated;

-- Verify OTP server-side with max 5 attempts & expiry enforcement
CREATE OR REPLACE FUNCTION public.verify_portal_otp(p_phone text, p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_digits text := regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g');
  v_last9 text;
  v_row record;
BEGIN
  IF length(v_digits) < 9 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid phone number.');
  END IF;
  v_last9 := right(v_digits, 9);

  SELECT * INTO v_row FROM public.portal_otp_challenges WHERE phone_last9 = v_last9;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No active OTP found. Please request a new code.');
  END IF;

  IF v_row.expires_at < now() THEN
    DELETE FROM public.portal_otp_challenges WHERE phone_last9 = v_last9;
    RETURN jsonb_build_object('ok', false, 'error', 'OTP expired. Please request a new code.');
  END IF;

  IF v_row.attempts >= 5 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Too many failed attempts. Please request a new OTP.');
  END IF;

  IF trim(COALESCE(p_code, '')) <> v_row.otp_code THEN
    UPDATE public.portal_otp_challenges SET attempts = attempts + 1 WHERE phone_last9 = v_last9;
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid OTP verification code.');
  END IF;

  DELETE FROM public.portal_otp_challenges WHERE phone_last9 = v_last9;
  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_portal_otp(text, text) TO anon, authenticated;

-- 2. TAMPER-PROOF PORTAL PAYMENT SUBMISSION RPC
CREATE OR REPLACE FUNCTION public.submit_portal_payment(
  p_invoice_id text,
  p_customer_id text,
  p_amount numeric,
  p_payment_type text,
  p_reference_number text,
  p_notes text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pay_id uuid := uuid_generate_v4();
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Payment amount must be greater than zero.');
  END IF;

  INSERT INTO public.payments (
    id, customer_id, document_id, amount, payment_type, reference_number, status, notes, created_at
  ) VALUES (
    v_pay_id, p_customer_id, p_invoice_id, p_amount,
    COALESCE(p_payment_type, 'Bank Transfer Deposit'),
    COALESCE(p_reference_number, 'PORTAL-REF'),
    'Pending Verification',
    COALESCE(p_notes, 'Customer Portal Submission'),
    now()
  );

  UPDATE public.invoices
  SET status = 'Pending Verification'
  WHERE id::text = p_invoice_id AND COALESCE(status, '') <> 'Paid';

  RETURN jsonb_build_object('ok', true, 'paymentId', v_pay_id, 'status', 'Pending Verification');
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_portal_payment(text, text, numeric, text, text, text) TO anon, authenticated;

-- 3. P0: TIGHTEN RLS ON CORE TABLES (Authenticated staff only; anon uses scoped SECURITY DEFINER RPCs)
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN (
        'customers', 'quotations', 'invoices', 'payments', 'expenses',
        'leads', 'accounts', 'journal_entries', 'journal_lines',
        'user_profiles', 'automation_agents', 'automation_logs', 'activity_logs'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Full access on %I" ON public.%I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated staff full access on %I" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "Authenticated staff full access on %I" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', tbl, tbl);
  END LOOP;
END $$;
