import React, { useContext, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { StoreContext } from '../context/StoreContext';
import { supabase } from '../lib/supabase';
import { generateDocumentPDF, generatePurchaseOrderPDF, generatePaymentReceiptPDF } from '../utils/pdfGenerator';
import { Download, Printer, CheckCircle, XCircle, FileText, Receipt, Clock, ShieldCheck, Tag, DollarSign, MessageSquare, AlertTriangle, Send, ShoppingBag, Check, MapPin, Cpu, Monitor, Wrench } from 'lucide-react';

const SharedDocument = () => {
  const { type, id } = useParams();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';
  const { 
    quotes = [], invoices = [], customers = [], 
    purchaseOrders = [], suppliers = [], payments = [],
    acceptQuote, proposeBudget, rejectQuote, showNotification, smsConfig = {} 
  } = useContext(StoreContext) || {};
  const [docData, setDocData] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [showGratitude, setShowGratitude] = useState(false);
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [proposedAmount, setProposedAmount] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
  const [preferredChanges, setPreferredChanges] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPO = type === 'po';
  const isQuote = type === 'quote';
  const isReceipt = type === 'receipt';
  const docTitle = isPO ? 'Purchase Order' : isReceipt ? 'Payment Receipt' : isQuote ? 'Quotation' : 'Invoice';

  useEffect(() => {
    const loadDocument = async () => {
      try {
        setLoading(true);
        let foundDoc = null;
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        if (type === 'po') {
          // Check in StoreContext purchaseOrders or localStorage
          foundDoc = purchaseOrders.find(item => item.id === id || item.shareKey === id || item.poNumber === id);
          if (!foundDoc) {
            try {
              const localPOs = JSON.parse(localStorage.getItem('gym_purchase_orders') || '[]');
              foundDoc = localPOs.find(item => item.id === id || item.shareKey === id || item.poNumber === id);
            } catch (e) {}
          }
          if (foundDoc) {
            setDocData(foundDoc);
            const sup = suppliers.find(s => s.id === foundDoc.supplierId || s.name === foundDoc.supplierName);
            setCustomerName(foundDoc.supplierName || sup?.name || 'Authorized Supplier');
          }
        } else if (type === 'quote') {
          const searchKey = String(id || '').trim();
          const rawQuote = quotes.find(item => 
            item.id === searchKey || 
            item.shareKey === searchKey || 
            item.quoteNumber === searchKey || 
            item.quote_number === searchKey ||
            String(item.quoteNumber || '').toLowerCase() === searchKey.toLowerCase()
          );
          if (rawQuote) {
            foundDoc = { ...rawQuote };
          }
          if (!foundDoc) {
            try {
              const localQuotes = JSON.parse(localStorage.getItem('gym_quotes') || '[]');
              const matched = localQuotes.find(item => 
                item.id === searchKey || 
                item.shareKey === searchKey || 
                item.quoteNumber === searchKey || 
                item.quote_number === searchKey ||
                String(item.quoteNumber || '').toLowerCase() === searchKey.toLowerCase()
              );
              if (matched) foundDoc = { ...matched };
            } catch (e) {}
          }
          if (!foundDoc) {
            const query = supabase.from('quotations').select('*');
            if (isUUID) query.or(`id.eq.${searchKey},share_key.eq.${searchKey}`);
            else query.or(`share_key.eq.${searchKey},quote_number.eq.${searchKey},quote_number.ilike.${searchKey}`);

            const { data, error } = await query.maybeSingle();
            if (data && !error) {
              foundDoc = { 
                ...data, 
                shareKey: data.share_key, 
                quoteNumber: data.quote_number,
                prospectName: data.prospect_name,
                prospectAddress: data.prospect_address || data.address || '',
                address: data.prospect_address || data.address || '',
                convertedInvoiceId: data.converted_invoice_id || data.convertedInvoiceId || null,
                convertedInvoiceNumber: data.converted_invoice_number || data.convertedInvoiceNumber || null,
                sentAt: data.sent_at || data.sentAt || null,
                acceptedAt: data.accepted_at || data.acceptedAt || null
              };
            }
          }

          if (foundDoc) {
            const qNum = String(foundDoc.quoteNumber || foundDoc.quote_number || '').trim();

            // Always check Supabase to ensure freshest status (Accepted, Converted, etc.)
            try {
              const query = supabase.from('quotations').select('*');
              if (isUUID) query.or(`id.eq.${searchKey},share_key.eq.${searchKey}`);
              else query.or(`share_key.eq.${searchKey},quote_number.eq.${searchKey},quote_number.ilike.${searchKey}`);
              const { data: cloudQuote } = await query.maybeSingle();
              if (cloudQuote) {
                if (['Accepted', 'Converted to Invoice', 'Counter Offer', 'Rejected'].includes(cloudQuote.status) || !foundDoc.status) {
                  foundDoc.status = cloudQuote.status;
                }
                foundDoc.acceptedAt = cloudQuote.accepted_at || cloudQuote.acceptedAt || foundDoc.acceptedAt;
                foundDoc.convertedInvoiceId = cloudQuote.converted_invoice_id || cloudQuote.convertedInvoiceId || foundDoc.convertedInvoiceId;
                foundDoc.convertedInvoiceNumber = cloudQuote.converted_invoice_number || cloudQuote.convertedInvoiceNumber || foundDoc.convertedInvoiceNumber;
                if (cloudQuote.last_counter_offer) {
                  foundDoc.lastCounterOffer = cloudQuote.last_counter_offer;
                }
              }
            } catch (e) {}

            let allInvs = Array.isArray(invoices) && invoices.length > 0 ? invoices : [];
            if (allInvs.length === 0) {
              try { allInvs = JSON.parse(localStorage.getItem('gym_invoices') || '[]'); } catch (e) {}
            }

            // Link matching invoice if present
            const matchingInv = allInvs.find(inv => {
              const qIdMatch = inv.quotationId && (
                String(inv.quotationId) === String(foundDoc.id) || 
                String(inv.quotationId) === String(foundDoc.shareKey)
              );
              const invNumMatch = foundDoc.convertedInvoiceNumber && (
                inv.invoiceNumber === foundDoc.convertedInvoiceNumber || 
                inv.invoice_number === foundDoc.convertedInvoiceNumber
              );
              const invIdMatch = (
                (foundDoc.convertedInvoiceId && (inv.id === foundDoc.convertedInvoiceId || inv.shareKey === foundDoc.convertedInvoiceId)) ||
                (foundDoc.converted_invoice_id && (inv.id === foundDoc.converted_invoice_id || inv.shareKey === foundDoc.converted_invoice_id))
              );
              const hasQuoteRef = (
                (inv.quoteRef && inv.quoteRef === qNum) || 
                (inv.quotationNumber && inv.quotationNumber === qNum) || 
                inv.acceptedFromQuote ||
                qIdMatch
              );

              return qIdMatch || (invIdMatch && hasQuoteRef) || (invNumMatch && hasQuoteRef);
            });

            if (matchingInv) {
              foundDoc.convertedInvoiceNumber = matchingInv.invoiceNumber || matchingInv.invoice_number || foundDoc.convertedInvoiceNumber;
              foundDoc.convertedInvoiceId = matchingInv.id || matchingInv.shareKey || foundDoc.convertedInvoiceId;
              foundDoc.status = 'Converted to Invoice';
            } else if (foundDoc.status === 'Converted to Invoice' || foundDoc.status === 'Accepted') {
              // If invoice details missing, query Supabase for corresponding invoice
              if (!foundDoc.convertedInvoiceNumber || !foundDoc.convertedInvoiceId) {
                try {
                  const { data: invData } = await supabase
                    .from('invoices')
                    .select('*')
                    .or(`quotation_id.eq.${foundDoc.id || '00000000-0000-0000-0000-000000000000'},quote_ref.eq.${qNum}`)
                    .maybeSingle();
                  if (invData) {
                    foundDoc.convertedInvoiceNumber = invData.invoice_number;
                    foundDoc.convertedInvoiceId = invData.id || invData.share_key;
                    foundDoc.status = 'Converted to Invoice';
                  }
                } catch (e) {}
              }
              // PERMANENT: Never revert an Accepted or Converted to Invoice quote back to Sent/Pending
            }

            // Sync latest quote status to localStorage so subsequent reloads stay consistent
            try {
              const storedQuotes = JSON.parse(localStorage.getItem('gym_quotes') || '[]');
              if (Array.isArray(storedQuotes)) {
                const nextList = storedQuotes.map(sq => {
                  if (sq.id === foundDoc.id || sq.shareKey === foundDoc.shareKey || sq.quoteNumber === qNum) {
                    return { ...sq, ...foundDoc };
                  }
                  return sq;
                });
                if (!nextList.some(sq => sq.id === foundDoc.id || sq.shareKey === foundDoc.shareKey || sq.quoteNumber === qNum)) {
                  nextList.unshift(foundDoc);
                }
                localStorage.setItem('gym_quotes', JSON.stringify(nextList));
              }
            } catch (e) {}

            setDocData(foundDoc);
            setCustomerName(foundDoc.prospectName || 'Valued Client');
          }
        } else if (type === 'receipt') {
          // 1. Search in local and Context payments
          let allPayments = Array.isArray(payments) && payments.length > 0 ? payments : [];
          if (allPayments.length === 0) {
            try { allPayments = JSON.parse(localStorage.getItem('gym_payments') || '[]'); } catch(e){}
          }
          let payMatch = allPayments.find(p => p.id === id || p.receiptNumber === id || String(p.receiptNumber).toLowerCase() === String(id).toLowerCase());

          if (!payMatch && isUUID) {
            const { data } = await supabase.from('payments').select('*').eq('id', id).maybeSingle();
            if (data) {
              payMatch = {
                ...data,
                receiptNumber: `REC-${String(data.id).slice(0, 6).toUpperCase()}`,
                amount: data.amount,
                timestamp: data.payment_timestamp,
                method: data.payment_type
              };
            }
          }

          if (payMatch) {
            const inv = invoices.find(i => i.id === payMatch.documentId) || {};
            const cust = customers.find(c => c.id === (payMatch.customerId || inv.customerId)) || {};
            const clientTitle = cust.gymName || cust.name || inv.customerName || 'Valued Client';
            setCustomerName(clientTitle);
            foundDoc = {
              ...payMatch,
              isReceipt: true,
              invoiceNumber: payMatch.invoiceNumber || inv.invoiceNumber || '',
              customerName: clientTitle,
              gymName: clientTitle,
              invoiceData: inv,
              customerData: cust,
              amount: payMatch.amount,
              paymentMethod: payMatch.method || payMatch.payment_type || 'Cash',
              receiptNumber: payMatch.receiptNumber || 'REC-001',
              date: payMatch.timestamp || payMatch.payment_timestamp || new Date().toISOString()
            };
            setDocData(foundDoc);
          } else {
            // Fallback: search in invoices
            foundDoc = invoices.find(item => item.id === id || item.shareKey === id || item.invoiceNumber === id);
            if (!foundDoc) {
              const query = supabase.from('invoices').select('*');
              if (isUUID) query.or(`id.eq.${id},share_key.eq.${id}`);
              else query.eq('share_key', id);
              const { data } = await query.single();
              if (data) {
                foundDoc = { 
                  ...data, 
                  shareKey: data.share_key, 
                  invoiceNumber: data.invoice_number,
                  dueDate: data.due_date,
                  customerId: data.customer_id,
                  prospectName: data.prospect_name
                };
              }
            }
            if (foundDoc) {
              setDocData({ ...foundDoc, isReceipt: true, receiptNumber: foundDoc.receiptNumber || `REC-${foundDoc.invoiceNumber || '001'}` });
              const c = customers.find(cust => cust.id === foundDoc.customerId);
              setCustomerName(c ? c.gymName : foundDoc.prospectName || 'Valued Client');
            }
          }
        } else if (type === 'invoice') {
          const searchKey = String(id || '').trim();
          foundDoc = invoices.find(item => 
            item.id === searchKey || 
            item.shareKey === searchKey || 
            item.invoiceNumber === searchKey || 
            item.invoice_number === searchKey ||
            String(item.invoiceNumber || '').toLowerCase() === searchKey.toLowerCase()
          );
          if (!foundDoc) {
            try {
              const localInvoices = JSON.parse(localStorage.getItem('gym_invoices') || '[]');
              const matched = localInvoices.find(item => 
                item.id === searchKey || 
                item.shareKey === searchKey || 
                item.invoiceNumber === searchKey || 
                item.invoice_number === searchKey ||
                String(item.invoiceNumber || '').toLowerCase() === searchKey.toLowerCase()
              );
              if (matched) foundDoc = { ...matched };
            } catch (e) {}
          }
          if (!foundDoc) {
            const query = supabase.from('invoices').select('*');
            if (isUUID) query.or(`id.eq.${searchKey},share_key.eq.${searchKey}`);
            else query.or(`share_key.eq.${searchKey},invoice_number.eq.${searchKey},invoice_number.ilike.${searchKey}`);

            const { data, error } = await query.maybeSingle();
            if (data && !error) {
              foundDoc = { 
                ...data, 
                shareKey: data.share_key, 
                invoiceNumber: data.invoice_number,
                dueDate: data.due_date,
                customerId: data.customer_id,
                reminderSent: data.reminder_sent,
                prospectName: data.prospect_name,
                billingAddress: data.billing_address || data.address || '',
                address: data.billing_address || data.address || ''
              };
            }
          }

          if (foundDoc) {
            setDocData(foundDoc);
            const c = customers.find(cust => cust.id === foundDoc.customerId);
            setCustomerName(c ? c.gymName : foundDoc.prospectName || 'Valued Client');
          }
        }
      } catch (err) {
        console.error('[SharedDoc] Load Error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, [type, id, quotes, invoices, customers, purchaseOrders, suppliers, payments]);

  const handleDownloadPDF = () => {
    if (!docData) return;
    if (isPO) {
      generatePurchaseOrderPDF(docData);
      return;
    }
    if (isReceipt) {
      generatePaymentReceiptPDF(
        docData,
        docData.invoiceData || docData,
        docData.customerData || { gymName: customerName, name: customerName }
      );
      return;
    }
    const payload = isQuote
      ? { 
          ...docData, 
          prospectName: customerName, 
          customerName: customerName,
          quoteNumber: docData.quoteNumber || docData.quote_number || docData.id 
        }
      : { 
          ...docData, 
          gymName: customerName, 
          customerName: customerName,
          invoiceNumber: docData.invoiceNumber || docData.invoice_number || docData.id 
        };
    generateDocumentPDF(isQuote ? 'Quotation' : 'Invoice', payload, docData.items || []);
  };


  useEffect(() => {
    if (docData && searchParams.get('download') === 'pdf') {
      handleDownloadPDF();
    }
  }, [docData, searchParams]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#070b14' }}>
        <div className="animate-spin" style={{ width: '40px', height: '40px', border: '3px solid rgba(99, 102, 241, 0.2)', borderTopColor: '#6366f1', borderRadius: '50%', marginBottom: '20px' }}></div>
        <p style={{ color: '#94a3b8' }}>Retrieving secure document preview...</p>
      </div>
    );
  }

  if (!docData) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center', background: '#070b14' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px' }}>
          <FileText size={40} style={{ color: '#64748b' }} />
        </div>
        <h1 style={{ fontSize: '2rem', color: '#ffffff', marginBottom: '16px' }}>Document Expired or Not Found</h1>
        <p style={{ color: '#94a3b8', maxWidth: '500px', fontSize: '1.05rem' }}>The requested {docTitle} could not be retrieved. Please contact support if you believe this is an error.</p>
        <button className="btn btn-secondary" style={{ marginTop: '24px' }} onClick={() => window.location.href = '/'}>Return Home</button>
      </div>
    );
  }

  const docNumber = isPO ? docData.poNumber : isReceipt ? (docData.receiptNumber || docData.receipt_number || docData.id) : isQuote ? docData.quoteNumber : docData.invoiceNumber;
  const standardItems = Array.isArray(docData.items) && docData.items.length > 0 
    ? docData.items.filter(i => !i.isDiscount) 
    : isReceipt 
    ? [
        {
          name: docData.invoiceNumber ? `Official Settlement against Invoice #${docData.invoiceNumber}` : 'Account Settlement Deposit',
          qty: 1,
          unit: 'Payment',
          unitPrice: Number(docData.amount || 0),
          amount: Number(docData.amount || 0)
        }
      ]
    : [];
  const discountItem = (docData.items || []).find(i => i.isDiscount);
  
  const getItemName = (item) => item.name || item.description || item.title || item.item_name || 'Purchase Item';
  const getItemQty = (item) => Number(item.quantity || item.qty || item.count || 1);
  const getItemPrice = (item) => Number(item.unitCost != null ? item.unitCost : (item.price || item.unitPrice || item.rate || item.unit_price || item.amount || 0));

  const discountAmount = discountItem ? Math.abs(getItemPrice(discountItem)) : 0;

  const calculatedItemsTotal = standardItems.reduce((sum, item) => sum + (getItemPrice(item) * getItemQty(item)), 0);

  const subTotal = isPO 
    ? (docData.subtotal != null ? Number(docData.subtotal) : calculatedItemsTotal)
    : (standardItems.length > 0 ? calculatedItemsTotal : Number(docData.amount || 25000) + discountAmount);
    
  const poVatRate = Number(docData.vatRate != null ? docData.vatRate : 18);
  const poVatAmount = isPO
    ? (docData.vatAmount != null ? Number(docData.vatAmount) : (docData.applyVat ? Math.round(subTotal * (poVatRate / 100)) : 0))
    : 0;

  const totalAmount = isPO
    ? (docData.totalAmount != null ? Number(docData.totalAmount) : (subTotal + poVatAmount))
    : (subTotal - discountAmount);

  const isApproved = isPO 
    ? (docData.status === 'Received' || docData.status === 'Delivered') 
    : (docData.status === 'Paid' || docData.status === 'Accepted' || docData.status === 'Converted to Invoice');

  const recipientCustomer = customers.find(cust => 
    (docData.customerId && cust.id === docData.customerId) ||
    (docData.customer_id && cust.id === docData.customer_id) ||
    (cust.gymName && (docData.prospectName || docData.customerName) && cust.gymName.trim().toLowerCase() === (docData.prospectName || docData.customerName).trim().toLowerCase()) ||
    (cust.name && (docData.prospectName || docData.customerName) && cust.name.trim().toLowerCase() === (docData.prospectName || docData.customerName).trim().toLowerCase()) ||
    (cust.phone && (docData.prospectPhone || docData.customerPhone) && cust.phone.trim() === (docData.prospectPhone || docData.customerPhone).trim())
  ) || {};
  const recipientAddress = docData.billingAddress || docData.address || docData.prospectAddress || recipientCustomer.address || (isPO ? (docData.supplierAddress || suppliers.find(s => s.id === docData.supplierId)?.address) : '');

  const getItemBillingCycle = (item) => {
    const rawName = getItemName(item);
    if (/(one[- ]?time|perpetual)/i.test(rawName)) return 'One-Time';
    if (item.billingCycle === 'One-Time' || item.billingCycle === 'One-Time / Perpetual') return 'One-Time';
    if (item.billingCycle === 'Monthly') return 'Monthly';
    if (item.billingCycle === 'Annual') return 'Annual';
    if (item.type === 'Hardware' || /(setup|install)/i.test(rawName)) return 'One-Time';
    return 'Annual';
  };

  const getItemClassification = (item) => {
    if (item?.type) {
      const t = String(item.type).toLowerCase();
      if (t.includes('hardware')) return 'Hardware';
      if (t.includes('software')) return 'Software';
      if (t.includes('service') || t.includes('support') || t.includes('consulting')) return 'Service';
    }
    const name = String(getItemName(item)).toLowerCase();
    if (/(device|reader|lock|sensor|switch|power supply|battery|terminal|zkteco|biometric|face|card|cable|camera|bracket|hardware|server unit|gateway|fingerprint)/i.test(name)) {
      return 'Hardware';
    }
    if (/(software|cloud|license|app|portal|module|api|automation|system|database|erp|pos|subscription)/i.test(name)) {
      return 'Software';
    }
    if (/(installation|service|training|support|consulting|setup|maintenance|delivery|sla)/i.test(name)) {
      return 'Service';
    }
    return item?.type || 'Hardware';
  };

  return (
    <div className="shared-doc-wrapper" style={{ 
      minHeight: '100vh', 
      maxWidth: '100vw',
      overflowX: 'hidden',
      background: '#070b14', 
      color: '#f8fafc', 
      padding: '40px 20px', 
      position: 'relative',
      boxSizing: 'border-box',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    }}>
      {/* Responsive & Print Style Rules */}
      <style>{`
        .desktop-billing-table {
          display: block;
        }
        .mobile-billing-list {
          display: none !important;
        }

        @media (max-width: 640px) {
          .shared-doc-wrapper {
            padding: 16px 10px !important;
          }
          .shared-doc-card {
            border-radius: 20px !important;
          }
          .shared-doc-card-inner {
            padding: 20px 14px !important;
          }
          .shared-billing-card {
            padding: 16px 14px !important;
            border-radius: 18px !important;
            margin-bottom: 20px !important;
          }
          .desktop-billing-table {
            display: none !important;
          }
          .mobile-billing-list {
            display: flex !important;
            flex-direction: column !important;
          }
          .shared-account-card {
            padding: 20px 16px !important;
            border-radius: 18px !important;
          }
          .shared-doc-footer {
            padding: 16px 16px !important;
            border-bottom-left-radius: 20px !important;
            border-bottom-right-radius: 20px !important;
          }
        }

        @media (min-width: 641px) {
          .desktop-billing-table {
            display: block !important;
          }
          .mobile-billing-list {
            display: none !important;
          }
        }

        @media print {
          .shared-doc-wrapper {
            background: #ffffff !important;
            padding: 0 !important;
          }
          .shared-doc-card {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .desktop-billing-table {
            display: block !important;
          }
          .mobile-billing-list {
            display: none !important;
          }
        }
      `}</style>

      {/* Background Radial Glow */}
      <div style={{ position: 'absolute', top: 0, right: 0, width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)', zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}></div>

      {/* TOP BAR / ACTION BUTTONS */}
      <div style={{ maxWidth: '960px', margin: '0 auto 24px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }} className="no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(99,102,241,0.3)' }}>
            <span style={{ color: '#ffffff', fontWeight: '900', fontSize: '22px' }}>G</span>
          </div>
          <div>
            <div style={{ color: '#ffffff', fontWeight: 800, fontSize: '1.2rem', lineHeight: 1 }}>Secure Portal</div>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>Client Access</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleDownloadPDF} className="btn btn-secondary" style={{ background: 'rgba(255,255,255,0.08)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)', height: '42px' }}>
            <Printer size={18} /> Print PDF
          </button>
          <button onClick={handleDownloadPDF} className="btn btn-primary" style={{ height: '42px', padding: '0 20px', fontSize: '0.9rem' }}>
            <Download size={18} /> Download {isQuote ? 'Quotation' : 'Invoice'}
          </button>
        </div>
      </div>

      {/* PREVIEW TITLE HEADER */}
      <div style={{ maxWidth: '960px', margin: '0 auto 14px auto' }}>
        <h3 style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>
          PREVIEW OF {docTitle.toUpperCase()}
        </h3>
      </div>

      {/* MAIN DOCUMENT CARD (PURE CRISP WHITE) */}
      <div className="shared-doc-card printable-area" style={{ 
        maxWidth: '960px', 
        margin: '0 auto', 
        background: '#ffffff', 
        borderRadius: '28px', 
        overflow: 'visible',
        position: 'relative',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.1)' 
      }}>
        
        {/* CARD CONTENT INNER PADDING */}
        <div className="shared-doc-card-inner" style={{ padding: 'clamp(28px, 5vw, 48px)' }}>
          
          {/* TOP DOCUMENT HEADER */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px', marginBottom: '36px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ 
                  background: '#e0e7ff', 
                  color: '#4338ca', 
                  padding: '6px 14px', 
                  borderRadius: '20px', 
                  fontSize: '0.72rem', 
                  fontWeight: 800, 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.08em' 
                }}>
                  {docTitle}
                </span>
                <span style={{ color: '#0f172a', fontWeight: 800, fontSize: '1.2rem', fontFamily: 'var(--font-display)', whiteSpace: 'nowrap' }}>
                  #{docNumber}
                </span>
                {(docData.quoteRef || docData.quotationNumber || docData.quotation_number) && (
                  <span style={{ 
                    background: '#ede9fe', 
                    color: '#6d28d9', 
                    padding: '4px 12px', 
                    borderRadius: '16px', 
                    fontSize: '0.72rem', 
                    fontWeight: 800,
                    letterSpacing: '0.03em',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <FileText size={12} /> Converted from Quote: #{docData.quoteRef || docData.quotationNumber || docData.quotation_number}
                  </span>
                )}
              </div>
              
              <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 900, color: '#0f172a', margin: '0 0 8px 0', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                {customerName}
              </h1>

              {recipientAddress && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.85rem', fontWeight: 500, marginBottom: '12px' }}>
                  <MapPin size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
                  <span>{recipientAddress}</span>
                </div>
              )}

              {isPO && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  {docData.applyVat ? (
                    <span style={{ 
                      background: 'rgba(16, 185, 129, 0.12)', color: '#059669', 
                      padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800,
                      border: '1px solid rgba(16, 185, 129, 0.25)', display: 'inline-flex', alignItems: 'center', gap: '5px' 
                    }}>
                      <Check size={12} /> VAT Registered ({poVatRate}%) {docData.supplierVatNumber ? `• ${docData.supplierVatNumber}` : ''}
                    </span>
                  ) : (
                    <span style={{ 
                      background: '#f1f5f9', color: '#64748b', 
                      padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 
                    }}>
                      Non-VAT Registered Supplier
                    </span>
                  )}
                  {docData.expectedDelivery && (
                    <span style={{ 
                      background: '#eff6ff', color: '#2563eb', 
                      padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700,
                      display: 'inline-flex', alignItems: 'center', gap: '5px'
                    }}>
                      <Clock size={12} /> Expected Delivery: {docData.expectedDelivery}
                    </span>
                  )}
                </div>
              )}

              <div>
                <div style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
                  ISSUE DATE
                </div>
                <div style={{ color: '#0f172a', fontWeight: 700, fontSize: '0.95rem' }}>
                  {new Date(docData.date || '2026-08-07').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            </div>

            {/* COMPANY LOGO & BRAND DETAILS */}
            <div style={{ textAlign: 'left' }}>
              <div style={{ 
                width: '56px', height: '56px', borderRadius: '16px', 
                background: (smsConfig.receiptLogo || smsConfig.companyLogo) ? '#ffffff' : '#f1f5f9', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '14px', border: '1px solid #e2e8f0',
                overflow: 'hidden'
              }}>
                {(smsConfig.receiptLogo || smsConfig.companyLogo) ? (
                  <img 
                    src={smsConfig.receiptLogo || smsConfig.companyLogo} 
                    alt="Logo" 
                    style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }} 
                  />
                ) : (
                  isQuote ? <FileText size={28} color="#0f172a" /> : 
                  isReceipt ? <CheckCircle size={28} color="#10b981" /> : 
                  <Receipt size={28} color="#0f172a" />
                )}
              </div>
              <div style={{ color: '#0f172a', fontWeight: 900, fontSize: '1.1rem', marginBottom: '2px' }}>
                {smsConfig.companyName || 'Seynex Technology'}
              </div>
              {smsConfig.companyAddress && (
                <div style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 500, marginBottom: '2px' }}>
                  {smsConfig.companyAddress}
                </div>
              )}
              <div style={{ color: '#94a3b8', fontSize: '0.78rem', fontWeight: 500 }}>
                {smsConfig.companyEmail || 'seynextech@gmail.com'} {smsConfig.companyPhone ? `• ${smsConfig.companyPhone}` : ''}
              </div>
              {smsConfig.vatNumber && (
                <div style={{ color: 'var(--accent-primary, #059669)', fontSize: '0.75rem', fontWeight: 700, marginTop: '2px' }}>
                  VAT Reg No: {smsConfig.vatNumber}
                </div>
              )}
            </div>
          </div>

          {/* CLIENT / BILL TO ADDRESS BAR */}
          <div className="shared-address-bar" style={{
            background: 'linear-gradient(135deg, rgba(248, 250, 252, 0.98), rgba(241, 245, 249, 0.9))',
            border: '1px solid #e2e8f0',
            borderRadius: '18px',
            padding: '18px 24px',
            marginBottom: '32px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '20px',
            alignItems: 'center',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)'
          }}>
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <MapPin size={13} style={{ color: '#6366f1' }} />
                <span>{isQuote ? 'PROPOSAL PREPARED FOR / CLIENT ADDRESS' : (isPO ? 'AUTHORIZED SUPPLIER / BILL TO' : 'BILLED TO / CLIENT ADDRESS')}</span>
              </div>
              <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '1.2rem', marginBottom: '4px', letterSpacing: '-0.02em' }}>
                {customerName}
              </div>
              <div style={{ color: '#475569', fontSize: '0.88rem', fontWeight: 500, display: 'flex', alignItems: 'flex-start', gap: '6px', lineHeight: 1.4 }}>
                <span>{recipientAddress || 'Client address on file / Available upon request'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                  ISSUE DATE
                </div>
                <div style={{ color: '#0f172a', fontWeight: 800, fontSize: '0.95rem' }}>
                  {new Date(docData.date || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>

              {(docData.dueDate || docData.validUntil) && (
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                    {isQuote ? 'OFFER VALID UNTIL' : 'PAYMENT DUE'}
                  </div>
                  <div style={{ color: '#0f172a', fontWeight: 800, fontSize: '0.95rem' }}>
                    {new Date(docData.dueDate || docData.validUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              )}

              {docData.status && (
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                    STATUS
                  </div>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: '12px',
                    background: (docData.status === 'Paid' || docData.status === 'Accepted' || docData.status === 'Converted to Invoice') ? 'rgba(16, 185, 129, 0.12)' : 'rgba(99, 102, 241, 0.12)',
                    color: (docData.status === 'Paid' || docData.status === 'Accepted' || docData.status === 'Converted to Invoice') ? '#059669' : '#4f46e5',
                    border: `1px solid ${(docData.status === 'Paid' || docData.status === 'Accepted' || docData.status === 'Converted to Invoice') ? 'rgba(16, 185, 129, 0.25)' : 'rgba(99, 102, 241, 0.25)'}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {docData.status}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* BILLING ITEMS DARK BOX */}
          <div className="shared-billing-card" style={{ 
            background: '#0f172a', 
            borderRadius: '24px', 
            padding: '24px 20px', 
            marginBottom: '32px',
            boxShadow: '0 10px 25px rgba(15, 23, 42, 0.2)'
          }}>
            <div style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '18px' }}>
              BILLING ITEMS
            </div>

            {/* Desktop Table View (>= 641px) */}
            <div className="desktop-billing-table" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <div style={{ minWidth: '500px' }}>
                <div style={{ display: 'flex', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>
                  <div style={{ flex: 1 }}>DESCRIPTION</div>
                  <div style={{ width: '105px', textAlign: 'center' }}>TYPE</div>
                  <div style={{ width: '110px', textAlign: 'center' }}>FEE TYPE</div>
                  <div style={{ width: '55px', textAlign: 'center' }}>QTY</div>
                  <div style={{ width: '115px', textAlign: 'right' }}>OFFER PRICE</div>
                  <div style={{ width: '135px', textAlign: 'right' }}>TOTAL</div>
                </div>

                {standardItems.map((item, idx) => {
                  const p = getItemPrice(item);
                  const q = getItemQty(item);
                  const name = getItemName(item);
                  const cycle = getItemBillingCycle(item);
                  const isOneTime = cycle === 'One-Time';
                  const itemType = getItemClassification(item);
                  return (
                    <div key={idx} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: '16px 0', 
                      borderBottom: (idx === standardItems.length - 1 && discountAmount === 0) ? 'none' : '1px solid rgba(255,255,255,0.06)' 
                    }}>
                      <div style={{ flex: 1, color: '#ffffff', fontWeight: 750, fontSize: '0.92rem', textTransform: 'uppercase', letterSpacing: '0.01em', paddingRight: '12px' }}>
                        {name}
                      </div>
                      <div style={{ width: '105px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '10px',
                          background: itemType === 'Hardware' ? 'rgba(14, 165, 233, 0.12)' : (itemType === 'Software' ? 'rgba(168, 85, 247, 0.12)' : 'rgba(16, 185, 129, 0.12)'),
                          color: itemType === 'Hardware' ? '#38bdf8' : (itemType === 'Software' ? '#c084fc' : '#34d399'),
                          border: `1px solid ${itemType === 'Hardware' ? 'rgba(14, 165, 233, 0.28)' : (itemType === 'Software' ? 'rgba(168, 85, 247, 0.28)' : 'rgba(16, 185, 129, 0.28)')}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {itemType === 'Hardware' ? <Cpu size={11} /> : (itemType === 'Software' ? <Monitor size={11} /> : <Wrench size={11} />)}
                          {itemType}
                        </span>
                      </div>
                      <div style={{ width: '110px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 9px',
                          borderRadius: '12px',
                          background: isOneTime ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.16)',
                          color: isOneTime ? '#fbbf24' : '#a5b4fc',
                          border: `1px solid ${isOneTime ? 'rgba(245, 158, 11, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: isOneTime ? '#fbbf24' : '#818cf8', flexShrink: 0 }}></span>
                          {isOneTime ? 'One-Time' : (cycle === 'Monthly' ? 'Monthly' : 'Annual')}
                        </span>
                      </div>
                      <div style={{ width: '55px', textAlign: 'center', color: '#ffffff', fontWeight: 700, fontSize: '0.95rem' }}>
                        {q}
                      </div>
                      <div style={{ width: '115px', textAlign: 'right', color: '#cbd5e1', fontWeight: 600, fontSize: '0.95rem' }}>
                        {p.toLocaleString()}
                      </div>
                      <div style={{ width: '135px', textAlign: 'right', color: '#ffffff', fontWeight: 900, fontSize: '1.1rem' }}>
                        {(p * q).toLocaleString()}
                      </div>
                    </div>
                  );
                })}

                {/* DEDICATED DISCOUNT MODULE LINE ITEM */}
                {discountAmount > 0 && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '16px 0 0 0', 
                    borderTop: '1px dashed rgba(245, 158, 11, 0.4)',
                    marginTop: '12px'
                  }}>
                    <div style={{ flex: 1, color: '#f59e0b', fontWeight: 800, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Tag size={16} color="#f59e0b" />
                      <span>SPECIAL BUNDLE DISCOUNT APPLIED</span>
                    </div>
                    <div style={{ width: '105px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 700 }}>Bundle Offer</span>
                    </div>
                    <div style={{ width: '110px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 700 }}>Deduction</span>
                    </div>
                    <div style={{ width: '55px', textAlign: 'center', color: '#f59e0b', fontWeight: 700, fontSize: '0.9rem' }}>
                      1
                    </div>
                    <div style={{ width: '115px', textAlign: 'right', color: '#f59e0b', fontWeight: 600, fontSize: '0.9rem' }}>
                      - {discountAmount.toLocaleString()}
                    </div>
                    <div style={{ width: '135px', textAlign: 'right', color: '#f59e0b', fontWeight: 900, fontSize: '1.1rem' }}>
                      - LKR {discountAmount.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Stacked List View (<= 640px) */}
            <div className="mobile-billing-list">
              {standardItems.map((item, idx) => {
                const p = getItemPrice(item);
                const q = getItemQty(item);
                const name = getItemName(item);
                const cycle = getItemBillingCycle(item);
                const isOneTime = cycle === 'One-Time';
                const itemType = getItemClassification(item);
                return (
                  <div key={idx} style={{ 
                    padding: '14px 0', 
                    borderBottom: (idx === standardItems.length - 1 && discountAmount === 0) ? 'none' : '1px solid rgba(255,255,255,0.08)' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ 
                        color: '#ffffff', 
                        fontWeight: 750, 
                        fontSize: '0.92rem', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.01em',
                        lineHeight: 1.35,
                        wordBreak: 'break-word',
                        flex: 1
                      }}>
                        {name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '8px',
                          background: itemType === 'Hardware' ? 'rgba(14, 165, 233, 0.12)' : (itemType === 'Software' ? 'rgba(168, 85, 247, 0.12)' : 'rgba(16, 185, 129, 0.12)'),
                          color: itemType === 'Hardware' ? '#38bdf8' : (itemType === 'Software' ? '#c084fc' : '#34d399'),
                          border: `1px solid ${itemType === 'Hardware' ? 'rgba(14, 165, 233, 0.28)' : (itemType === 'Software' ? 'rgba(168, 85, 247, 0.28)' : 'rgba(16, 185, 129, 0.28)')}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          {itemType === 'Hardware' ? <Cpu size={10} /> : (itemType === 'Software' ? <Monitor size={10} /> : <Wrench size={10} />)}
                          {itemType}
                        </span>
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '8px',
                          background: isOneTime ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.16)',
                          color: isOneTime ? '#fbbf24' : '#a5b4fc',
                          border: `1px solid ${isOneTime ? 'rgba(245, 158, 11, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: isOneTime ? '#fbbf24' : '#818cf8', flexShrink: 0 }}></span>
                          {isOneTime ? 'One-Time' : (cycle === 'Monthly' ? 'Monthly' : 'Annual')}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600 }}>
                        <span style={{ color: '#64748b' }}>Qty: </span>
                        <span style={{ color: '#ffffff', fontWeight: 800 }}>{q}</span>
                        <span style={{ color: '#64748b', margin: '0 4px' }}>×</span>
                        <span style={{ color: '#cbd5e1' }}>LKR {p.toLocaleString()}</span>
                      </div>
                      <div style={{ color: '#ffffff', fontWeight: 900, fontSize: '1.05rem', fontFamily: 'monospace' }}>
                        LKR {(p * q).toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* DEDICATED DISCOUNT MODULE LINE ITEM FOR MOBILE */}
              {discountAmount > 0 && (
                <div style={{ 
                  padding: '14px 0 4px 0', 
                  borderTop: '1px dashed rgba(245, 158, 11, 0.4)',
                  marginTop: '10px'
                }}>
                  <div style={{ 
                    color: '#f59e0b', 
                    fontWeight: 800, 
                    fontSize: '0.85rem', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.02em', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    marginBottom: '6px'
                  }}>
                    <Tag size={15} color="#f59e0b" />
                    <span>SPECIAL BUNDLE DISCOUNT APPLIED</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ color: 'rgba(245, 158, 11, 0.85)', fontSize: '0.8rem', fontWeight: 700 }}>
                      1 Promo Offer
                    </div>
                    <div style={{ color: '#f59e0b', fontWeight: 900, fontSize: '1.05rem', fontFamily: 'monospace' }}>
                      - LKR {discountAmount.toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM TWO CARDS ROW (VALIDITY + ACCOUNT STATUS) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '24px', alignItems: 'stretch' }}>
            
            {/* ESTIMATE VALIDITY */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isReceipt ? '#10b981' : '#3b82f6', marginBottom: '10px' }}>
                {isReceipt ? <ShieldCheck size={16} /> : <Clock size={16} />}
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {isReceipt ? 'RECEIPT VERIFICATION' : 'ESTIMATE VALIDITY'}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6 }}>
                {isReceipt 
                  ? `Official Electronic Receipt issued by ${smsConfig.companyName || 'Seynex Technology'}. Authorized for finance audit, settlement acknowledgement, and bookkeeping records.`
                  : isPO 
                  ? 'Official Purchase Order generated by Seynex Procurement ERP.' 
                  : 'This quotation is valid for 30 days from the date of issue. Special bundle discounts applied are contingent on current stock levels.'}
              </p>
            </div>

            {/* ACCOUNT STATUS & TOTAL AMOUNT DARK CARD */}
            <div className="shared-account-card" style={{ background: '#0f172a', borderRadius: '24px', padding: '28px 32px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                    {isReceipt ? 'RECEIPT STATUS' : 'ACCOUNT STATUS'}
                  </div>
                  <div style={{ 
                    color: (isApproved || isReceipt) ? '#10b981' : docData.status === 'Rejected' ? '#ef4444' : '#f59e0b', 
                    fontWeight: 900, 
                    fontSize: '1rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px' 
                  }}>
                    {(isApproved || isReceipt) ? <CheckCircle size={16} /> : docData.status === 'Rejected' ? <XCircle size={16} /> : <Clock size={16} />}
                    {isReceipt ? 'SETTLED & CREDITED' : (docData.status || 'Active').toUpperCase()}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                    {isReceipt ? 'AMOUNT CREDITED' : 'TOTAL AMOUNT'}
                  </div>
                  <div style={{ color: '#ffffff', fontWeight: 900, fontSize: '1.1rem' }}>
                    LKR {Number(docData.amount || totalAmount).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* DIRECT TAP TO VIEW INVOICE (ESPECIALLY HANDY ON MOBILE) */}
              {docData.convertedInvoiceNumber && (
                <div style={{ marginBottom: '16px' }}>
                  <a
                    href={`/share/invoice/${docData.convertedInvoiceId || docData.convertedInvoiceNumber}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#ffffff',
                      textDecoration: 'none',
                      padding: '12px 18px',
                      borderRadius: '14px',
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      boxShadow: '0 6px 18px rgba(16, 185, 129, 0.35)',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  >
                    <Receipt size={17} /> VIEW TAX INVOICE #{docData.convertedInvoiceNumber}
                  </a>
                </div>
              )}

              {isPO && docData.applyVat ? (
                <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                    <span style={{ color: '#cbd5e1' }}>Items Subtotal:</span>
                    <span style={{ color: '#ffffff', fontWeight: 700, fontFamily: 'monospace' }}>LKR {subTotal.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#34d399' }}>
                    <span style={{ fontWeight: 700 }}>VAT ({poVatRate}%):</span>
                    <span style={{ fontWeight: 900, fontFamily: 'monospace' }}>+ LKR {poVatAmount.toLocaleString()}</span>
                  </div>
                  {docData.supplierVatNumber && (
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px', textAlign: 'right' }}>
                      Vendor VAT Reg: {docData.supplierVatNumber}
                    </div>
                  )}
                </div>
              ) : discountAmount > 0 ? (
                <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                    <span style={{ color: '#cbd5e1' }}>Gross Subtotal:</span>
                    <span style={{ color: '#ffffff', fontWeight: 700, fontFamily: 'monospace' }}>LKR {subTotal.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#f59e0b' }}>
                    <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}><Tag size={12} /> Special Discount:</span>
                    <span style={{ fontWeight: 900, fontFamily: 'monospace' }}>- LKR {discountAmount.toLocaleString()}</span>
                  </div>
                </div>
              ) : null}

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', marginBottom: '20px' }}></div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#3b82f6', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                  {isPO ? (docData.applyVat ? 'TOTAL PURCHASE ORDER VALUE (INCL. VAT)' : 'TOTAL PURCHASE ORDER VALUE (NON-VAT)') : isQuote ? 'PROJECTED INVESTMENT' : 'CURRENT BALANCE DUE'}
                </div>
                <div style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: 900, color: '#ffffff', fontFamily: 'var(--font-display)', letterSpacing: '-0.04em', lineHeight: 1, wordBreak: 'break-word' }}>
                  <span style={{ fontSize: '1rem', color: '#94a3b8', marginRight: '8px', fontWeight: 700 }}>LKR</span>
                  {totalAmount.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* PO SUPPLIER ACTIONS & ACKNOWLEDGMENT */}
          {isPO && (
            <div className="no-print" style={{ marginTop: '36px' }}>
              <div style={{
                padding: '24px', borderRadius: '20px',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(5, 150, 105, 0.03))',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                display: 'flex', flexDirection: 'column', gap: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontWeight: 800, fontSize: '1.05rem', marginBottom: '4px' }}>
                      <ShoppingBag size={20} /> OFFICIAL PURCHASE ORDER ISSUED
                    </div>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
                      This order has been officially placed by {smsConfig?.companyName || 'Seynex Enterprises'}. Please confirm order acceptance and schedule shipment.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => {
                        const buyerPhone = (smsConfig?.companyPhone || '0728408880').replace(/[^0-9]/g, '');
                        const cleanPhone = buyerPhone.startsWith('0') ? '94' + buyerPhone.slice(1) : (buyerPhone.startsWith('94') ? buyerPhone : '94' + buyerPhone);
                        const msg = encodeURIComponent(`Hi! This is ${customerName}. We acknowledge receipt of Purchase Order #${docData.poNumber} (Total: LKR ${totalAmount.toLocaleString()}${docData.applyVat ? ` incl. ${poVatRate}% VAT` : ''}). We confirm the items and are processing dispatch by ${docData.expectedDelivery || 'the agreed date'}.`);
                        window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
                      }}
                      className="btn"
                      style={{ background: '#25D366', color: '#ffffff', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0 20px', height: '42px', borderRadius: '12px', border: 'none', cursor: 'pointer' }}
                    >
                      <MessageSquare size={16} /> Acknowledge via WhatsApp
                    </button>
                    <button
                      onClick={handleDownloadPDF}
                      className="btn btn-secondary"
                      style={{ height: '42px', borderRadius: '12px' }}
                    >
                      <Download size={16} /> Download PO PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* QUOTATION STATUS NOTICES & INTERACTIVE CUSTOMER ACTIONS */}
          {isQuote && (
            <div className="no-print" style={{ marginTop: '36px' }}>
              {docData.status === 'Expired' && (
                <div style={{
                  padding: '24px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)', textAlign: 'center'
                }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 800, fontSize: '1rem', marginBottom: '8px' }}>
                    <AlertTriangle size={20} /> QUOTATION EXPIRED
                  </div>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                    This quotation expired on {docData.validUntil ? new Date(docData.validUntil).toLocaleDateString() : 'its validity date'}. Please contact us to request an updated quotation.
                  </p>
                </div>
              )}

              {(docData.status === 'Accepted' || docData.status === 'Converted to Invoice') && (
                <div style={{
                  padding: '28px 24px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)', textAlign: 'center'
                }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 800, fontSize: '1.15rem', marginBottom: '8px' }}>
                    <CheckCircle size={24} /> QUOTATION ACCEPTED
                  </div>
                  <p style={{ margin: '0 0 16px 0', color: '#475569', fontSize: '0.92rem' }}>
                    This proposal was accepted {docData.acceptedAt ? `on ${new Date(docData.acceptedAt).toLocaleDateString()}` : 'on record'}.
                    {docData.convertedInvoiceNumber ? ` Tax Invoice #${docData.convertedInvoiceNumber} has been automatically created.` : ' Our team has been notified and issued your invoice.'}
                  </p>
                  {docData.convertedInvoiceNumber && (
                    <a
                      href={`/share/invoice/${docData.convertedInvoiceId || docData.convertedInvoiceNumber}`}
                      className="btn btn-primary"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: '#fff', textDecoration: 'none', padding: '12px 26px',
                        borderRadius: '12px', fontWeight: 800, fontSize: '0.92rem',
                        boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      <Receipt size={18} /> VIEW TAX INVOICE #{docData.convertedInvoiceNumber}
                    </a>
                  )}
                </div>
              )}

              {docData.status === 'Counter Offer' && (
                <div style={{
                  padding: '24px', borderRadius: '20px', background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.25)', textAlign: 'center'
                }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontWeight: 800, fontSize: '1.05rem', marginBottom: '6px' }}>
                    <DollarSign size={20} /> COUNTER OFFER SUBMITTED
                  </div>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                    Your proposed budget has been received by our management team. We will review your notes and respond promptly.
                  </p>
                </div>
              )}

              {docData.status === 'Rejected' && (
                <div style={{
                  padding: '24px', borderRadius: '20px', background: 'rgba(148, 163, 184, 0.08)',
                  border: '1px solid rgba(148, 163, 184, 0.25)', textAlign: 'center'
                }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#64748b', fontWeight: 800, fontSize: '1rem', marginBottom: '6px' }}>
                    <XCircle size={20} /> QUOTATION DECLINED
                  </div>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>
                    This proposal was marked as declined. If your requirements change, feel free to reach out.
                  </p>
                </div>
              )}

              {(docData.status === 'Pending' || docData.status === 'Sent' || docData.status === 'Draft' || docData.status === 'Counter Offer') && (
                <div className="cta-container" style={{ 
                  padding: '36px 32px', 
                  background: '#f8fafc', 
                  borderRadius: '24px', 
                  border: '1px solid #e2e8f0', 
                  textAlign: 'center' 
                }}>
                  {isPreview && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'rgba(59, 130, 246, 0.1)',
                      color: '#2563eb',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      padding: '4px 14px',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '16px'
                    }}>
                      Interactive Client Portal View
                    </div>
                  )}
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>
                    {docData.status === 'Counter Offer' ? 'Review & Update Response' : 'Ready to proceed?'}
                  </h3>
                  <p style={{ maxWidth: '600px', margin: '0 auto 28px auto', fontSize: '0.95rem', color: '#64748b' }}>
                    {docData.status === 'Counter Offer'
                      ? 'You can accept the proposal at any time, submit an updated budget offer, or decline.'
                      : 'Choose an option below to approve the proposal, propose a custom budget, or decline.'}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                    {/* ACCEPT BUTTON */}
                    <button 
                      type="button"
                      disabled={isSubmitting}
                      onClick={async () => { 
                        setIsSubmitting(true);
                        try {
                          let res = null;
                          if (acceptQuote) {
                            res = await acceptQuote(docData.id || id, '', docData);
                          }
                          const nowIso = new Date().toISOString();
                          const invNum = res?.invoice?.invoiceNumber || docData.convertedInvoiceNumber || null;
                          const invId = res?.invoice?.id || res?.invoice?.shareKey || docData.convertedInvoiceId || null;
                          const nextStatus = invNum ? 'Converted to Invoice' : 'Accepted';
                          
                          const acceptedData = {
                            ...docData,
                            status: nextStatus,
                            convertedInvoiceNumber: invNum,
                            convertedInvoiceId: invId,
                            acceptedAt: nowIso
                          };

                          setDocData(acceptedData);

                          // Instantly persist in localStorage so immediate reload preserves state
                          try {
                            const storedQuotes = JSON.parse(localStorage.getItem('gym_quotes') || '[]');
                            const nextList = storedQuotes.map(sq => {
                              if (sq.id === acceptedData.id || sq.shareKey === acceptedData.shareKey || sq.quoteNumber === acceptedData.quoteNumber) {
                                return { ...sq, ...acceptedData };
                              }
                              return sq;
                            });
                            if (!nextList.some(sq => sq.id === acceptedData.id || sq.shareKey === acceptedData.shareKey)) {
                              nextList.unshift(acceptedData);
                            }
                            localStorage.setItem('gym_quotes', JSON.stringify(nextList));
                          } catch (e) {}

                          setShowGratitude(true);
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                      className="btn btn-primary" 
                      style={{ 
                        background: 'linear-gradient(135deg, #10b981, #059669)', 
                        padding: '14px 28px', 
                        fontWeight: 800,
                        fontSize: '0.95rem',
                        boxShadow: '0 8px 20px rgba(16, 185, 129, 0.35)',
                        border: 'none',
                        cursor: 'pointer'
                      }}>
                      <CheckCircle size={18} /> ACCEPT QUOTATION
                    </button>

                    {/* PROPOSE BUDGET BUTTON */}
                    <button 
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        setProposedAmount(docData.amount?.toString() || '');
                        setShowProposeModal(true);
                      }}
                      className="btn" 
                      style={{ 
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)', 
                        color: '#ffffff',
                        padding: '14px 26px', 
                        fontWeight: 800,
                        fontSize: '0.95rem',
                        boxShadow: '0 8px 20px rgba(245, 158, 11, 0.25)',
                        border: 'none',
                        cursor: 'pointer'
                      }}>
                      <DollarSign size={18} /> {docData.status === 'Counter Offer' ? 'REVISE COUNTER OFFER' : 'PROPOSE BUDGET'}
                    </button>

                    {/* REJECT BUTTON */}
                    <button 
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setShowRejectModal(true)}
                      className="btn btn-secondary" 
                      style={{ 
                        color: '#ef4444', 
                        background: '#fef2f2', 
                        border: '1px solid #fee2e2', 
                        padding: '14px 22px', 
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        cursor: 'pointer'
                      }}>
                      <XCircle size={18} /> REJECT QUOTATION
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER BAR */}
        <div className="shared-doc-footer" style={{ 
          background: '#0f172a', 
          padding: '20px 32px', 
          position: 'relative',
          borderBottomLeftRadius: '28px',
          borderBottomRightRadius: '28px',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #0ea5e9, #8b5cf6, #ec4899)' }}></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></div>
              <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>
                Authenticated Computer-Generated Document
              </span>
            </div>

            <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>
              Powered by <strong style={{ color: '#ffffff', fontWeight: 800 }}>{smsConfig.dashboardName || smsConfig.companyName || 'GymSales Pro'}</strong>
            </div>
          </div>
        </div>

      </div>

      {/* ANIMATION STYLES FOR CONFIRMATION MODAL */}
      <style>{`
        @keyframes confFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes confPopIn {
          0% { opacity: 0; transform: scale(0.86) translateY(20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes confCheckBounce {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.22); opacity: 1; }
          75% { transform: scale(0.92); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes confRipple {
          0% { transform: scale(0.85); opacity: 0.85; }
          65% { transform: scale(1.55); opacity: 0; }
          100% { transform: scale(1.55); opacity: 0; }
        }
        @keyframes confSparkFloat {
          0% { transform: translateY(0) scale(0.8); opacity: 0.6; }
          100% { transform: translateY(-9px) scale(1.2); opacity: 1; }
        }
        @keyframes confSlideUp {
          0% { opacity: 0; transform: translateY(14px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes confShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      {/* GRATITUDE MODAL */}
      {showGratitude && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.88)', backdropFilter: 'blur(20px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '24px',
          animation: 'confFadeIn 0.3s ease-out forwards'
        }}>
          <div className="glass-panel" style={{ 
            maxWidth: '490px', width: '100%', textAlign: 'center', padding: '44px 32px 36px',
            borderRadius: '24px',
            border: '1px solid rgba(16, 185, 129, 0.38)',
            boxShadow: '0 32px 70px -10px rgba(0,0,0,0.7), 0 0 45px rgba(16, 185, 129, 0.22)',
            background: 'linear-gradient(160deg, #131d31 0%, #0c1322 100%)',
            position: 'relative',
            overflow: 'hidden',
            animation: 'confPopIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}>
            {/* Top ambient glow arc */}
            <div style={{
              position: 'absolute', top: '-55px', left: '50%', transform: 'translateX(-50%)',
              width: '260px', height: '120px', borderRadius: '50%',
              background: 'radial-gradient(ellipse, rgba(16, 185, 129, 0.35) 0%, transparent 70%)',
              pointerEvents: 'none'
            }} />

            {/* Pulsing checkmark with celebratory micro-sparks */}
            <div style={{ position: 'relative', width: '92px', height: '92px', margin: '0 auto 24px auto' }}>
              {/* Outer expanding halo ripple 1 */}
              <div style={{
                position: 'absolute', inset: '-6px', borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.28)',
                animation: 'confRipple 2s ease-out infinite'
              }} />
              {/* Outer expanding halo ripple 2 */}
              <div style={{
                position: 'absolute', inset: '-14px', borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.16)',
                animation: 'confRipple 2s ease-out 0.65s infinite'
              }} />

              {/* Central Glowing Icon Circle */}
              <div style={{
                position: 'relative', width: '100%', height: '100%', borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 10px 28px rgba(16, 185, 129, 0.5), inset 0 2px 0 rgba(255, 255, 255, 0.35)',
                animation: 'confCheckBounce 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) 0.12s both'
              }}>
                <CheckCircle size={50} color="#ffffff" strokeWidth={2.4} />
              </div>

              {/* Celebratory floating spark particles */}
              <div style={{ position: 'absolute', top: '-4px', left: '-4px', width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px #34d399', animation: 'confSparkFloat 1.8s ease-in-out infinite alternate' }} />
              <div style={{ position: 'absolute', top: '2px', right: '-6px', width: '9px', height: '9px', borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 8px #fbbf24', animation: 'confSparkFloat 2.1s ease-in-out 0.3s infinite alternate' }} />
              <div style={{ position: 'absolute', bottom: '6px', left: '-8px', width: '9px', height: '9px', borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 8px #38bdf8', animation: 'confSparkFloat 1.9s ease-in-out 0.6s infinite alternate' }} />
              <div style={{ position: 'absolute', bottom: '-2px', right: '-4px', width: '7px', height: '7px', borderRadius: '50%', background: '#a7f3d0', boxShadow: '0 0 6px #a7f3d0', animation: 'confSparkFloat 1.7s ease-in-out 0.2s infinite alternate' }} />
            </div>

            <h2 style={{ 
              fontSize: '1.9rem', marginBottom: '10px', color: '#ffffff', fontWeight: 900,
              letterSpacing: '-0.02em',
              animation: 'confSlideUp 0.4s ease-out 0.2s both'
            }}>
              Quotation Accepted!
            </h2>
            <p style={{ 
              fontSize: '1.02rem', lineHeight: 1.55, marginBottom: '8px', color: '#e2e8f0',
              animation: 'confSlideUp 0.4s ease-out 0.28s both'
            }}>
              Thank you, <strong style={{ color: '#38bdf8', fontWeight: 800 }}>{customerName}</strong>! Your acceptance has been registered.
            </p>
            <p style={{ 
              fontSize: '0.86rem', lineHeight: 1.6, marginBottom: '28px', color: '#94a3b8',
              animation: 'confSlideUp 0.4s ease-out 0.35s both'
            }}>
              Your invoice has been <strong style={{ color: '#34d399' }}>automatically generated</strong> and our team has been notified. 
              You will receive your invoice shortly via WhatsApp or SMS.
            </p>

            {/* Action buttons with staggered entrance */}
            <div style={{ animation: 'confSlideUp 0.4s ease-out 0.42s both' }}>
              {docData?.convertedInvoiceId && (
                <a
                  href={`${window.location.origin}/share/invoice/${docData.convertedInvoiceId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    width: '100%', height: '50px', fontWeight: 800, marginBottom: '12px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none', textDecoration: 'none', borderRadius: '12px',
                    color: '#fff', fontSize: '0.94rem',
                    boxShadow: '0 8px 22px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
                    cursor: 'pointer'
                  }}
                >
                  <Receipt size={19} /> View Your Invoice #{docData.convertedInvoiceNumber || ''}
                </a>
              )}

              <button 
                className="btn btn-secondary" 
                style={{ 
                  width: '100%', height: '46px', fontWeight: 700, fontSize: '0.9rem',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#e2e8f0',
                  border: '1px solid rgba(255, 255, 255, 0.12)'
                }} 
                onClick={() => setShowGratitude(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROPOSE BUDGET (COUNTER OFFER) MODAL */}
      {showProposeModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.9)', backdropFilter: 'blur(20px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '24px'
        }}>
          <div className="glass-panel" style={{ 
            maxWidth: '520px', width: '100%', padding: '36px',
            border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 32px 64px rgba(0,0,0,0.5)',
            background: '#0f172a'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DollarSign size={22} color="#f59e0b" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>Propose Custom Budget</h3>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>Submit your proposed amount and requirements to our team.</p>
              </div>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsSubmitting(true);
              try {
                if (proposeBudget) {
                  await proposeBudget(docData.id || id, {
                    proposedBudget: proposedAmount,
                    message: counterMessage,
                    preferredChanges,
                    directQuote: docData
                  });
                }
                setDocData(prev => ({ 
                  ...prev, 
                  status: 'Counter Offer',
                  lastCounterOffer: {
                    proposedBudget: Number(proposedAmount),
                    message: counterMessage,
                    preferredChanges,
                    createdAt: new Date().toISOString()
                  }
                }));
                setShowProposeModal(false);
                showNotification(`Your counter offer of LKR ${Number(proposedAmount).toLocaleString()} was submitted! Owner notified via SMS.`, 'success');
              } catch (err) {
                console.error('Error submitting counter offer:', err);
                showNotification('Failed to submit proposal. Please try again.', 'error');
              } finally {
                setIsSubmitting(false);
              }
            }}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>
                  Proposed Total Budget (LKR) *
                </label>
                <input 
                  type="number"
                  required
                  placeholder="e.g. 250000"
                  value={proposedAmount}
                  onChange={(e) => setProposedAmount(e.target.value)}
                  style={{
                    width: '100%', height: '48px', padding: '0 16px', borderRadius: '12px',
                    background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)',
                    color: '#ffffff', fontSize: '1.1rem', fontWeight: 800
                  }}
                />
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '6px' }}>
                  Original Quotation Amount: <strong>LKR {(Number(docData.amount) || 0).toLocaleString()}</strong>
                  {proposedAmount && (
                    <span style={{ marginLeft: '8px', color: (Number(proposedAmount) - Number(docData.amount)) < 0 ? '#f59e0b' : '#10b981' }}>
                      (Diff: LKR {(Number(proposedAmount) - Number(docData.amount)).toLocaleString()})
                    </span>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>
                  Message to Seynex Team (Optional)
                </label>
                <textarea 
                  rows={3}
                  placeholder="Add any specific payment constraints or notes..."
                  value={counterMessage}
                  onChange={(e) => setCounterMessage(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '12px',
                    background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)',
                    color: '#ffffff', fontSize: '0.88rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>
                  Preferred Changes / Exclusions (Optional)
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Remove biometric scanner module or extend license"
                  value={preferredChanges}
                  onChange={(e) => setPreferredChanges(e.target.value)}
                  style={{
                    width: '100%', height: '44px', padding: '0 16px', borderRadius: '12px',
                    background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)',
                    color: '#ffffff', fontSize: '0.88rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowProposeModal(false)}
                  style={{ height: '44px', padding: '0 20px', color: '#cbd5e1' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="btn" 
                  style={{ height: '44px', padding: '0 24px', background: '#f59e0b', color: '#ffffff', fontWeight: 800 }}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Counter Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECT QUOTATION MODAL */}
      {showRejectModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.9)', backdropFilter: 'blur(20px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '24px'
        }}>
          <div className="glass-panel" style={{ 
            maxWidth: '460px', width: '100%', padding: '36px',
            border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 32px 64px rgba(0,0,0,0.5)',
            background: '#0f172a'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <XCircle size={22} color="#ef4444" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>Decline Proposal</h3>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>Confirm declining Quotation #{docData.quoteNumber}</p>
              </div>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsSubmitting(true);
              try {
                if (rejectQuote) {
                  await rejectQuote(docData.id || id, rejectionReason, docData);
                }
                setDocData(prev => ({ ...prev, status: 'Rejected', rejectionReason }));
                setShowRejectModal(false);
                showNotification('Quotation has been declined.', 'info');
              } finally {
                setIsSubmitting(false);
              }
            }}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>
                  Reason for declining (Optional)
                </label>
                <textarea 
                  rows={3}
                  placeholder="e.g. Budget constraints, opted for another solution, or postponing project..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '12px',
                    background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)',
                    color: '#ffffff', fontSize: '0.88rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowRejectModal(false)}
                  style={{ height: '44px', padding: '0 20px', color: '#cbd5e1' }}
                >
                  Back
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="btn" 
                  style={{ height: '44px', padding: '0 24px', background: '#ef4444', color: '#ffffff', fontWeight: 800 }}
                >
                  {isSubmitting ? 'Declining...' : 'Confirm Decline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SharedDocument;
