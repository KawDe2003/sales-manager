import React, { useContext, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { StoreContext } from '../context/StoreContext';
import { supabase } from '../lib/supabase';
import { generateDocumentPDF } from '../utils/pdfGenerator';
import { Download, Printer, CheckCircle, XCircle, FileText, Receipt, Clock, Mail, Phone, MapPin, Building2, ShieldCheck } from 'lucide-react';

const SharedDocument = () => {
  const { type, id } = useParams();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';
  const { quotes = [], invoices = [], customers = [], updateQuoteStatus, showNotification, smsConfig = {}, theme } = useContext(StoreContext) || {};
  const [docData, setDocData] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [showGratitude, setShowGratitude] = useState(false);

  useEffect(() => {
    const loadDocument = async () => {
      try {
        console.log(`[SharedDoc] Loading type: ${type}, id: ${id}`);
        setLoading(true);

        let foundDoc = null;
        // Permissive UUID check: 8-4-4-4-12 hex chars
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        if (type === 'quote') {
          foundDoc = quotes.find(item => item.id === id || item.shareKey === id);
          if (!foundDoc) {
            console.log(`[SharedDoc] Quote not in local state, checking Supabase...`);
            const query = supabase.from('quotations').select('*');
            
            if (isUUID) {
              query.or(`id.eq.${id},share_key.eq.${id}`);
            } else {
              query.eq('share_key', id);
            }

            const { data, error } = await query.single();
            
            if (error) {
              console.error('[SharedDoc] Supabase Error:', error);
              if (error.code !== 'PGRST116') {
                setFetchError(`${error.code}: ${error.message}`);
              }
            }

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
            setCustomerName(foundDoc.prospectName || 'Valued Prospect');
          }
        } else if (type === 'invoice' || type === 'receipt') {
          foundDoc = invoices.find(item => item.id === id || item.shareKey === id);
          
          if (!foundDoc) {
            console.log(`[SharedDoc] Invoice not in local state, checking Supabase...`);
            const query = supabase.from('invoices').select('*');
            
            if (isUUID) {
              query.or(`id.eq.${id},share_key.eq.${id}`);
            } else {
              query.eq('share_key', id);
            }

            const { data, error } = await query.single();
            
            if (error) {
              console.error('[SharedDoc] Supabase Error:', error);
              if (error.code !== 'PGRST116') {
                setFetchError(`${error.code}: ${error.message}`);
              }
            }

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

  // IP Tracking
  useEffect(() => {
    if (!docData || isPreview) return;
    
    // Prevent double-logging
    if (window.sessionStorage.getItem(`tracked_${docData.id}`)) return;
    window.sessionStorage.setItem(`tracked_${docData.id}`, 'true');

    const trackAccess = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const ipData = await response.json();
        
        const ip = ipData.ip || 'Unknown IP';
        const location = ipData.city ? `${ipData.city}, ${ipData.country_name}` : 'Unknown Location';
        
        const docName = isQuote ? `Quote #${docData.quoteNumber}` : `Invoice #${docData.invoiceNumber}`;
        const message = `Client viewed ${docName}`;
        const details = `IP: ${ip} | Location: ${location}`;

        const userId = docData.user_id || docData.userId;

        if (userId) {
          await supabase.from('activity_logs').insert({
            id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
            user_id: userId,
            log_type: 'Access',
            message: message,
            details: details,
            log_timestamp: new Date().toISOString()
          });
        }
      } catch (e) {
        console.error('[Tracking] Failed to track IP access:', e);
      }
    };

    trackAccess();
  }, [docData, isPreview, isQuote]);

  const isQuote = type === 'quote';
  const isReceipt = type === 'receipt';
  const docTitle = isReceipt ? 'Payment Receipt' : isQuote ? 'Quotation' : 'Invoice';

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
      <div style={{ 
        minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', 
        justifyContent: 'center', padding: '32px', textAlign: 'center', background: 'var(--bg-primary)' 
      }}>
        <div className="animate-spin" style={{ width: '40px', height: '40px', border: '3px solid rgba(99, 102, 241, 0.2)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', marginBottom: '20px' }}></div>
        <p className="text-secondary">Retrieving secure document...</p>
      </div>
    );
  }

  if (!docData) {
    return (
      <div style={{ 
        minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', 
        justifyContent: 'center', padding: '32px', textAlign: 'center', background: 'var(--bg-primary)' 
      }}>
        <div style={{ 
          width: '80px', height: '80px', borderRadius: '50%', background: 'var(--subtle-bg)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px' 
        }}>
          <FileText size={40} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
        </div>
        <h1 className="h1" style={{ fontSize: '2.5rem', marginBottom: '16px' }}>Document Expired or Not Found</h1>
        <p className="text-secondary" style={{ maxWidth: '500px', fontSize: '1.1rem' }}>The requested {docTitle} could not be retrieved from the secure vault. Please contact support if you believe this is an error.</p>
        
        {fetchError && (
          <div style={{ marginTop: '24px', padding: '12px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', color: '#991b1b', fontSize: '0.8rem', opacity: 0.6 }}>
            Debug Info: {fetchError}
          </div>
        )}

        <button className="btn btn-secondary" style={{ marginTop: '32px' }} onClick={() => window.location.href = '/'}>Return Home</button>
      </div>
    );
  }

  const docNumber = isQuote ? docData.quoteNumber : docData.invoiceNumber;
  const standardItems = (docData.items || []).filter(i => !i.isDiscount);
  const discountItem = (docData.items || []).find(i => i.isDiscount);
  const discountAmount = discountItem ? Math.abs(discountItem.price) : 0;

  const subTotal = standardItems.length > 0
    ? standardItems.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0)
    : Number(docData.amount || 0) + discountAmount;
    
  const totalAmount = subTotal - discountAmount;

  const isApproved = docData.status === 'Paid' || docData.status === 'Accepted';

  const themeStyles = isQuote ? {
    '--bg-primary': '#020617', // Deep Dark Background
    '--bg-secondary': '#0f172a',
    '--panel-bg': '#ffffff',     // Light Preview Card
    '--panel-border': '#e2e8f0',
    '--text-primary': '#0f172a', // Dark text for the light card
    '--text-secondary': '#475569',
    '--text-muted': '#94a3b8',
    '--subtle-bg': '#f8fafc',
    '--subtle-border': '#e2e8f0',
    '--accent-primary': '#3b82f6',
    '--panel-shadow': '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
  } : {
    '--bg-primary': '#020617', // Consistent deep dark background
    '--bg-secondary': '#0f172a',
    '--panel-bg': '#ffffff',     // Still Light Card for Invoices for readability
    '--panel-border': '#e2e8f0',
    '--text-primary': '#0f172a',
    '--text-secondary': '#475569',
    '--text-muted': '#94a3b8',
    '--subtle-bg': '#f8fafc',
    '--subtle-border': '#e2e8f0',
    '--accent-primary': '#3b82f6',
    '--panel-shadow': '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
  };

  return (
    <div style={{ ...themeStyles, minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', padding: '40px 20px', position: 'relative', overflowX: 'hidden' }}>
      {/* Decorative Orbs */}
      <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)', zIndex: 0 }}></div>
      <div style={{ position: 'absolute', bottom: '-5%', left: '-5%', width: '30vw', height: '30vw', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, transparent 70%)', zIndex: 0 }}></div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', position: 'relative', zIndex: 1, animation: 'fadeIn 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        
        {/* Top Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }} className="no-print">
          <div className="flex items-center gap-4">
             <div style={{ 
                width: '42px', height: '42px', borderRadius: '12px', 
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 16px var(--accent-glow)'
              }}>
                <span style={{ color: 'var(--bg-secondary)', fontWeight: '900', fontSize: '22px', fontFamily: 'var(--font-display)' }}>G</span>
              </div>
              <div style={{ fontFamily: 'var(--font-display)' }}>
                <div style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em', lineHeight: 1 }}>Secure Portal</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>Client Access</div>
              </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={handlePrint} className="btn btn-secondary" style={{ background: 'var(--subtle-bg)', height: '44px' }}>
              <Printer size={18} /> Print
            </button>
            <button onClick={handleDownloadPDF} className="btn btn-primary" style={{ height: '44px', padding: '0 24px', fontSize: '0.9rem' }}>
              <Download size={18} /> Download {isQuote ? 'Quotation' : 'Invoice'}
            </button>
          </div>
        </div>

        {/* Main Document Content */}
        <div style={{ marginBottom: '16px' }}>
            <h3 style={{ color: 'white', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.8 }}>
                Preview of {docTitle}
            </h3>
        </div>
        <div className="glass-panel main-doc-container" style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', boxShadow: 'var(--panel-shadow)' }}>
          
          {/* Internal Header */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-8" style={{ marginBottom: '80px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span className={`badge badge-${isQuote ? 'primary' : 'warning'}`} style={{ textTransform: 'uppercase', letterSpacing: '0.1em', padding: '6px 16px', fontSize: '0.7rem', fontWeight: 800 }}>
                   {docTitle}
                </span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: 'clamp(0.85rem, 3vw, 1.25rem)', fontFamily: 'var(--font-display)' }}>#{docNumber}</span>
              </div>
              
              <h2 className="h2" style={{ fontSize: 'clamp(1.2rem, 5vw, 2.2rem)', marginBottom: '12px', letterSpacing: '-0.03em' }}>{customerName}</h2>
              
              <div style={{ display: 'flex', gap: '16px' }}>
                 <div>
                   <div className="text-secondary" style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Issue Date</div>
                   <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 'clamp(0.8rem, 2.5vw, 0.95rem)' }}>{new Date(docData.date).toLocaleDateString(undefined, { dateStyle: 'long' })}</div>
                 </div>
                 {docData.dueDate && (
                   <div>
                     <div className="text-secondary" style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Payment Due</div>
                     <div style={{ color: 'var(--warning)', fontWeight: 700, fontSize: 'clamp(0.8rem, 2.5vw, 0.95rem)' }}>{new Date(docData.dueDate).toLocaleDateString(undefined, { dateStyle: 'long' })}</div>
                   </div>
                 )}
              </div>
            </div>

            <div className="w-full md:w-auto text-left md:text-right mt-8 md:mt-0">
              <div className="md:ml-auto" style={{ 
                width: '64px', height: '64px', borderRadius: '20px', 
                background: isReceipt ? 'rgba(34, 197, 94, 0.1)' : 'var(--subtle-bg)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px',
                border: isReceipt ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid var(--subtle-border)',
                position: 'relative'
              }}>
                {isQuote ? <FileText size={32} /> : 
                 isReceipt ? <CheckCircle size={32} /> : 
                 <Receipt size={32} />}
              </div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '1.1rem', marginBottom: '4px' }}>{smsConfig.companyName || 'GymSales Pro'}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{smsConfig.companyEmail || 'billing@gymsales.com'}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{smsConfig.companyPhone || '+1 (234) 567-890'}</div>
            </div>
          </div>

          {/* Line Items Container */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '24px', padding: 'clamp(16px, 3vw, 32px)', border: '1px solid var(--panel-border)', marginBottom: '40px', overflowX: 'auto', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
             <h4 style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '20px' }}>Billing Items</h4>
             
             <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 'min(400px, 100%)' }}>
                <div style={{ display: 'flex', padding: '10px 12px', borderBottom: '1px solid var(--subtle-border)', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                   <div style={{ flex: 1, minWidth: '80px' }}>Description</div>
                   <div style={{ width: '60px', flexShrink: 0, textAlign: 'center' }}>Qty</div>
                   <div style={{ width: '120px', flexShrink: 0, textAlign: 'right' }}>Offer Price</div>
                   <div style={{ width: '140px', flexShrink: 0, textAlign: 'right' }}>Total</div>
                </div>

                {standardItems.map((item, idx) => (
                   <div key={idx} style={{ display: 'flex', padding: '12px 10px', borderBottom: idx === standardItems.length - 1 ? 'none' : '1px solid var(--subtle-border)', alignItems: 'center' }}>
                      <div style={{ flex: 1, minWidth: '80px', wordBreak: 'break-word' }}>
                        <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 'clamp(0.85rem, 2.5vw, 1rem)' }}>{item.name}</div>
                      </div>
                      <div style={{ width: '60px', flexShrink: 0, textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 'clamp(0.75rem, 2.5vw, 0.9rem)' }}>{item.quantity || 1}</div>
                      <div style={{ width: '120px', flexShrink: 0, textAlign: 'right', color: 'var(--text-secondary)', fontSize: 'clamp(0.75rem, 2.5vw, 0.9rem)' }}>{Number(item.price || 0).toLocaleString()}</div>
                      <div style={{ width: '140px', flexShrink: 0, textAlign: 'right', color: 'var(--text-primary)', fontWeight: 800, fontSize: 'clamp(0.85rem, 2.5vw, 1rem)' }}>{(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString()}</div>
                   </div>
                ))}
             </div>
          </div>

          {/* Totals Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8" style={{ position: 'relative' }}>
             <div style={{ maxWidth: '400px', width: '100%' }}>
                {!isQuote && (
                   <div style={{ padding: '24px', background: 'var(--subtle-bg)', borderRadius: '16px', border: '1px solid var(--subtle-border)' }}>
                      <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--warning)' }}>
                         <ShieldCheck size={16} /> <span style={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase' }}>Payment Protocol</span>
                      </div>
                      <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>Please settle this invoice via wire transfer. Mention reference <strong>#{docNumber}</strong> in your transaction description.</p>
                      
                      {smsConfig.bankDetails && (
                        <div style={{ 
                          marginTop: '12px', padding: '16px', background: 'rgba(255,255,255,0.03)', 
                          borderRadius: '12px', border: '1px solid var(--subtle-border)',
                          fontSize: '0.8rem'
                        }}>
                          <div style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.6 }}>Bank Account Details</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '4px' }}>
                            <span className="text-muted">Bank:</span> <span style={{ fontWeight: 600 }}>{smsConfig.bankDetails.bank}</span>
                            <span className="text-muted">Branch:</span> <span style={{ fontWeight: 600 }}>{smsConfig.bankDetails.branch}</span>
                            <span className="text-muted">Account:</span> <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{smsConfig.bankDetails.accountNumber}</span>
                            <span className="text-muted">Name:</span> <span style={{ fontWeight: 600 }}>{smsConfig.bankDetails.accountName}</span>
                          </div>
                        </div>
                      )}
                   </div>
                )}
                {isQuote && (
                   <div style={{ padding: '24px', background: 'var(--subtle-bg)', borderRadius: '16px', border: '1px solid var(--subtle-border)' }}>
                      <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--accent-primary)' }}>
                         <Clock size={16} /> <span style={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase' }}>Estimate Validity</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>This quotation is valid for 30 days from the date of issue. Special bundle discounts applied are contingent on current stock levels.</p>
                   </div>
                )}
             </div>

             <div className="w-full md:w-auto" style={{ textAlign: 'right', minWidth: 'min(320px, 100%)' }}>
                <div style={{ background: 'linear-gradient(135deg, var(--bg-secondary), var(--subtle-bg))', padding: '32px', borderRadius: '24px', border: '1px solid var(--panel-border)', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                   <div className="flex justify-between items-center mb-6">
                      <div style={{ textAlign: 'left' }}>
                         <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Account Status</div>
                         <div style={{ 
                            color: isApproved ? 'var(--success)' : 'var(--warning)', 
                            fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' 
                         }}>
                            {isApproved ? <CheckCircle size={14} /> : <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--warning)' }}></div>}
                            {docData.status.toUpperCase()}
                         </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                         <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Total Amount</div>
                         <div style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '0.9rem' }}>LKR {totalAmount.toLocaleString()}</div>
                      </div>
                   </div>

                   <div style={{ height: '1px', background: 'var(--subtle-border)', margin: '0 0 24px 0' }}></div>

                   <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      {discountAmount > 0 && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '200px', marginBottom: '8px', fontSize: '0.85rem' }}>
                             <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                             <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>LKR {subTotal.toLocaleString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '200px', marginBottom: '16px', fontSize: '0.85rem' }}>
                             <span style={{ color: 'var(--danger)' }}>Discount</span>
                             <span style={{ color: 'var(--danger)', fontWeight: 700 }}>- LKR {discountAmount.toLocaleString()}</span>
                          </div>
                        </>
                      )}
                      <div style={{ color: 'var(--accent-primary)', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
                         {isQuote ? 'Projected Investment' : 'Current Balance Due'}
                      </div>
                      <div style={{ fontSize: 'clamp(1.4rem, 7.5vw, 2.5rem)', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.04em', lineHeight: 1 }}>
                         <span style={{ fontSize: 'clamp(0.8rem, 3.5vw, 1rem)', color: 'var(--text-muted)', verticalAlign: 'middle', marginRight: '8px', fontWeight: 700 }}>LKR</span>
                         {totalAmount.toLocaleString()}
                      </div>
                   </div>
                </div>
             </div>

             {(isReceipt || docData.status === 'Paid') && (
               <div style={{ 
                 position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%) rotate(-10deg)',
                 border: '8px solid var(--success)', padding: '12px 48px', borderRadius: '16px',
                 color: 'var(--success)', fontSize: '4rem', fontWeight: 900, opacity: 0.15,
                 pointerEvents: 'none', fontFamily: 'var(--font-display)', letterSpacing: '0.2em', zIndex: 0
               }}>
                 PAID
               </div>
             )}
          </div>

          {/* Agreement & Terms Section */}
          {docData.agreementTerms && (
             <div style={{ marginTop: '40px', padding: '32px', background: 'var(--bg-secondary)', borderRadius: '24px', border: '1px solid var(--panel-border)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                <h4 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px' }}>Service Agreement & Terms</h4>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                   {docData.agreementTerms}
                </div>
             </div>
          )}

          {/* Bottom Call to Action for Quotes */}
          {isQuote && docData.status === 'Pending' && !isPreview && (
            <div className="cta-container no-print" style={{ 
              marginTop: '60px', 
              padding: 'clamp(24px, 5vw, 48px)', 
              background: 'var(--subtle-bg)', 
              borderRadius: '32px', 
              border: '1px solid var(--subtle-border)', 
              textAlign: 'center' 
            }}>
               <h3 style={{ margin: '0 0 12px 0', fontSize: 'clamp(1.4rem, 5vw, 1.8rem)', fontWeight: 800, color: 'var(--text-primary)' }}>Ready to proceed?</h3>
               <p className="text-secondary" style={{ maxWidth: '600px', margin: '0 auto 36px auto', fontSize: 'clamp(0.9rem, 3vw, 1.1rem)' }}>Review the terms above and confirm your acceptance to initialize the implementation process.</p>
               <div className="action-button-group">
                  <button 
                    onClick={async () => { 
                      setDocData(prev => ({ ...prev, status: 'Accepted' }));
                      await updateQuoteStatus(id, 'Accepted'); 
                      setShowGratitude(true);
                    }}
                    className="btn btn-primary action-btn-large" style={{ background: 'var(--accent-primary)' }}>
                    <CheckCircle size={20} /> Approve & Accept Proposal
                  </button>
                  <button 
                    onClick={async () => { 
                      setDocData(prev => ({ ...prev, status: 'Rejected' }));
                      await updateQuoteStatus(id, 'Rejected'); 
                      showNotification('Proposal declined.'); 
                    }}
                    className="btn btn-secondary action-btn-large" style={{ color: 'var(--danger)', background: 'var(--danger-bg)' }}>
                    <XCircle size={20} /> Decline
                  </button>
               </div>
            </div>
          )}

          {/* Bottom Call to Action for Invoices */}
          {!isQuote && !isApproved && !isPreview && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px 20px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--panel-border)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)', textAlign: 'center' }} className="no-print">
               <h3 style={{ margin: '0 0 12px 0', fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>Outstanding Balance</h3>
               <p className="text-secondary" style={{ maxWidth: '600px', margin: '0 auto 36px auto', fontSize: '1.1rem' }}>Please complete your payment to ensure your service remains uninterrupted.</p>
               <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                  <button 
                    onClick={() => { showNotification('Redirecting to secure payment gateway...', 'success'); }}
                    className="btn btn-primary" style={{ padding: '0 40px', height: '56px', fontSize: '1.05rem', background: 'var(--accent-primary)', border: 'none' }}>
                    <CheckCircle size={20} /> Pay Now Securely
                  </button>
               </div>
            </div>
          )}

          <div style={{ padding: '40px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--panel-border)', position: 'relative', borderBottomLeftRadius: '20px', borderBottomRightRadius: '20px' }}>
             <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #0ea5e9, #8b5cf6, #ec4899)' }}></div>
             <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                   <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-primary)' }}></div>
                   <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
                      Authenticated Computer-Generated Document
                   </p>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
                   Powered by <strong style={{ color: 'var(--text-primary)' }}>GymSales Pro</strong>
                </div>
             </div>
          </div>
        </div>
      </div>

      {showGratitude && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.9)', backdropFilter: 'blur(20px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '24px'
        }}>
          <div className="glass-panel" style={{ 
            maxWidth: '450px', width: '100%', textAlign: 'center', padding: '48px 32px',
            border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 32px 64px rgba(0,0,0,0.4)',
            animation: 'fadeIn 0.5s cubic-bezier(0.19, 1, 0.22, 1)'
          }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%', background: 'var(--success-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto'
            }}>
              <CheckCircle size={48} color="var(--success)" />
            </div>
            <h2 className="h1" style={{ fontSize: '2rem', marginBottom: '16px', color: 'var(--text-primary)' }}>Thank You!</h2>
            <p className="text-secondary" style={{ fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '32px' }}>
              Your approval for <strong>{customerName}</strong> has been received successfully. We are excited to begin our partnership!
            </p>
            <button 
              className="btn btn-primary" 
              style={{ padding: '0 32px', height: '52px', width: '100%' }}
              onClick={() => setShowGratitude(false)}
            >
              Continue to Document
            </button>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; padding: 0 !important; }
          .glass-panel { 
            background: white !important; 
            border: 1px solid #e2e8f0 !important; 
            box-shadow: none !important;
            color: black !important;
          }
          .glass-panel * { color: black !important; }
          .badge { border: 1px solid #000 !important; }
        }
        
        .main-doc-container {
          padding: 60px;
        }
        
        .action-button-group {
          display: flex;
          justify-content: center;
          gap: 16px;
        }

        .action-btn-large {
          padding: 0 40px;
          height: 56px;
          font-size: 1.05rem;
          border: none;
        }

        @media (max-width: 640px) {
          .main-doc-container {
            padding: 24px 16px;
          }
          .glass-panel {
            border-radius: 16px;
          }
          .action-button-group {
            flex-direction: column;
            gap: 12px;
          }
          .action-btn-large {
            width: 100%;
            padding: 0 20px;
            font-size: 0.95rem;
            height: 52px;
          }
          .cta-container {
             padding: 32px 20px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default SharedDocument;
