-- =========================================================================
-- SECURE CUSTOMER PORTAL LOOKUP RPC: get_customer_portal_data
-- Seynex Sales Manager | Customer Payment & Billing Portal
-- Matches only the customer's normalized last 9 phone digits server-side,
-- preventing full-table public SELECT downloads of all clients & invoices.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.get_customer_portal_data(p_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_digits text := regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g');
    v_last9 text;
    v_customer jsonb := NULL;
    v_customer_ids text[] := ARRAY[]::text[];
    v_invoices jsonb := '[]'::jsonb;
    v_payments jsonb := '[]'::jsonb;
BEGIN
    IF length(v_digits) < 9 THEN
        RETURN jsonb_build_object('customer', NULL, 'invoices', '[]'::jsonb, 'payments', '[]'::jsonb);
    END IF;

    v_last9 := right(v_digits, 9);

    -- 1. Find matching customer(s) by normalized last 9 digits
    SELECT array_agg(c.id::text)
    INTO v_customer_ids
    FROM public.customers c
    WHERE right(regexp_replace(COALESCE(c.phone, ''), '[^0-9]', '', 'g'), 9) = v_last9;

    SELECT jsonb_build_object(
        'id', c.id,
        'gymName', COALESCE(c.gym_name, c.name),
        'name', c.name,
        'email', c.email,
        'phone', c.phone,
        'dob', c.dob,
        'purchaseDate', c.purchase_date,
        'renewalDate', c.renewal_date,
        'annualFee', COALESCE(c.annual_fee, 0),
        'status', c.status
    )
    INTO v_customer
    FROM public.customers c
    WHERE right(regexp_replace(COALESCE(c.phone, ''), '[^0-9]', '', 'g'), 9) = v_last9
    ORDER BY c.created_at DESC
    LIMIT 1;

    -- 2. Find matching invoices for this customer or matching prospect_phone
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', i.id,
            'shareKey', COALESCE(i.share_key, i.id::text),
            'invoiceNumber', i.invoice_number,
            'date', i.date,
            'dueDate', i.due_date,
            'customerId', i.customer_id,
            'amount', COALESCE(i.amount, i.total, 0),
            'status', COALESCE(i.status, 'Sent'),
            'items', COALESCE(i.items, '[]'::jsonb),
            'prospectName', i.prospect_name,
            'prospectPhone', i.prospect_phone,
            'installmentPlan', CASE WHEN (i.installment_plan->>'enabled')::boolean IS TRUE THEN i.installment_plan ELSE NULL END
        ) ORDER BY i.date DESC
    ), '[]'::jsonb)
    INTO v_invoices
    FROM public.invoices i
    WHERE (
        (v_customer_ids IS NOT NULL AND i.customer_id::text = ANY(v_customer_ids))
        OR right(regexp_replace(COALESCE(i.prospect_phone, ''), '[^0-9]', '', 'g'), 9) = v_last9
    );

    -- 3. Find matching payments for this customer or their invoices
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', p.id,
            'customerId', p.customer_id,
            'documentId', p.document_id,
            'amount', COALESCE(p.amount, 0),
            'method', COALESCE(p.payment_type, 'Online Portal Payment'),
            'referenceNumber', COALESCE(p.reference_number, 'REF-' || left(p.id::text, 8)),
            'status', COALESCE(p.status, 'Verified'),
            'paymentDate', COALESCE(p.payment_timestamp::date::text, p.created_at::date::text),
            'timestamp', COALESCE(p.payment_timestamp, p.created_at)
        ) ORDER BY COALESCE(p.payment_timestamp, p.created_at) DESC
    ), '[]'::jsonb)
    INTO v_payments
    FROM public.payments p
    WHERE (
        (v_customer_ids IS NOT NULL AND p.customer_id::text = ANY(v_customer_ids))
        OR p.document_id::text IN (
            SELECT (inv->>'id')::text FROM jsonb_array_elements(v_invoices) inv
        )
    );

    RETURN jsonb_build_object(
        'customer', v_customer,
        'invoices', v_invoices,
        'payments', v_payments
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_customer_portal_data(text) TO anon, authenticated;
