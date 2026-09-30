import React, { useContext, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { StoreContext } from '../context/StoreContext';
import { supabase } from '../lib/supabase';
import { generateDocumentPDF, generatePurchaseOrderPDF, generatePaymentReceiptPDF } from '../utils/pdfGenerator';
import { Download, Printer, CheckCircle, XCircle, FileText, Receipt, Clock, ShieldCheck, Tag, DollarSign, MessageSquare, AlertTriangle, Send, ShoppingBag, Check } from 'lucide-react';

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
          foundDoc = quotes.find(item => item.id === id || item.shareKey === id);
          if (!foundDoc) {
            const query = supabase.from('quotations').select('*');
            if (isUUID) query.or(`id.eq.${id},share_key.eq.${id}`);
            else query.eq('share_key', id);

            const { data, error } = await query.single();
            if (data && !error) {
              foundDoc = { 
                ...data, 
                shareKey: data.share_key, 
                quoteNumber: data.quote_number,
                prospectName: data.prospect_name
              };
            }
          }

          if (foundDoc) {
            setDocData(foundDoc);
            setCustomerName(foundDoc.prospectName || 'My Fitness Gym');
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
          foundDoc = invoices.find(item => item.id === id || item.shareKey === id);
          if (!foundDoc) {
            const query = supabase.from('invoices').select('*');
            if (isUUID) query.or(`id.eq.${id},share_key.eq.${id}`);
            else query.eq('share_key', id);

            const { data, error } = await query.single();
            if (data && !error) {
              foundDoc = { 
                ...data, 
                shareKey: data.share_key, 
                invoiceNumber: data.invoice_number,
                dueDate: data.due_date,
                customerId: data.customer_id,
                reminderSent: data.reminder_sent,
                prospectName: data.prospect_name
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

  const handlePrint = () => window.print();

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

  const isApproved = isPO ? (docData.status === 'Received' || docData.status === 'Delivered') : (docData.status === 'Paid' || docData.status === 'Accepted');

  return (
    <div style={{ 
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
          <button onClick={handlePrint} className="btn btn-secondary" style={{ background: 'rgba(255,255,255,0.08)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)', height: '42px' }}>
            <Printer size={18} /> Print
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
      <div style={{ 
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
        <div style={{ padding: 'clamp(28px, 5vw, 48px)' }}>
          
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
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Ref: #{docData.quoteRef || docData.quotationNumber || docData.quotation_number}
                  </span>
                )}
              </div>
              
              <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 900, color: '#0f172a', margin: '0 0 8px 0', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                {customerName}
              </h1>

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

            <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <div style={{ minWidth: '420px' }}>
                <div style={{ display: 'flex', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>
                  <div style={{ flex: 1 }}>DESCRIPTION</div>
                  <div style={{ width: '60px', textAlign: 'center' }}>QTY</div>
                  <div style={{ width: '120px', textAlign: 'right' }}>OFFER PRICE</div>
                  <div style={{ width: '140px', textAlign: 'right' }}>TOTAL</div>
                </div>

                {standardItems.map((item, idx) => {
                  const p = getItemPrice(item);
                  const q = getItemQty(item);
                  const name = getItemName(item);
                  return (
                    <div key={idx} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: '16px 0', 
                      borderBottom: (idx === standardItems.length - 1 && discountAmount === 0) ? 'none' : '1px solid rgba(255,255,255,0.06)' 
                    }}>
                      <div style={{ flex: 1, color: '#ffffff', fontWeight: 800, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                        {name}
                      </div>
                      <div style={{ width: '60px', textAlign: 'center', color: '#ffffff', fontWeight: 700, fontSize: '0.95rem' }}>
                        {q}
                      </div>
                      <div style={{ width: '120px', textAlign: 'right', color: '#cbd5e1', fontWeight: 600, fontSize: '0.95rem' }}>
                        {p.toLocaleString()}
                      </div>
                      <div style={{ width: '140px', textAlign: 'right', color: '#ffffff', fontWeight: 900, fontSize: '1.1rem' }}>
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
                    <div style={{ width: '60px', textAlign: 'center', color: '#f59e0b', fontWeight: 700, fontSize: '0.9rem' }}>
                      1
                    </div>
                    <div style={{ width: '120px', textAlign: 'right', color: '#f59e0b', fontWeight: 600, fontSize: '0.9rem' }}>
                      - {discountAmount.toLocaleString()}
                    </div>
                    <div style={{ width: '140px', textAlign: 'right', color: '#f59e0b', fontWeight: 900, fontSize: '1.1rem' }}>
                      - LKR {discountAmount.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
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
            <div style={{ background: '#0f172a', borderRadius: '24px', padding: '28px 32px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                    {isReceipt ? 'RECEIPT STATUS' : 'ACCOUNT STATUS'}
                  </div>
                  <div style={{ color: (isApproved || isReceipt) ? '#10b981' : '#f59e0b', fontWeight: 900, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle size={16} />
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
                      This order has been officially placed by {smsConfig.companyName || 'Hair Pins & Accessories Manufacturing Co.'}. Please confirm order acceptance and schedule shipment.
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

              {docData.status === 'Accepted' && (
                <div style={{
                  padding: '24px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)', textAlign: 'center'
                }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 800, fontSize: '1.05rem', marginBottom: '6px' }}>
                    <CheckCircle size={22} /> QUOTATION ACCEPTED
                  </div>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                    This proposal was accepted on {docData.acceptedAt ? new Date(docData.acceptedAt).toLocaleDateString() : 'record'}. Our team is finalizing your invoice and onboarding.
                  </p>
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

              {(docData.status === 'Pending' || docData.status === 'Sent' || docData.status === 'Draft') && !isPreview && (
                <div className="cta-container" style={{ 
                  padding: '36px 32px', 
                  background: '#f8fafc', 
                  borderRadius: '24px', 
                  border: '1px solid #e2e8f0', 
                  textAlign: 'center' 
                }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>
                    Ready to proceed?
                  </h3>
                  <p style={{ maxWidth: '600px', margin: '0 auto 28px auto', fontSize: '0.95rem', color: '#64748b' }}>
                    Choose an option below to approve the proposal, propose a custom budget, or decline.
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                    {/* ACCEPT BUTTON */}
                    <button 
                      type="button"
                      disabled={isSubmitting}
                      onClick={async () => { 
                        setIsSubmitting(true);
                        try {
                          if (acceptQuote) {
                            const res = await acceptQuote(docData.id || id);
                            if (res?.invoice) {
                              setDocData(prev => ({ 
                                ...prev, 
                                status: 'Converted to Invoice', 
                                convertedInvoiceNumber: res.invoice.invoiceNumber,
                                convertedInvoiceId: res.invoice.id,
                                acceptedAt: new Date().toISOString() 
                              }));
                            } else {
                              setDocData(prev => ({ ...prev, status: 'Accepted', acceptedAt: new Date().toISOString() }));
                            }
                          }
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
                        border: 'none'
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
                        border: 'none'
                      }}>
                      <DollarSign size={18} /> PROPOSE BUDGET
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
                        fontSize: '0.95rem'
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
        <div style={{ 
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

      {/* GRATITUDE MODAL */}
      {showGratitude && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.9)', backdropFilter: 'blur(20px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '24px'
        }}>
          <div className="glass-panel" style={{ 
            maxWidth: '480px', width: '100%', textAlign: 'center', padding: '48px 32px',
            border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 32px 64px rgba(0,0,0,0.4)',
            background: '#0f172a'
          }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.14)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto'
            }}>
              <CheckCircle size={48} color="#10b981" />
            </div>
            <h2 style={{ fontSize: '2rem', marginBottom: '16px', color: '#ffffff', fontWeight: 900 }}>Quotation Accepted!</h2>
            <p style={{ fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '32px', color: '#cbd5e1' }}>
              Your approval for <strong>{customerName}</strong> has been registered successfully. Our team has been notified and will issue your formal invoice shortly!
            </p>
            <button className="btn btn-primary" style={{ width: '100%', height: '48px', fontWeight: 800 }} onClick={() => setShowGratitude(false)}>
              Close Confirmation
            </button>
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
                    preferredChanges
                  });
                }
                setDocData(prev => ({ ...prev, status: 'Counter Offer' }));
                setShowProposeModal(false);
                showNotification('Your counter offer has been submitted to management.', 'success');
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
                  await rejectQuote(docData.id || id, rejectionReason);
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
