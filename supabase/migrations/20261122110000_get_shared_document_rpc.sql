-- =========================================================================
-- SECURE PUBLIC SHARE PAGE RPC: get_shared_document
-- Seynex Technology | Antigravity Sales Management System
-- Allows anonymous and public clients to view shared quotes and invoices
-- without logging in or opening broad public table SELECT access.
-- =========================================================================

-- Ensure share_token and expires_at columns exist on quotations and invoices
ALTER TABLE IF EXISTS public.quotations 
    ADD COLUMN IF NOT EXISTS share_token TEXT,
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE IF EXISTS public.invoices 
    ADD COLUMN IF NOT EXISTS share_token TEXT,
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Create high-performance index on share tokens
CREATE INDEX IF NOT EXISTS idx_quotations_share_token ON public.quotations (share_token);
CREATE INDEX IF NOT EXISTS idx_quotations_share_key ON public.quotations (share_key);
CREATE INDEX IF NOT EXISTS idx_invoices_share_token ON public.invoices (share_token);
CREATE INDEX IF NOT EXISTS idx_invoices_share_key ON public.invoices (share_key);

-- The Security Definer Function
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

    -- Fetch default company branding from user_profiles if available
    SELECT config INTO v_company 
    FROM public.user_profiles 
    WHERE config IS NOT NULL 
    ORDER BY updated_at DESC 
    LIMIT 1;

    IF v_company IS NULL THEN
        v_company := jsonb_build_object(
            'companyName', 'Seynex Enterprises',
            'companyEmail', 'sales@seynex.com',
            'companyPhone', '+94 11 234 5678',
            'companyAddress', 'Colombo, Sri Lanka'
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
            'valid_until', q.valid_until,
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
            'terms', q.terms,
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
            'due_date', inv.due_date,
            'status', COALESCE(inv.status, 'Draft'),
            'items', COALESCE(inv.items, '[]'::jsonb),
            'amount', inv.amount,
            'totalAmount', inv.amount,
            'subtotal', COALESCE(inv.subtotal, inv.amount),
            'tax', COALESCE(inv.tax, 0),
            'amountPaid', COALESCE(inv.amount_paid, 0),
            'outstandingBalance', COALESCE(inv.outstanding_balance, inv.amount),
            'prospectName', inv.prospect_name,
            'customerName', inv.prospect_name,
            'billingAddress', COALESCE(inv.billing_address, inv.address, ''),
            'address', COALESCE(inv.billing_address, inv.address, ''),
            'payments', COALESCE(inv.payments, '[]'::jsonb),
            'notes', inv.notes,
            'terms', inv.terms,
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
            'receiptNumber', COALESCE(p.receipt_number, p.reference_number, 'REC-' || p.id::text),
            'date', p.created_at,
            'amount', p.amount,
            'paymentMethod', COALESCE(p.payment_method, 'Cash'),
            'referenceNumber', p.reference_number,
            'customerName', p.customer_name,
            'invoiceNumber', p.invoice_number,
            'notes', p.notes,
            'company', v_company
        ) INTO v_result
        FROM public.payments p
        WHERE (
            p.id::text = v_token 
            OR (p.receipt_number IS NOT NULL AND lower(p.receipt_number) = lower(v_token))
            OR (p.reference_number IS NOT NULL AND lower(p.reference_number) = lower(v_token))
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

-- Grant execution to anon (unauthenticated) and authenticated users
GRANT EXECUTE ON FUNCTION public.get_shared_document(text, text) TO anon, authenticated;
