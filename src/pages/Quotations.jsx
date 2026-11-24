import React, { useContext, useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { StoreContext, getNextSequentialQuoteNumber } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { FileText, Plus, Minus, Download, Trash2, Smartphone, Edit2, X, PlusCircle, ShoppingBag, User, Link as LinkIcon, Search, Receipt, Eye, Tag, MessageCircle, AlertTriangle, CheckCircle, RefreshCw, Lock, Unlock, Ban, ChevronDown, Package, MapPin } from 'lucide-react';
import { generateDocumentPDF } from '../utils/pdfGenerator';
import { openWhatsApp } from '../utils/notificationService';
import CustomSelect from '../components/CustomSelect';

const Quotations = () => {
  const { quotes = [], addQuote, updateQuote, updateQuoteStatus, convertQuoteToInvoice, unlockQuote, voidQuote, deleteQuote, inventory = [], triggerSMS, smsConfig, customers = [], leads = [], showNotification } = useContext(StoreContext) || {};
  const { user } = useAuth() || {};
  const isAdmin = user?.role === 'Admin' || user?.user_metadata?.role === 'Admin' || user?.email === 'admin@seynex.lk' || !user?.role;
  const [showModal, setShowModal] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [confirmInvoiceQuote, setConfirmInvoiceQuote] = useState(null);
  const [confirmDeleteQuote, setConfirmDeleteQuote] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const leadId = searchParams.get('leadId');
    if (leadId) {
      const lead = leads.find(l => l.id === leadId);
      if (lead) {
        setEditingQuote({
          prospectName: lead.gymName,
          prospectPhone: lead.phone,
          isFromLead: true,
          items: []
        });
        setShowModal(true);
      }
      setSearchParams({});
    }
  }, [searchParams, leads, setSearchParams]);

  return (
    <div style={{ position: 'relative', width: '100%', paddingBottom: '40px' }}>
      <div className="page-hero">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="h1 mb-2">Proposals & Quotes</h1>
            <p className="text-secondary" style={{ fontSize: '1rem' }}>Generate and track professional software offers for new prospects.</p>
          </div>
          <button className="btn btn-primary" style={{ padding: '12px 24px' }} onClick={() => { setEditingQuote(null); setShowModal(true); }}>
            <Plus size={18} /> Create Quotation
          </button>
        </div>
      </div>

      {/* Responsive Search & Filter Toolbar */}
      <div className="glass-panel" style={{ padding: '16px 24px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '260px', maxWidth: '480px' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '12px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search quotes by client, quote ID, or phone..."
            style={{ paddingLeft: '48px', height: '42px', background: 'var(--subtle-bg)', width: '100%' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2 flex-wrap" style={{ width: '100%', mdWidth: 'auto' }}>
          {['All', 'Draft', 'Sent', 'Pending', 'Counter Offer', 'Accepted', 'Rejected', 'Expired', 'Converted to Invoice'].map(st => (
            <button
              key={st}
              className={`btn ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '0.8rem', flex: '1 1 auto' }}
              onClick={() => setStatusFilter(st)}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(() => {
          const filteredQuotes = quotes.filter(q => {
            const matchesSearch = (q.prospectName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
              (q.quoteNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
              (q.prospectPhone || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'All' || (q.status || 'Pending') === statusFilter;
            return matchesSearch && matchesStatus;
          });

          if (filteredQuotes.length === 0) {
            return (
              <div className="glass-panel flex flex-col items-center justify-center" style={{ padding: '80px 0', textAlign: 'center' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--subtle-bg)', display: 'flex', alignItems: 'center', marginBottom: '24px', justifyContent: 'center' }}>
                  <Search size={32} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                </div>
                <h3 className="h2" style={{ fontSize: '1.2rem', marginBottom: '8px' }}>No Results Found</h3>
                <p className="text-secondary" style={{ fontSize: '0.95rem' }}>We couldn't find any quotes matching your search query.</p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ marginTop: '16px', padding: '8px 18px', fontSize: '0.85rem' }}
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('All');
                  }}
                >
                  Clear filters
                </button>
              </div>
            );
          }

          return filteredQuotes.map(quote => (
            <QuoteCard
              key={quote.id}
              quote={quote}
              isAdmin={isAdmin}
              updateQuoteStatus={updateQuoteStatus}
              convertQuoteToInvoice={convertQuoteToInvoice}
              onRequestConvert={() => setConfirmInvoiceQuote(quote)}
              onRequestDelete={() => setConfirmDeleteQuote(quote)}
              onUnlock={() => unlockQuote && unlockQuote(quote.id)}
              onVoid={() => voidQuote && voidQuote(quote.id)}
              onEdit={() => {
                const isLocked = quote.status === 'Converted to Invoice' || quote.isLocked;
                if (isLocked) {
                  showNotification && showNotification(`Quotation #${quote.quoteNumber || 'Proposal'} is converted to an invoice and locked from editing.`, 'warning');
                  return;
                }
                setEditingQuote(quote);
                setShowModal(true);
              }}
              onSendSms={() => {
                if (!quote.prospectPhone) {
                  showNotification && showNotification(`No phone saved.`, 'error');
                  return;
                }
                triggerSMS && triggerSMS('Quotation', null, quote);
                if (quote.status === 'Draft' || quote.status === 'Pending') {
                  updateQuoteStatus && updateQuoteStatus(quote.id, 'Sent');
                }
              }}
              onDownload={() => {
                showNotification && showNotification(`Generating PDF for Quote #${quote.quoteNumber || 'Proposal'}...`, 'info');
                generateDocumentPDF('Quotation', quote, quote.items || []);
              }}
            />
          ));
        })()}
      </div>

      {showModal && (
        <QuoteModal 
          onClose={() => { setShowModal(false); setEditingQuote(null); }} 
          onSave={(data) => {
             if (editingQuote) updateQuote && updateQuote(editingQuote.id, data);
             else addQuote && addQuote(data);
          }} 
          inventory={inventory} 
          initialData={editingQuote}
          customers={customers}
        />
      )}

      {/* Confirmation Modal: Convert to Invoice */}
      {confirmInvoiceQuote && (
        <div 
          className="app-modal-backdrop modal-overlay"
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, inset: 0,
            zIndex: 9999999, background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
          }}
          onClick={() => setConfirmInvoiceQuote(null)}
        >
          <div 
            className="glass-panel"
            style={{
              maxWidth: '460px', width: '100%', padding: '24px', borderRadius: '16px',
              border: '1px solid var(--panel-border)', background: 'var(--panel-bg)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                <Receipt size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Convert to Tax Invoice?
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Quotation #{confirmInvoiceQuote.quoteNumber}
                </span>
              </div>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
              Generate Tax Invoice for <strong>#{confirmInvoiceQuote.quoteNumber}</strong>? This will create an official invoice record and lock the quotation.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setConfirmInvoiceQuote(null)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                style={{ background: 'var(--success)', border: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => {
                  convertQuoteToInvoice && convertQuoteToInvoice(confirmInvoiceQuote.id);
                  setConfirmInvoiceQuote(null);
                }}
              >
                <CheckCircle size={16} /> Confirm &amp; Generate Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Quotation */}
      {confirmDeleteQuote && (
        <div 
          className="app-modal-backdrop modal-overlay"
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, inset: 0,
            zIndex: 9999999, background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
          }}
          onClick={() => setConfirmDeleteQuote(null)}
        >
          <div 
            className="glass-panel"
            style={{
              maxWidth: '440px', width: '100%', padding: '24px', borderRadius: '16px',
              border: '1px solid var(--panel-border)', background: 'var(--panel-bg)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                <Trash2 size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Delete Quotation?
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Quotation #{confirmDeleteQuote.quoteNumber}
                </span>
              </div>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
              Are you sure you want to permanently delete quotation <strong>#{confirmDeleteQuote.quoteNumber}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setConfirmDeleteQuote(null)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                style={{ background: 'var(--danger)', border: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => {
                  deleteQuote && deleteQuote(confirmDeleteQuote.id);
                  setConfirmDeleteQuote(null);
                }}
              >
                <Trash2 size={16} /> Delete Quotation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const QuoteCard = ({ 
  quote, 
  isAdmin, 
  updateQuoteStatus, 
  convertQuoteToInvoice, 
  onRequestConvert, 
  onRequestDelete, 
  onUnlock, 
  onVoid, 
  onEdit, 
  onSendSms, 
  onDownload 
}) => {
  const navigate = useNavigate();
  const { smsConfig = {}, invoices = [], customers = [], verifyAndGetShareLink, activeBusinessId, showNotification } = useContext(StoreContext) || {};
  const bizParam = (quote.businessId || activeBusinessId) ? `?biz=${encodeURIComponent(quote.businessId || activeBusinessId)}` : '';
  const shareToken = quote.shareToken || quote.shareKey || quote.id;
  const shareLink = `${window.location.origin}/share/quote/${shareToken}${bizParam}`;
  const previewLink = `${shareLink}&preview=true`;
  const customer = customers.find(c => 
    (quote.customerId && c.id === quote.customerId) ||
    (quote.customer_id && c.id === quote.customer_id) ||
    (c.gymName && quote.prospectName && c.gymName.trim().toLowerCase() === quote.prospectName.trim().toLowerCase()) ||
    (c.name && quote.prospectName && c.name.trim().toLowerCase() === quote.prospectName.trim().toLowerCase()) ||
    (c.phone && quote.prospectPhone && c.phone.trim() === quote.prospectPhone.trim())
  ) || {};
  const displayAddress = quote.prospectAddress || quote.address || customer.address || '';
  const isConverted = quote.status === 'Converted to Invoice';
  const isAccepted = quote.status === 'Accepted';
  const isRejected = quote.status === 'Rejected';
  const isExpired = quote.status === 'Expired';
  const isVoid = quote.status === 'Void';
  const isLocked = isConverted || Boolean(quote.isLocked) || isVoid;
  const hasCounterOffer = quote.status === 'Counter Offer' || (quote.counterOffers && quote.counterOffers.length > 0);
  const latestCounterOffer = quote.lastCounterOffer || (quote.counterOffers && quote.counterOffers[0]);

  // Auto-resolve linked invoice record
  const linkedInvoice = invoices.find(inv => {
    if (!inv) return false;
    const invNum = String(inv.invoiceNumber || inv.invoice_number || '').trim();
    const invId = String(inv.id || inv.shareKey || '').trim();
    const qNum = String(quote.quoteNumber || quote.quote_number || '').trim();
    const qId = String(quote.id || quote.shareKey || '').trim();

    if (quote.convertedInvoiceNumber && invNum === String(quote.convertedInvoiceNumber).trim()) return true;
    if (quote.convertedInvoiceId && invId === String(quote.convertedInvoiceId).trim()) return true;
    if (quote.converted_invoice_number && invNum === String(quote.converted_invoice_number).trim()) return true;
    if (quote.converted_invoice_id && invId === String(quote.converted_invoice_id).trim()) return true;
    if (qNum && (inv.quoteRef === qNum || inv.quotationNumber === qNum || inv.quote_ref === qNum)) return true;
    if (qId && (inv.quotationId === qId || inv.quotation_id === qId)) return true;
    
    const pName = (quote.prospectName || '').toLowerCase().trim();
    const invName = (inv.prospectName || inv.customerName || '').toLowerCase().trim();
    if (pName && invName && pName === invName && Math.abs((Number(inv.amount) || 0) - (Number(quote.amount) || 0)) < 1) {
      return true;
    }
    return false;
  });

  const rawInvoiceNumber = quote.convertedInvoiceNumber || 
                           quote.converted_invoice_number || 
                           linkedInvoice?.invoiceNumber || 
                           linkedInvoice?.invoice_number || 
                           (isConverted
                             ? (quote.invoiceNumber || `INV-${String(quote.quoteNumber || '1001').replace(/[^0-9]/g, '') || '1001'}`)
                             : null);

  const formattedInvoiceNumber = rawInvoiceNumber 
    ? (String(rawInvoiceNumber).startsWith('#') ? rawInvoiceNumber : `#${rawInvoiceNumber}`) 
    : '';

  const handleWhatsAppShare = async () => {
    let finalLink = shareLink;
    if (typeof verifyAndGetShareLink === 'function') {
      const res = await verifyAndGetShareLink('quote', quote);
      if (res && (res.shareUrl || res.link)) finalLink = res.shareUrl || res.link;
    }
    const text = `Hello ${quote.prospectName || 'Valued Customer'},\n\nPlease review your quotation *#${quote.quoteNumber}* from ${smsConfig?.companyName || 'Seynex Technology'}.\n\n*Total:* LKR ${(Number(quote.amount) || 0).toLocaleString()}\n*Validity:* ${quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : '30 Days'}\n\nView & respond directly online:\n${finalLink}\n\nThank you!`;
    openWhatsApp({
      phone: quote.prospectPhone || '',
      text
    });
    if (quote.status === 'Draft' || quote.status === 'Pending') {
      updateQuoteStatus && updateQuoteStatus(quote.id, 'Sent');
    }
  };
  
  let borderLeftColor = 'var(--panel-border)';
  if (isConverted) borderLeftColor = '#10b981';
  else if (isAccepted) borderLeftColor = 'var(--success)';
  else if (isRejected || isVoid) borderLeftColor = 'var(--danger)';
  else if (hasCounterOffer) borderLeftColor = '#f59e0b';
  else if (isExpired) borderLeftColor = '#94a3b8';
  else borderLeftColor = 'var(--warning)';

  return (
    <div className="glass-panel hover-lift" style={{ 
      padding: '20px', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '20px',
      borderLeft: `4px solid ${borderLeftColor}`
    }}>
      {/* Top Identity Row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: 'rgba(129, 140, 248, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(129, 140, 248, 0.2)', flexShrink: 0
          }}>
            <FileText size={22} color="var(--accent-primary)" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: '2px', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {quote.prospectName || 'Unnamed Prospect'}
            </div>
            <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>#{quote.quoteNumber}</span>
              <span style={{ opacity: 0.3 }}>•</span>
              <span className="sm-hidden">{quote.prospectPhone || 'No contact'}</span>
              <span className="sm-hidden" style={{ opacity: 0.3 }}>•</span>
              <span className="sm-hidden">{new Date(quote.date).toLocaleDateString()}</span>
            </div>
            <div style={{ 
              fontSize: '0.74rem', 
              color: displayAddress ? 'var(--text-primary)' : 'var(--text-muted)', 
              marginTop: '5px', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px',
              background: displayAddress ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.03)',
              padding: '2px 8px',
              borderRadius: '6px',
              border: `1px solid ${displayAddress ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)'}`,
              width: 'fit-content',
              maxWidth: '100%'
            }}>
              <MapPin size={11} className={displayAddress ? "text-accent" : "text-muted"} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '340px', fontWeight: displayAddress ? 600 : 400 }} title={displayAddress || 'Address: None recorded'}>
                {displayAddress ? `Address: ${displayAddress}` : 'Address: None recorded'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ flexShrink: 0 }}>
          {isConverted ? (
            <div 
              onClick={() => navigate(`/invoices?search=${encodeURIComponent(rawInvoiceNumber || '')}`)}
              style={{
                height: '34px', padding: '4px 12px',
                borderRadius: '8px', fontSize: '0.78rem', fontWeight: 800,
                background: 'rgba(16, 185, 129, 0.16)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#10b981',
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                minWidth: '150px', justifyContent: 'center',
                cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap'
              }} 
              title={`Invoiced ${formattedInvoiceNumber}. Click to view linked invoice.`}
            >
              <Lock size={12} style={{ color: '#10b981' }} />
              <span>Invoiced ({formattedInvoiceNumber})</span>
            </div>
          ) : isLocked ? (
            <div style={{
              height: '34px', padding: '4px 12px',
              borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', gap: '6px',
              minWidth: '130px', justifyContent: 'center',
              cursor: 'default', userSelect: 'none', whiteSpace: 'nowrap'
            }} title={`Status locked: ${quote.status}`}>
              <Lock size={12} style={{ opacity: 0.6 }} />
              <span>{quote.status || 'Locked'}</span>
            </div>
          ) : (
            <CustomSelect 
              value={quote.status || 'Draft'}
              onChange={(val) => updateQuoteStatus && updateQuoteStatus(quote.id, val)}
              options={[
                { value: 'Draft', label: 'Draft' },
                { value: 'Sent', label: 'Sent' },
                { value: 'Pending', label: 'Pending' },
                { value: 'Counter Offer', label: 'Counter Offer' },
                { value: 'Accepted', label: 'Accepted' },
                { value: 'Rejected', label: 'Rejected' },
                { value: 'Expired', label: 'Expired' }
              ]}
              size="sm"
              style={{ minWidth: '150px' }}
              triggerStyle={{
                height: '34px',
                fontSize: '0.78rem',
                fontWeight: 700,
                padding: '4px 10px',
                whiteSpace: 'nowrap'
              }}
            />
          )}
        </div>
      </div>

      {/* COUNTER OFFER BANNER */}
      {hasCounterOffer && latestCounterOffer && (
        <div style={{
          padding: '14px 18px',
          borderRadius: '12px',
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <AlertTriangle size={14} /> Customer Proposed Budget (Counter Offer)
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: '4px' }}>
              Proposed Budget: <strong style={{ color: '#f59e0b', whiteSpace: 'nowrap' }}>LKR {(Number(latestCounterOffer.proposedBudget) || 0).toLocaleString()}</strong>
              {' '}(Original: LKR {(Number(quote.amount) || 0).toLocaleString()} • Diff: {(Number(latestCounterOffer.difference) || 0).toLocaleString()})
            </div>
            {latestCounterOffer.message && (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', fontStyle: 'italic' }}>
                "{latestCounterOffer.message}"
              </div>
            )}
            {latestCounterOffer.preferredChanges && (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Preferred Changes: {latestCounterOffer.preferredChanges}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ background: 'var(--success)', border: 'none', padding: '6px 12px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
              onClick={() => {
                updateQuoteStatus && updateQuoteStatus(quote.id, 'Accepted');
              }}
            >
              <CheckCircle size={14} /> Accept Offer
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
              onClick={() => {
                if (isLocked) {
                  showNotification && showNotification(`Quotation #${quote.quoteNumber} is locked from editing.`, 'warning');
                  return;
                }
                onEdit && onEdit();
              }}
            >
              <RefreshCw size={14} /> Revise Quote
            </button>
          </div>
        </div>
      )}

      {/* Detail & Action Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between items-end md:items-center gap-4 pt-4 border-t border-panel">
        <div>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', whiteSpace: 'nowrap' }}>
            Net Offer Total
          </div>
          <div style={{ fontWeight: 850, color: 'var(--text-primary)', fontSize: '1.15rem', fontFamily: 'var(--font-display)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ color: 'var(--accent-primary)', fontSize: '0.8rem', marginRight: '4px' }}>LKR</span>
            {(Number(quote.amount) || 0).toLocaleString()}
          </div>
        </div>

        <div className="action-bar md:justify-end w-full" style={{ flexWrap: 'wrap', gap: '6px' }}>
          <a 
            href={previewLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn btn-secondary" 
            style={{ width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
            title="Preview Shared Quotation"
            aria-label="Preview Shared Quotation"
          >
            <Eye size={16} className="text-accent" />
          </a>
          <button 
            type="button"
            className="btn" 
            style={{ 
              width: '40px', height: '40px', padding: 0, 
              background: 'rgba(34, 197, 94, 0.15)', 
              color: '#22c55e', 
              border: '1px solid rgba(34, 197, 94, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }} 
            onClick={handleWhatsAppShare}
            title="Share via WhatsApp"
            aria-label="Share via WhatsApp"
          >
            <MessageCircle size={16} />
          </button>
          <button 
            type="button"
            className="btn btn-secondary" 
            style={{ width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
            onClick={async () => {
              let finalLink = shareLink;
              if (typeof verifyAndGetShareLink === 'function') {
                const res = await verifyAndGetShareLink('quote', quote);
                if (res && (res.shareUrl || res.link)) finalLink = res.shareUrl || res.link;
                if (res && res.success === false) return;
              }
              navigator.clipboard.writeText(finalLink);
              showNotification && showNotification('Public quotation share link copied to clipboard!', 'success');
            }}
            title="Copy Public Link"
            aria-label="Copy Public Link"
          >
            <LinkIcon size={16} />
          </button>
          <button 
            type="button"
            className="btn btn-secondary" 
            style={{ width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
            onClick={onSendSms} 
            title="Send SMS"
            aria-label="Send SMS"
          >
            <Smartphone size={16} className="text-secondary" />
          </button>
          
          {isLocked ? (
            <button 
              type="button"
              className="btn btn-secondary" 
              style={{ 
                width: '40px', height: '40px', padding: 0, 
                opacity: 0.6, cursor: 'not-allowed',
                background: 'rgba(255,255,255,0.03)',
                borderColor: 'rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }} 
              onClick={() => {
                showNotification && showNotification(`Quotation #${quote.quoteNumber} is locked from editing.`, 'warning');
              }} 
              title="Locked from editing"
              aria-label="Locked from editing"
            >
              <Lock size={16} style={{ color: 'var(--text-muted)' }} />
            </button>
          ) : (
            <button 
              type="button"
              className="btn btn-secondary" 
              style={{ width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
              onClick={onEdit} 
              title="Edit Quotation"
              aria-label="Edit Quotation"
            >
              <Edit2 size={16} />
            </button>
          )}

          <button 
            type="button"
            className="btn btn-secondary" 
            style={{ width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
            onClick={onDownload} 
            title="Download PDF"
            aria-label="Download PDF"
          >
            <Download size={16} />
          </button>
          
          {/* Admin Unlock Action */}
          {isAdmin && isLocked && (
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ width: '40px', height: '40px', padding: 0, color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
              onClick={onUnlock} 
              title="Admin: Unlock Quotation"
              aria-label="Unlock Quotation"
            >
              <Unlock size={16} />
            </button>
          )}

          {/* Admin Void Action */}
          {isAdmin && !isVoid && (
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ width: '40px', height: '40px', padding: 0, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
              onClick={onVoid} 
              title="Admin: Void Quotation"
              aria-label="Void Quotation"
            >
              <Ban size={16} />
            </button>
          )}

          {/* Admin Delete Action */}
          {isAdmin && (
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ width: '40px', height: '40px', padding: 0, color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
              onClick={onRequestDelete} 
              title="Admin: Delete Quotation"
              aria-label="Delete Quotation"
            >
              <Trash2 size={16} />
            </button>
          )}
          
          {/* Explicit Convert to Tax Invoice CTA */}
          {isAccepted && !isConverted && !isExpired && (
             <button 
               type="button"
               className="btn btn-primary" 
               style={{ height: '40px', padding: '0 14px', background: 'var(--success)', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }} 
               onClick={onRequestConvert || (() => convertQuoteToInvoice && convertQuoteToInvoice(quote.id))}
               title="Convert this quotation to an official Tax Invoice"
             >
               <Receipt size={16} /> <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>Convert to Invoice</span>
             </button>
          )}

          {/* Linked Invoice Pill */}
          {isConverted && (
            <button
              type="button"
              className="badge badge-success"
              style={{
                height: '40px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 14px',
                fontSize: '0.78rem',
                fontWeight: 800,
                border: '1px solid rgba(16, 185, 129, 0.4)',
                background: 'rgba(16, 185, 129, 0.16)',
                color: '#10b981',
                borderRadius: '8px',
                cursor: 'pointer',
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
              onClick={() => {
                navigate(`/invoices?search=${encodeURIComponent(rawInvoiceNumber || '')}`);
              }}
              title={`Click to view Linked Invoice ${formattedInvoiceNumber}`}
            >
              <Receipt size={14} /> Invoiced {formattedInvoiceNumber}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const QuoteModal = ({ onClose, onSave, inventory = [], initialData, customers = [] }) => {
  const { smsConfig = {}, showNotification, quotes = [] } = useContext(StoreContext) || {};
  const isLocked = Boolean(
    initialData && (
      initialData.status === 'Converted to Invoice' || 
      initialData.isLocked ||
      initialData.status === 'Void'
    )
  );

  const initialDiscountItem = initialData?.items?.find(i => i.isDiscount);
  const initialDiscount = initialDiscountItem ? Math.abs(initialDiscountItem.price) : (initialData?.discount || 0);
  const initialItems = initialData?.items?.filter(i => !i.isDiscount) || [];

  const [taxRate, setTaxRate] = useState(Number(initialData?.taxRate ?? 0));
  const [errors, setErrors] = useState({});
  const quoteNumberRef = useRef(null);
  const prospectNameRef = useRef(null);
  const itemsContainerRef = useRef(null);

  const [formData, setFormData] = useState({
    quoteNumber: initialData?.quoteNumber || (() => {
      return getNextSequentialQuoteNumber(quotes, smsConfig).formattedNumber;
    })(),
    date: initialData?.date || new Date().toISOString().split('T')[0],
    customerId: initialData?.customerId || initialData?.customer_id || '',
    prospectName: initialData?.prospectName || '', 
    prospectPhone: initialData?.prospectPhone || '',
    prospectAddress: initialData?.prospectAddress || initialData?.address || initialData?.prospect_address || (() => {
      const match = customers.find(c => (initialData?.customerId && c.id === initialData.customerId) || (initialData?.prospectName && (c.gymName?.toLowerCase() === initialData.prospectName.toLowerCase() || c.name?.toLowerCase() === initialData.prospectName.toLowerCase())));
      return match?.address || '';
    })(),
    address: initialData?.address || initialData?.prospectAddress || initialData?.prospect_address || (() => {
      const match = customers.find(c => (initialData?.customerId && c.id === initialData.customerId) || (initialData?.prospectName && (c.gymName?.toLowerCase() === initialData.prospectName.toLowerCase() || c.name?.toLowerCase() === initialData.prospectName.toLowerCase())));
      return match?.address || '';
    })(),
    status: initialData?.status || 'Draft',
    items: initialItems,
    discount: initialDiscount,
    validUntil: initialData?.validUntil || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    notes: initialData?.notes || '',
    agreementTerms: initialData?.agreementTerms || '1. Validity: 30 days from date of issue.\n2. Payment Terms: 50% advance upon contract signing, balance on completion.\n3. Taxes: All rates quoted are in Sri Lankan Rupees (LKR).'
  });

  const [selectedInventoryId, setSelectedInventoryId] = useState('');

  const calculateSubtotal = (items) => items.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 1)), 0);
  const calculateDiscount = (discount) => Number(discount || 0);
  const calculateTaxAmount = (items, discount, rate) => {
    const sub = calculateSubtotal(items);
    const taxableBase = Math.max(0, sub - calculateDiscount(discount));
    return Math.round(taxableBase * (Number(rate || 0) / 100));
  };
  const calculateNetTotal = (items, discount, rate) => {
    const sub = calculateSubtotal(items);
    const taxableBase = Math.max(0, sub - calculateDiscount(discount));
    const tax = Math.round(taxableBase * (Number(rate || 0) / 100));
    return taxableBase + tax;
  };

  const handleAddItemById = (itemId) => {
    if (!itemId) return;
    const invItem = inventory.find(i => i.id === itemId);
    if (!invItem) return;

    let newItems = [...formData.items];
    const existingIndex = newItems.findIndex(i => i.id === invItem.id);
    
    if (existingIndex >= 0) {
      newItems[existingIndex] = {
        ...newItems[existingIndex],
        quantity: (Number(newItems[existingIndex].quantity) || 1) + 1
      };
    } else {
      const isOneTimeName = invItem.name && /(one[- ]?time|setup|install|perpetual)/i.test(invItem.name);
      const defaultCycle = invItem.billingCycle || ((invItem.type === 'Hardware' || isOneTimeName) ? 'One-Time' : 'Annual');
      newItems.push({ ...invItem, quantity: 1, billingCycle: defaultCycle });
    }
    
    setFormData(prev => ({ ...prev, items: newItems }));
    if (errors.items) {
      setErrors(prev => ({ ...prev, items: null }));
    }
    if (showNotification) {
      showNotification(`Added "${invItem.name}"`, 'success');
    }
  };

  const handleAddCustomItem = () => {
    const customItem = {
      id: 'custom-' + Date.now(),
      name: 'Custom Service / Item',
      price: 0,
      quantity: 1,
      type: 'Service',
      billingCycle: 'One-Time'
    };
    const newItems = [...formData.items, customItem];
    setFormData(prev => ({ ...prev, items: newItems }));
    if (errors.items) {
      setErrors(prev => ({ ...prev, items: null }));
    }
    if (showNotification) {
      showNotification('Custom item added. You can rename and set price below.', 'info');
    }
  };

  const handleUpdateItemName = (idx, newName) => {
    const newItems = [...formData.items];
    newItems[idx] = { ...newItems[idx], name: newName };
    setFormData({ ...formData, items: newItems });
  };

  const handleUpdateItemBillingCycle = (idx, newCycle) => {
    const newItems = [...formData.items];
    newItems[idx] = { ...newItems[idx], billingCycle: newCycle };
    setFormData({ ...formData, items: newItems });
  };

  const handleUpdateItemQty = (idx, deltaOrVal, isAbsolute = false) => {
    const newItems = [...formData.items];
    let newQty = isAbsolute ? Number(deltaOrVal) : (Number(newItems[idx].quantity) || 1) + deltaOrVal;
    if (newQty < 1) newQty = 1;
    newItems[idx] = { ...newItems[idx], quantity: newQty };
    setFormData({ ...formData, items: newItems });
  };

  const handleRemoveItem = (idx) => {
    const newItems = formData.items.filter((_, i) => i !== idx);
    setFormData({ ...formData, items: newItems });
  };

  const handleUpdateItemPrice = (idx, newPrice) => {
    const newItems = [...formData.items];
    newItems[idx] = { ...newItems[idx], price: Number(newPrice) };
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.quoteNumber?.trim()) {
      newErrors.quoteNumber = 'Quotation ID is required.';
    }
    if (!formData.prospectName?.trim()) {
      newErrors.prospectName = 'Client / Business Name is required.';
    }
    if (formData.items.length === 0) {
      newErrors.items = 'Please add at least one line item to the proposal.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.quoteNumber && quoteNumberRef.current) {
        quoteNumberRef.current.focus();
      } else if (newErrors.prospectName && prospectNameRef.current) {
        prospectNameRef.current.focus();
      } else if (newErrors.items && itemsContainerRef.current) {
        itemsContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      showNotification && showNotification('Please correct the highlighted errors before saving.', 'error');
      return;
    }

    const subtotal = calculateSubtotal(formData.items);
    const discountVal = calculateDiscount(formData.discount);
    const taxAmountVal = calculateTaxAmount(formData.items, formData.discount, taxRate);
    const netTotalVal = calculateNetTotal(formData.items, formData.discount, taxRate);

    const finalItems = [...formData.items];
    if (discountVal > 0) {
      finalItems.push({ name: 'Discount', price: -discountVal, quantity: 1, isDiscount: true });
    }

    onSave({
      ...formData,
      items: finalItems,
      subtotal,
      discount: discountVal,
      taxRate: Number(taxRate || 0),
      taxAmount: taxAmountVal,
      tax: taxAmountVal,
      amount: netTotalVal
    });
    onClose();
  };

  // Lock body scroll while modal is active
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  if (typeof document === 'undefined') return null;

  const currentSubtotal = calculateSubtotal(formData.items);
  const currentDiscount = calculateDiscount(formData.discount);
  const currentTaxAmount = calculateTaxAmount(formData.items, formData.discount, taxRate);
  const currentNetTotal = calculateNetTotal(formData.items, formData.discount, taxRate);

  return createPortal(
    <div 
      className="modal-overlay app-modal-backdrop"
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        inset: 0,
        width: '100vw',
        height: '100dvh',
        background: 'rgba(2, 6, 23, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        padding: '12px'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        className="glass-panel app-modal-dialog" 
        style={{ 
          width: '100%', 
          maxWidth: '820px', 
          maxHeight: 'min(94vh, calc(100dvh - 16px))', 
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: 'var(--radius, 16px)',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.55)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Compact Modal Header */}
        <div style={{ flexShrink: 0, padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {isLocked ? 'View Quotation' : (initialData ? 'Update Quotation' : 'Craft Proposal')}
              </h2>
              {isLocked && (
                <span style={{ 
                  background: 'rgba(239, 68, 68, 0.12)', 
                  color: '#ef4444', 
                  padding: '2px 8px', 
                  borderRadius: '12px', 
                  fontSize: '0.68rem', 
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Lock size={11} /> LOCKED
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Sequential Quote #{formData.quoteNumber}
            </div>
          </div>
          <button 
            type="button"
            className="btn btn-secondary modal-close-btn" 
            style={{ 
              width: '40px', 
              height: '40px', 
              minWidth: '40px',
              minHeight: '40px',
              padding: 0, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              borderRadius: '10px',
              color: 'var(--text-primary)',
              background: 'var(--surface-2, var(--surface))',
              border: '1px solid var(--border)',
              cursor: 'pointer'
            }} 
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} strokeWidth={2.5} style={{ stroke: 'currentColor', color: 'inherit' }} />
          </button>
        </div>

        {isLocked && (
          <div style={{
            margin: '12px 20px 0 20px',
            padding: '10px 14px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#ef4444',
            fontSize: '0.8rem',
            fontWeight: 600
          }}>
            <Lock size={14} />
            <span>This quotation has been converted to an invoice or locked, and is displayed in read-only mode.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Row 1: Quote Meta Details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>
                  Quotation ID # *
                </label>
                <input 
                  ref={quoteNumberRef}
                  required 
                  type="text" 
                  className="form-input" 
                  style={{ 
                    height: '36px', fontSize: '0.82rem', padding: '4px 10px',
                    borderColor: errors.quoteNumber ? '#ef4444' : undefined,
                    background: errors.quoteNumber ? 'rgba(239, 68, 68, 0.05)' : undefined
                  }} 
                  value={formData.quoteNumber} 
                  onChange={e => {
                    setFormData({...formData, quoteNumber: e.target.value});
                    if (errors.quoteNumber) setErrors(prev => ({ ...prev, quoteNumber: null }));
                  }} 
                />
                {errors.quoteNumber && (
                  <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 600, marginTop: '2px', display: 'block' }}>
                    {errors.quoteNumber}
                  </span>
                )}
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>
                  Offer Date
                </label>
                <input 
                  required 
                  type="date" 
                  className="form-input" 
                  style={{ height: '36px', fontSize: '0.82rem', padding: '4px 10px' }} 
                  value={formData.date} 
                  onChange={e => setFormData({...formData, date: e.target.value})} 
                />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>
                  Valid Until
                </label>
                <input 
                  required 
                  type="date" 
                  className="form-input" 
                  style={{ height: '36px', fontSize: '0.82rem', padding: '4px 10px' }} 
                  value={formData.validUntil} 
                  onChange={e => setFormData({...formData, validUntil: e.target.value})} 
                />
              </div>
            </div>

            {/* Row 2: Client Info (Aligned Baseline) */}
            <div style={{ padding: '14px 16px', background: 'var(--subtle-bg)', borderRadius: '12px', border: '1px solid var(--subtle-border)' }}>
              {customers.length > 0 && !initialData && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Quick Link Registered Client (Optional)
                  </label>
                  <CustomSelect 
                    value={formData.customerId || ''}
                    onChange={(val) => {
                      const sel = customers.find(c => c.id === val);
                      if (sel) {
                        setFormData(prev => ({ 
                          ...prev, 
                          customerId: sel.id,
                          prospectName: sel.gymName || sel.name || '', 
                          prospectPhone: sel.phone || '',
                          prospectAddress: sel.address || '',
                          address: sel.address || ''
                        }));
                        if (errors.prospectName) setErrors(prev => ({ ...prev, prospectName: null }));
                      } else {
                        setFormData(prev => ({ ...prev, customerId: '' }));
                      }
                    }}
                    placeholder="+ Select registered client (optional)..."
                    options={[
                      { value: '', label: '+ Select registered client (optional)...' },
                      ...customers.map(c => ({ value: c.id, label: `${c.gymName || c.name} (${c.name || 'Client'})` }))
                    ]}
                  />
                </div>
              )}
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', alignItems: 'start' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>
                    Client / Business Name *
                  </label>
                  <input 
                    ref={prospectNameRef}
                    required 
                    type="text" 
                    placeholder="Enter Client / Business Name"
                    className="form-input" 
                    style={{ 
                      height: '36px', fontSize: '0.82rem', padding: '4px 10px',
                      borderColor: errors.prospectName ? '#ef4444' : undefined,
                      background: errors.prospectName ? 'rgba(239, 68, 68, 0.05)' : undefined
                    }} 
                    value={formData.prospectName} 
                    onChange={e => {
                      setFormData({...formData, prospectName: e.target.value});
                      if (errors.prospectName) setErrors(prev => ({ ...prev, prospectName: null }));
                    }} 
                  />
                  {errors.prospectName && (
                    <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 600, marginTop: '2px', display: 'block' }}>
                      {errors.prospectName}
                    </span>
                  )}
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>
                    Prospect Mobile
                  </label>
                  <input 
                    type="tel" 
                    className="form-input" 
                    style={{ height: '36px', fontSize: '0.82rem', padding: '4px 10px' }} 
                    placeholder="07XXXXXXXX" 
                    value={formData.prospectPhone} 
                    onChange={e => setFormData({...formData, prospectPhone: e.target.value})} 
                  />
                </div>
              </div>

              {/* Client Address */}
              <div style={{ marginTop: '10px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>
                  Client / Billing Address
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ height: '36px', fontSize: '0.82rem', padding: '4px 10px' }} 
                  placeholder="e.g. No. 45/A, Galle Road, Colombo 03" 
                  value={formData.prospectAddress || formData.address || ''} 
                  onChange={e => setFormData({...formData, prospectAddress: e.target.value, address: e.target.value})} 
                />
              </div>
            </div>

            {/* Row 3: Add Items from Catalog */}
            <div 
              ref={itemsContainerRef}
              style={{ 
                padding: '14px 16px', background: 'var(--subtle-bg)', borderRadius: '12px', 
                border: `1px solid ${errors.items ? '#ef4444' : 'var(--subtle-border)'}` 
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  Proposal Items ({formData.items.length})
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {inventory.length} {inventory.length === 1 ? 'item' : 'items'} in catalog
                </span>
              </div>

              {errors.items && (
                <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '6px', color: '#ef4444', fontSize: '0.76rem', fontWeight: 600, marginBottom: '10px' }}>
                  {errors.items}
                </div>
              )}

              {!isLocked && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <CustomSelect 
                      value={selectedInventoryId}
                      onChange={(val) => {
                        if (val) {
                          handleAddItemById(val);
                          setSelectedInventoryId('');
                        }
                      }}
                      placeholder="+ Search & select inventory item to add..."
                      options={[
                        { value: '', label: inventory.length === 0 ? '+ Catalog empty (add Custom Item)' : '+ Browse & add item from catalog...' },
                        ...inventory.map(inv => ({
                          value: inv.id,
                          label: `${inv.name} • LKR ${(inv.price || 0).toLocaleString()} ${inv.type === 'Hardware' ? `(Stock: ${inv.stock || 0})` : `(${inv.type || 'Service'})`}`
                        }))
                      ]}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ 
                      height: '42px', 
                      padding: '0 14px', 
                      fontSize: '0.8rem', 
                      whiteSpace: 'nowrap', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '5px',
                      flexShrink: 0
                    }}
                    onClick={handleAddCustomItem}
                    title="Add custom line item not in catalog"
                  >
                    <Plus size={15} /> Custom Item
                  </button>
                </div>
              )}

              {/* Added Items Responsive Table */}
              {formData.items.length > 0 ? (
                <div style={{ border: '1px solid var(--subtle-border)', borderRadius: '10px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
                  <table style={{ width: '100%', minWidth: '580px', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--subtle-border)' }}>
                        <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Item</th>
                        <th style={{ padding: '8px 6px', textAlign: 'center', width: '115px', color: 'var(--text-muted)', fontWeight: 600 }}>Fee Type</th>
                        <th style={{ padding: '8px 6px', textAlign: 'center', width: '95px', color: 'var(--text-muted)', fontWeight: 600 }}>Qty</th>
                        <th style={{ padding: '8px 6px', textAlign: 'right', width: '100px', color: 'var(--text-muted)', fontWeight: 600 }}>Price</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right', width: '110px', color: 'var(--text-muted)', fontWeight: 600 }}>Total</th>
                        <th style={{ padding: '8px 8px', width: '36px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((it, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{
                                fontSize: '0.62rem',
                                fontWeight: 700,
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: (it.type === 'Hardware' || /(device|reader|lock|sensor|switch|power supply|battery|terminal|zkteco|biometric|face|hardware)/i.test(it.name || '')) ? 'rgba(14, 165, 233, 0.15)' : (it.type === 'Service' || /(install|service|training|support|setup)/i.test(it.name || '')) ? 'rgba(16, 185, 129, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                                color: (it.type === 'Hardware' || /(device|reader|lock|sensor|switch|power supply|battery|terminal|zkteco|biometric|face|hardware)/i.test(it.name || '')) ? '#38bdf8' : (it.type === 'Service' || /(install|service|training|support|setup)/i.test(it.name || '')) ? '#34d399' : '#c084fc',
                                border: `1px solid ${(it.type === 'Hardware' || /(device|reader|lock|sensor|switch|power supply|battery|terminal|zkteco|biometric|face|hardware)/i.test(it.name || '')) ? 'rgba(14, 165, 233, 0.3)' : (it.type === 'Service' || /(install|service|training|support|setup)/i.test(it.name || '')) ? 'rgba(16, 185, 129, 0.3)' : 'rgba(168, 85, 247, 0.3)'}`,
                                flexShrink: 0
                              }}>
                                {(it.type === 'Hardware' || /(device|reader|lock|sensor|switch|power supply|battery|terminal|zkteco|biometric|face|hardware)/i.test(it.name || '')) ? 'Hardware' : (it.type === 'Service' || /(install|service|training|support|setup)/i.test(it.name || '')) ? 'Service' : 'Software'}
                              </span>
                              {String(it.id || '').startsWith('custom-') ? (
                                <input
                                  type="text"
                                  className="form-input"
                                  style={{ height: '28px', fontSize: '0.8rem', padding: '2px 8px', flex: 1, minWidth: '130px' }}
                                  value={it.name}
                                  onChange={e => handleUpdateItemName(idx, e.target.value)}
                                  placeholder="Item / service description"
                                />
                              ) : (
                                <div style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={it.name}>
                                  {it.name}
                                </div>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                            <select
                              className="form-input"
                              style={{ 
                                height: '28px', 
                                fontSize: '0.74rem', 
                                padding: '1px 6px', 
                                width: '105px', 
                                background: 'var(--subtle-bg)', 
                                border: '1px solid var(--panel-border)',
                                borderRadius: '4px',
                                color: 'var(--text-primary)',
                                cursor: 'pointer'
                              }}
                              value={it.billingCycle || (it.type === 'Hardware' ? 'One-Time' : 'Annual')}
                              onChange={(e) => handleUpdateItemBillingCycle(idx, e.target.value)}
                            >
                              <option value="Annual">Annual Fee</option>
                              <option value="One-Time">One-Time Fee</option>
                              <option value="Monthly">Monthly Fee</option>
                            </select>
                          </td>
                          <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQty(idx, -1)}
                                style={{ width: '22px', height: '22px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <Minus size={11} />
                              </button>
                              <span style={{ minWidth: '22px', textAlign: 'center', fontWeight: 700, fontSize: '0.82rem' }}>
                                {it.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQty(idx, 1)}
                                style={{ width: '22px', height: '22px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <Plus size={11} />
                              </button>
                            </div>
                          </td>
                          <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                            <input 
                              type="number" 
                              className="form-input" 
                              style={{ height: '28px', width: '90px', fontSize: '0.8rem', padding: '2px 6px', textAlign: 'right' }} 
                              value={it.price} 
                              onChange={(e) => handleUpdateItemPrice(idx, e.target.value)} 
                            />
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                            {((Number(it.price) || 0) * (Number(it.quantity) || 1)).toLocaleString()}
                          </td>
                          <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                            <button 
                              type="button" 
                              onClick={() => handleRemoveItem(idx)}
                              style={{ background: 'none', border: 'none', color: 'var(--danger, #ef4444)', padding: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Remove item"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '14px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '8px' }}>
                  No items in proposal. Click or search above to add items from inventory.
                </div>
              )}
            </div>

            {/* Row 4: Discount & Tax / VAT Module */}
            <div style={{ padding: '14px 16px', background: 'rgba(245, 158, 11, 0.04)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Discount Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#f59e0b' }}>
                  <Tag size={14} />
                  <span>Discount Presets:</span>
                </div>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {[
                    { label: '5%', calc: (s) => Math.round(s * 0.05) },
                    { label: '10%', calc: (s) => Math.round(s * 0.10) },
                    { label: '15%', calc: (s) => Math.round(s * 0.15) },
                    { label: '5k', calc: () => 5000 },
                    { label: '10k', calc: () => 10000 }
                  ].map((p, idx) => {
                    const val = p.calc(currentSubtotal);
                    const active = Number(formData.discount) === val && val > 0;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFormData({ ...formData, discount: val })}
                        style={{
                          height: '24px',
                          padding: '0 8px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          border: 'none',
                          cursor: 'pointer',
                          background: active ? '#f59e0b' : 'rgba(245, 158, 11, 0.12)',
                          color: active ? '#fff' : '#f59e0b',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>LKR:</span>
                    <input 
                      type="number" 
                      className="form-input" 
                      style={{ width: '90px', height: '28px', fontSize: '0.78rem', padding: '2px 6px', textAlign: 'right', fontWeight: 700, color: '#f59e0b' }} 
                      value={formData.discount === 0 ? '' : formData.discount} 
                      onChange={e => setFormData({ ...formData, discount: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Tax / VAT Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', paddingTop: '8px', borderTop: '1px solid rgba(245, 158, 11, 0.12)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  <Receipt size={14} color="var(--accent-primary)" />
                  <span>Tax / VAT Rate:</span>
                </div>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {[0, 5, 8, 15, 18].map((rateVal) => (
                    <button
                      key={rateVal}
                      type="button"
                      onClick={() => setTaxRate(rateVal)}
                      style={{
                        height: '24px',
                        padding: '0 8px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        background: Number(taxRate) === rateVal ? 'var(--accent-primary)' : 'rgba(99, 102, 241, 0.12)',
                        color: Number(taxRate) === rateVal ? '#fff' : 'var(--accent-primary)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {rateVal}%
                    </button>
                  ))}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Custom %:</span>
                    <input 
                      type="number" 
                      min="0"
                      max="100"
                      step="0.1"
                      className="form-input" 
                      style={{ width: '65px', height: '28px', fontSize: '0.78rem', padding: '2px 6px', textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)' }} 
                      value={taxRate === 0 ? '' : taxRate} 
                      onChange={e => setTaxRate(e.target.value === '' ? 0 : Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* 4-Tier Auditable Financial Summary Breakdown */}
              <div style={{ 
                padding: '10px 14px', 
                background: 'rgba(0,0,0,0.2)', 
                borderRadius: '8px', 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', 
                gap: '8px',
                border: '1px solid rgba(255,255,255,0.04)',
                marginTop: '4px'
              }}>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Subtotal</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                    LKR {currentSubtotal.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Discount</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: currentDiscount > 0 ? '#f59e0b' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    - LKR {currentDiscount.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Tax / VAT ({taxRate}%)</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: currentTaxAmount > 0 ? 'var(--accent-primary)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    + LKR {currentTaxAmount.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Net Total</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--success)', whiteSpace: 'nowrap', fontFamily: 'var(--font-display)' }}>
                    LKR {currentNetTotal.toLocaleString()}
                  </div>
                </div>
              </div>

            </div>

            {/* Row 5: Agreement Terms */}
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>
                Terms &amp; Conditions (Optional)
              </label>
              <textarea 
                className="form-input" 
                style={{ minHeight: '52px', height: '56px', fontSize: '0.76rem', padding: '6px 10px', resize: 'vertical' }}
                placeholder="Validity, payment terms, or remarks for client..."
                value={formData.agreementTerms}
                onChange={e => setFormData({ ...formData, agreementTerms: e.target.value })}
              />
            </div>

          </div>

          {/* Compact Sticky Footer Actions */}
          <div 
            style={{
              flexShrink: 0,
              padding: '12px 20px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              background: 'var(--surface)'
            }}
          >
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ height: '36px', padding: '0 16px', fontSize: '0.82rem' }} 
              onClick={onClose}
            >
              {isLocked ? 'Close' : 'Discard'}
            </button>
            {!isLocked && (
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ height: '36px', padding: '0 18px', fontSize: '0.84rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={16} /> Save Quotation
              </button>
            )}
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default Quotations;
