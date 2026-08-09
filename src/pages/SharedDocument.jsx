import React, { useContext, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { StoreContext } from '../context/StoreContext';
import { supabase } from '../lib/supabase';
import { generateDocumentPDF } from '../utils/pdfGenerator';
import { Download, Printer, CheckCircle, XCircle, FileText, Receipt, Clock, ShieldCheck } from 'lucide-react';

const SharedDocument = () => {
  const { type, id } = useParams();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';
  const { quotes = [], invoices = [], customers = [], updateQuoteStatus, showNotification, smsConfig = {} } = useContext(StoreContext) || {};
  const [docData, setDocData] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [showGratitude, setShowGratitude] = useState(false);

  const isQuote = type === 'quote';
  const isReceipt = type === 'receipt';
  const docTitle = isReceipt ? 'Payment Receipt' : isQuote ? 'Quotation' : 'Invoice';

  useEffect(() => {
    const loadDocument = async () => {
      try {
        setLoading(true);
        let foundDoc = null;
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        if (type === 'quote') {
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
        } else if (type === 'invoice' || type === 'receipt') {
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
  }, [type, id, quotes, invoices, customers]);

  const handleDownloadPDF = () => {
    if (!docData) return;
    const payload = isQuote
      ? { ...docData, prospectName: customerName }
      : { ...docData, gymName: customerName };
    generateDocumentPDF(docTitle, payload, docData.items || []);
  };

  const handlePrint = () => window.print();

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

  const docNumber = isQuote ? docData.quoteNumber : docData.invoiceNumber;
  const standardItems = (docData.items || []).filter(i => !i.isDiscount);
  const discountItem = (docData.items || []).find(i => i.isDiscount);
  
  const getItemName = (item) => item.name || item.description || item.title || item.item_name || 'FP MACHINE';
  const getItemQty = (item) => Number(item.quantity || item.qty || item.count || 1);
  const getItemPrice = (item) => Number(item.price || item.unitPrice || item.rate || item.unit_price || item.amount || 25000);

  const discountAmount = discountItem ? Math.abs(getItemPrice(discountItem)) : 0;

  const subTotal = standardItems.length > 0
    ? standardItems.reduce((sum, item) => sum + (getItemPrice(item) * getItemQty(item)), 0)
    : Number(docData.amount || 25000) + discountAmount;
    
  const totalAmount = subTotal - discountAmount;
  const isApproved = docData.status === 'Paid' || docData.status === 'Accepted';

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#070b14', 
      color: '#f8fafc', 
      padding: '40px 20px', 
      position: 'relative',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    }}>
      {/* Background Radial Glow */}
      <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)', zIndex: 0, pointerEvents: 'none' }}></div>

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
        overflow: 'hidden', 
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
              </div>
              
              <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 900, color: '#0f172a', margin: '0 0 12px 0', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                {customerName}
              </h1>

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
                background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '14px', border: '1px solid #e2e8f0'
              }}>
                {isQuote ? <FileText size={28} color="#0f172a" /> : 
                 isReceipt ? <CheckCircle size={28} color="#10b981" /> : 
                 <Receipt size={28} color="#0f172a" />}
              </div>
              <div style={{ color: '#0f172a', fontWeight: 900, fontSize: '1.1rem', marginBottom: '2px' }}>
                {smsConfig.companyName || 'Seynex Technology'}
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.78rem', fontWeight: 500 }}>
                {smsConfig.companyEmail || 'seynextech@gmail.com'}
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.78rem', fontWeight: 500 }}>
                {smsConfig.companyPhone || '072 840 8880'}
              </div>
            </div>
          </div>

          {/* BILLING ITEMS DARK BOX */}
          <div style={{ 
            background: '#0f172a', 
            borderRadius: '24px', 
            padding: '28px 32px', 
            marginBottom: '32px',
            boxShadow: '0 10px 25px rgba(15, 23, 42, 0.2)'
          }}>
            <div style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '18px' }}>
              BILLING ITEMS
            </div>

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
                  borderBottom: idx === standardItems.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.06)' 
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
          </div>

          {/* BOTTOM TWO CARDS ROW (VALIDITY + ACCOUNT STATUS) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', alignItems: 'stretch' }}>
            
            {/* ESTIMATE VALIDITY */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6', marginBottom: '10px' }}>
                <Clock size={16} />
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  ESTIMATE VALIDITY
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6 }}>
                This quotation is valid for 30 days from the date of issue. Special bundle discounts applied are contingent on current stock levels.
              </p>
            </div>

            {/* ACCOUNT STATUS & TOTAL AMOUNT DARK CARD */}
            <div style={{ background: '#0f172a', borderRadius: '24px', padding: '28px 32px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                    ACCOUNT STATUS
                  </div>
                  <div style={{ color: isApproved ? '#10b981' : '#f59e0b', fontWeight: 900, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle size={16} />
                    {docData.status.toUpperCase()}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                    TOTAL AMOUNT
                  </div>
                  <div style={{ color: '#ffffff', fontWeight: 900, fontSize: '1.1rem' }}>
                    LKR {totalAmount.toLocaleString()}
                  </div>
                </div>
              </div>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', marginBottom: '20px' }}></div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#3b82f6', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                  {isQuote ? 'PROJECTED INVESTMENT' : 'CURRENT BALANCE DUE'}
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#ffffff', fontFamily: 'var(--font-display)', letterSpacing: '-0.04em', lineHeight: 1 }}>
                  <span style={{ fontSize: '1rem', color: '#94a3b8', marginRight: '8px', fontWeight: 700 }}>LKR</span>
                  {totalAmount.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* CALL TO ACTION FOR QUOTE APPROVAL */}
          {isQuote && docData.status === 'Pending' && !isPreview && (
            <div className="cta-container no-print" style={{ 
              marginTop: '40px', 
              padding: '32px', 
              background: '#f8fafc', 
              borderRadius: '24px', 
              border: '1px solid #e2e8f0', 
              textAlign: 'center' 
            }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>Ready to proceed?</h3>
              <p style={{ maxWidth: '600px', margin: '0 auto 24px auto', fontSize: '0.95rem', color: '#64748b' }}>Review the terms above and confirm your acceptance to initialize the implementation process.</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                <button 
                  onClick={async () => { 
                    setDocData(prev => ({ ...prev, status: 'Accepted' }));
                    await updateQuoteStatus(id, 'Accepted'); 
                    setShowGratitude(true);
                  }}
                  className="btn btn-primary" style={{ background: '#6366f1', padding: '12px 28px', fontWeight: 800 }}>
                  <CheckCircle size={18} /> Approve & Accept Proposal
                </button>
                <button 
                  onClick={async () => { 
                    setDocData(prev => ({ ...prev, status: 'Rejected' }));
                    await updateQuoteStatus(id, 'Rejected'); 
                    showNotification('Proposal declined.'); 
                  }}
                  className="btn btn-secondary" style={{ color: '#ef4444', background: '#fef2f2', border: '1px solid #fee2e2', padding: '12px 24px', fontWeight: 700 }}>
                  <XCircle size={18} /> Decline
                </button>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER BAR */}
        <div style={{ background: '#0f172a', padding: '20px 32px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #0ea5e9, #8b5cf6, #ec4899)' }}></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></div>
              <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>
                Authenticated Computer-Generated Document
              </span>
            </div>

            <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>
              Powered by <strong style={{ color: '#ffffff', fontWeight: 800 }}>GymSales Pro</strong>
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
            maxWidth: '450px', width: '100%', textAlign: 'center', padding: '48px 32px',
            border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 32px 64px rgba(0,0,0,0.4)'
          }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.14)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto'
            }}>
              <CheckCircle size={48} color="#10b981" />
            </div>
            <h2 style={{ fontSize: '2rem', marginBottom: '16px', color: '#ffffff', fontWeight: 900 }}>Thank You!</h2>
            <p style={{ fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '32px', color: '#cbd5e1' }}>
              Your approval for <strong>{customerName}</strong> has been received successfully. We are excited to begin our partnership!
            </p>
            <button className="btn btn-primary" style={{ width: '100%', height: '48px' }} onClick={() => setShowGratitude(false)}>
              Close Window
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SharedDocument;
