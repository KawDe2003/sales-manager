import React, { useContext, useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { StoreContext, getNextSequentialQuoteNumber } from '../context/StoreContext';
import { FileText, Plus, Minus, Download, Trash2, Smartphone, Edit2, X, PlusCircle, ShoppingBag, User, Link as LinkIcon, Search, Receipt, Eye, Tag, MessageCircle, AlertTriangle, CheckCircle, RefreshCw, Lock, ChevronDown, Package, MapPin } from 'lucide-react';
import { generateDocumentPDF } from '../utils/pdfGenerator';
import { openWhatsApp } from '../utils/notificationService';
import CustomSelect from '../components/CustomSelect';

const Quotations = () => {
  const { quotes = [], addQuote, updateQuote, updateQuoteStatus, convertQuoteToInvoice, inventory = [], triggerSMS, smsConfig, customers = [], leads = [], showNotification } = useContext(StoreContext) || {};
  const [showModal, setShowModal] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
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
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '480px' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '12px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search quotes by gym, quote ID, or phone..."
            style={{ paddingLeft: '48px', height: '42px', background: 'var(--subtle-bg)' }}
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

      <div className="flex flex-col gap-4">
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
              </div>
            );
          }

          return filteredQuotes.map(quote => (
            <QuoteCard
              key={quote.id}
              quote={quote}
              updateQuoteStatus={updateQuoteStatus}
              convertQuoteToInvoice={convertQuoteToInvoice}
              onEdit={() => {
                const isSent = quote.status === 'Sent' || 
                               quote.status === 'Accepted' || 
                               quote.status === 'Converted to Invoice' || 
                               quote.status === 'Rejected' || 
                               quote.status === 'Counter Offer' || 
                               Boolean(quote.sentAt);
                if (isSent) {
                  showNotification && showNotification(`Quotation #${quote.quoteNumber || 'Proposal'} has already been sent and is locked from editing.`, 'warning');
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
    </div>
  );
};

const QuoteCard = ({ quote, updateQuoteStatus, convertQuoteToInvoice, onEdit, onSendSms, onDownload }) => {
  const navigate = useNavigate();
  const shareLink = `${window.location.origin}/share/quote/${quote.id || quote.shareKey}`;
  const previewLink = `${shareLink}?preview=true`;
  const { smsConfig = {}, invoices = [] } = useContext(StoreContext) || {};
  const isAccepted = quote.status === 'Accepted';
  const isRejected = quote.status === 'Rejected';
  const isExpired = quote.status === 'Expired';
  const hasCounterOffer = quote.status === 'Counter Offer' || (quote.counterOffers && quote.counterOffers.length > 0);
  const latestCounterOffer = quote.lastCounterOffer || (quote.counterOffers && quote.counterOffers[0]);
  const isSent = quote.status === 'Sent' || isAccepted || isRejected || quote.status === 'Converted to Invoice' || hasCounterOffer || Boolean(quote.sentAt);

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
                           (quote.status === 'Converted to Invoice' 
                             ? (quote.invoiceNumber || `INV-${String(quote.quoteNumber || '1001').replace(/[^0-9]/g, '') || '1001'}`)
                             : null);

  const formattedInvoiceNumber = rawInvoiceNumber 
    ? (String(rawInvoiceNumber).startsWith('#') ? rawInvoiceNumber : `#${rawInvoiceNumber}`) 
    : '';

  const handleWhatsAppShare = () => {
    const text = `Hello ${quote.prospectName || 'Valued Customer'},\n\nPlease review your quotation *#${quote.quoteNumber}* from ${smsConfig?.companyName || 'Seynex Technology'}.\n\n*Total:* LKR ${(Number(quote.amount) || 0).toLocaleString()}\n*Validity:* ${quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : '30 Days'}\n\nView & respond directly online:\n${shareLink}\n\nThank you!`;
    openWhatsApp({
      phone: quote.prospectPhone || '',
      text
    });
    if (quote.status === 'Draft' || quote.status === 'Pending') {
      updateQuoteStatus && updateQuoteStatus(quote.id, 'Sent');
    }
  };
  
  let borderLeftColor = 'var(--panel-border)';
  if (isAccepted) borderLeftColor = 'var(--success)';
  else if (isRejected) borderLeftColor = 'var(--danger)';
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
            {(quote.prospectAddress || quote.address) && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={11} className="text-secondary" />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '320px' }}>
                  {quote.prospectAddress || quote.address}
                </span>
              </div>
            )}
          </div>
        </div>

        <div style={{ flexShrink: 0 }}>
          {isSent ? (
            <div style={{
              height: '32px', padding: '4px 10px',
              borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', gap: '6px',
              minWidth: '120px', justifyContent: 'center',
              cursor: 'default', userSelect: 'none'
            }} title="Status is locked after sending">
              <Lock size={11} style={{ opacity: 0.6 }} />
              {quote.status === 'Converted to Invoice' && formattedInvoiceNumber ? `Invoiced (${formattedInvoiceNumber})` : (quote.status || 'Sent')}
            </div>
          ) : (
            <CustomSelect 
              value={quote.status || 'Pending'}
              onChange={(val) => updateQuoteStatus && updateQuoteStatus(quote.id, val)}
              options={[
                { value: 'Draft', label: 'Draft' },
                { value: 'Sent', label: 'Sent' },
                { value: 'Pending', label: 'Pending' },
                { value: 'Counter Offer', label: 'Counter Offer' },
                { value: 'Accepted', label: 'Accepted' },
                { value: 'Rejected', label: 'Rejected' },
                { value: 'Expired', label: 'Expired' },
                { value: 'Converted to Invoice', label: 'Converted to Invoice' }
              ]}
              size="sm"
              style={{ minWidth: '120px' }}
              triggerStyle={{
                height: '32px',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '4px 10px'
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
              Proposed Budget: <strong style={{ color: '#f59e0b' }}>LKR {(Number(latestCounterOffer.proposedBudget) || 0).toLocaleString()}</strong>
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
              style={{ background: 'var(--success)', border: 'none', padding: '6px 12px', fontSize: '0.75rem' }}
              onClick={() => {
                updateQuoteStatus(quote.id, 'Accepted');
              }}
            >
              <CheckCircle size={14} /> Accept Offer
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.75rem', opacity: isSent ? 0.6 : 1 }}
              onClick={() => {
                if (isSent) {
                  showNotification && showNotification(`Quotation #${quote.quoteNumber} has already been sent to customer and cannot be edited.`, 'warning');
                  return;
                }
                onEdit();
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
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Net Offer Estimate</div>
          <div style={{ fontWeight: 850, color: 'var(--text-primary)', fontSize: '1.15rem', fontFamily: 'var(--font-display)' }}>
            <span style={{ color: 'var(--accent-primary)', fontSize: '0.8rem', marginRight: '4px' }}>LKR</span>
            {quote.amount?.toLocaleString() || 0}
          </div>
        </div>

        <div className="action-bar md:justify-end w-full">
          <a 
            href={previewLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn btn-secondary" 
            style={{ width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
            title="View Shared Quotation"
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
          >
            <MessageCircle size={16} />
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ width: '40px', height: '40px', padding: 0 }} 
            onClick={() => {
              navigator.clipboard.writeText(shareLink);
              showNotification && showNotification('Link copied!', 'success');
            }}
            title="Share Link"
          >
            <LinkIcon size={16} />
          </button>
          <button className="btn btn-secondary" style={{ width: '40px', height: '40px', padding: 0 }} onClick={onSendSms} title="Send SMS">
            <Smartphone size={16} className="text-secondary" />
          </button>
          {isSent ? (
            <button 
              className="btn btn-secondary" 
              style={{ 
                width: '40px', height: '40px', padding: 0, 
                opacity: 0.6, cursor: 'not-allowed',
                background: 'rgba(255,255,255,0.03)',
                borderColor: 'rgba(255,255,255,0.08)' 
              }} 
              onClick={() => {
                showNotification && showNotification(`Quotation #${quote.quoteNumber} has already been sent to customer and is locked from editing.`, 'warning');
              }} 
              title="Locked: Quotation already sent"
            >
              <Lock size={16} style={{ color: 'var(--text-muted)' }} />
            </button>
          ) : (
            <button className="btn btn-secondary" style={{ width: '40px', height: '40px', padding: 0 }} onClick={onEdit} title="Edit Configuration">
              <Edit2 size={16} />
            </button>
          )}
          <button className="btn btn-secondary" style={{ width: '40px', height: '40px', padding: 0 }} onClick={onDownload} title="Export PDF">
            <Download size={16} />
          </button>
          
          {(isAccepted || quote.status === 'Accepted') && quote.status !== 'Converted to Invoice' && !isExpired && (
             <button 
               className="btn btn-primary" 
               style={{ height: '40px', padding: '0 12px', background: 'var(--success)', border: 'none', flex: '1 0 auto' }} 
               onClick={() => convertQuoteToInvoice && convertQuoteToInvoice(quote.id)}
             >
               <Receipt size={16} /> <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>Create Invoice</span>
             </button>
          )}
          {quote.status === 'Converted to Invoice' && (
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
      initialData.status === 'Sent' || 
      initialData.status === 'Accepted' || 
      initialData.status === 'Converted to Invoice' || 
      initialData.status === 'Rejected' || 
      initialData.status === 'Counter Offer' || 
      Boolean(initialData.sentAt)
    )
  );

  const initialDiscountItem = initialData?.items?.find(i => i.isDiscount);
  const initialDiscount = initialDiscountItem ? Math.abs(initialDiscountItem.price) : 0;
  const initialItems = initialData?.items?.filter(i => !i.isDiscount) || [];

  const [formData, setFormData] = useState({
    quoteNumber: initialData?.quoteNumber || (() => {
      return getNextSequentialQuoteNumber(quotes, smsConfig).formattedNumber;
    })(),
    date: initialData?.date || new Date().toISOString().split('T')[0], 
    prospectName: initialData?.prospectName || '', 
    prospectPhone: initialData?.prospectPhone || '',
    prospectAddress: initialData?.prospectAddress || initialData?.address || '',
    address: initialData?.address || initialData?.prospectAddress || '',
    status: initialData?.status || 'Draft',
    items: initialItems,
    discount: initialDiscount,
    amount: initialData?.amount || 0,
    validUntil: initialData?.validUntil || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    notes: initialData?.notes || '',
    agreementTerms: initialData?.agreementTerms || '1. Validity: 30 days from date of issue.\n2. Payment Terms: 50% advance upon contract signing, balance on completion.\n3. Taxes: All rates quoted are in Sri Lankan Rupees (LKR).'
  });

  const [invSearch, setInvSearch] = useState('');
  const [isInvOpen, setIsInvOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const invPickerRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (invPickerRef.current && !invPickerRef.current.contains(e.target)) {
        setIsInvOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Filter categories
  const categories = useMemo(() => {
    const set = new Set();
    inventory.forEach(i => {
      if (i.category && i.category !== 'General') set.add(i.category);
      else if (i.type) set.add(i.type);
    });
    return ['All', ...Array.from(set).slice(0, 5)];
  }, [inventory]);

  // Filtered inventory
  const filteredInventory = useMemo(() => {
    const q = (invSearch || '').trim().toLowerCase();
    return inventory.filter(item => {
      const matchesCategory = selectedCategory === 'All' || 
        item.category === selectedCategory || 
        item.type === selectedCategory;
      if (!matchesCategory) return false;

      if (!q) return true;
      const name = (item.name || '').toLowerCase();
      const sku = (item.sku || item.code || '').toLowerCase();
      const cat = (item.category || '').toLowerCase();
      const type = (item.type || '').toLowerCase();
      return name.includes(q) || sku.includes(q) || cat.includes(q) || type.includes(q);
    });
  }, [inventory, invSearch, selectedCategory]);

  const calculateSubtotal = (items) => items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const calculateTotal = (items, discount = 0) => calculateSubtotal(items) - Number(discount || 0);

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
    
    setFormData(prev => ({ 
      ...prev, 
      items: newItems, 
      amount: calculateTotal(newItems, prev.discount) 
    }));
    setInvSearch('');
    setIsInvOpen(false);
    if (showNotification) {
      showNotification(`Added "${invItem.name}"`, 'success');
    }
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
    setFormData({ ...formData, items: newItems, amount: calculateTotal(newItems, formData.discount) });
  };

  const handleRemoveItem = (idx) => {
    const newItems = formData.items.filter((_, i) => i !== idx);
    setFormData({ ...formData, items: newItems, amount: calculateTotal(newItems, formData.discount) });
  };

  const handleUpdateItemPrice = (idx, newPrice) => {
    const newItems = [...formData.items];
    newItems[idx] = { ...newItems[idx], price: Number(newPrice) };
    setFormData({ ...formData, items: newItems, amount: calculateTotal(newItems, formData.discount) });
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
        padding: '8px'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        className="glass-panel app-modal-dialog" 
        style={{ 
          width: '100%', 
          maxWidth: '680px', 
          maxHeight: 'min(94vh, calc(100dvh - 16px))', 
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: '14px',
          background: 'var(--panel-bg, #0d1218)',
          border: '1px solid var(--panel-border)',
          boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.5)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Compact Modal Header */}
        <div style={{ flexShrink: 0, padding: '12px 18px', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
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
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Sequential Quote #{formData.quoteNumber}
            </div>
          </div>
          <button 
            type="button"
            className="btn btn-secondary" 
            style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }} 
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {isLocked && (
          <div style={{
            margin: '10px 16px 0 16px',
            padding: '8px 12px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#ef4444',
            fontSize: '0.78rem',
            fontWeight: 600
          }}>
            <Lock size={14} />
            <span>This quotation has already been sent to the customer and is in read-only mode.</span>
          </div>
        )}

        <form onSubmit={(e) => { 
          e.preventDefault(); 
          const finalItems = [...formData.items];
          if (Number(formData.discount) > 0) {
            finalItems.push({ name: 'Discount', price: -Number(formData.discount), quantity: 1, isDiscount: true });
          }
          onSave({ ...formData, items: finalItems }); 
          onClose(); 
        }} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* Row 1: Quote Meta Details (Compact 3-column) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>
                  Quotation ID #
                </label>
                <input 
                  required 
                  type="text" 
                  className="form-input" 
                  style={{ height: '35px', fontSize: '0.82rem', padding: '4px 8px' }} 
                  value={formData.quoteNumber} 
                  onChange={e => setFormData({...formData, quoteNumber: e.target.value})} 
                />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>
                  Offer Date
                </label>
                <input 
                  required 
                  type="date" 
                  className="form-input" 
                  style={{ height: '35px', fontSize: '0.82rem', padding: '4px 8px' }} 
                  value={formData.date} 
                  onChange={e => setFormData({...formData, date: e.target.value})} 
                />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>
                  Valid Until
                </label>
                <input 
                  required 
                  type="date" 
                  className="form-input" 
                  style={{ height: '35px', fontSize: '0.82rem', padding: '4px 8px' }} 
                  value={formData.validUntil} 
                  onChange={e => setFormData({...formData, validUntil: e.target.value})} 
                />
              </div>
            </div>

            {/* Row 2: Client Info (Compact Card) */}
            <div style={{ padding: '10px 12px', background: 'var(--subtle-bg)', borderRadius: '10px', border: '1px solid var(--subtle-border)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', margin: 0 }}>
                      Client / Gym Name
                    </label>
                    {customers.length > 0 && !initialData && (
                      <select 
                        style={{ 
                          height: '22px', 
                          fontSize: '0.7rem', 
                          padding: '0 4px', 
                          background: 'transparent', 
                          border: 'none', 
                          color: 'var(--accent-primary, #6366f1)',
                          fontWeight: 600,
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                        defaultValue=""
                        onChange={(e) => {
                          const sel = customers.find(c => c.id === e.target.value);
                          if (sel) {
                            setFormData(prev => ({ 
                              ...prev, 
                              prospectName: sel.gymName, 
                              prospectPhone: sel.phone || '',
                              prospectAddress: sel.address || '',
                              address: sel.address || ''
                            }));
                          }
                          e.target.value = '';
                        }}
                      >
                        <option value="" disabled>+ Link Client</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id} style={{ background: '#1e293b', color: '#fff' }}>{c.gymName}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <input 
                    required 
                    type="text" 
                    placeholder="Enter Gym / Business Name"
                    className="form-input" 
                    style={{ height: '35px', fontSize: '0.82rem', padding: '4px 8px' }} 
                    value={formData.prospectName} 
                    onChange={e => setFormData({...formData, prospectName: e.target.value})} 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>
                    Prospect Mobile
                  </label>
                  <input 
                    type="tel" 
                    className="form-input" 
                    style={{ height: '35px', fontSize: '0.82rem', padding: '4px 8px' }} 
                    placeholder="07XXXXXXXX" 
                    value={formData.prospectPhone} 
                    onChange={e => setFormData({...formData, prospectPhone: e.target.value})} 
                  />
                </div>
              </div>

              {/* Client Address */}
              <div style={{ marginTop: '8px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>
                  Client / Billing Address
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ height: '35px', fontSize: '0.82rem', padding: '4px 8px' }} 
                  placeholder="e.g. No. 45/A, Galle Road, Colombo 03" 
                  value={formData.prospectAddress || formData.address || ''} 
                  onChange={e => setFormData({...formData, prospectAddress: e.target.value, address: e.target.value})} 
                />
              </div>
            </div>

            {/* Row 3: Unified Line Items & Mini Inventory Search Combobox */}
            <div style={{ padding: '12px', background: 'var(--subtle-bg)', borderRadius: '10px', border: '1px solid var(--subtle-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  Proposal Items ({formData.items.length})
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {inventory.length} items in catalog
                </span>
              </div>

              {/* UNIFIED COMPACT SEARCH & ADD COMBOBOX */}
              {!isLocked && (
                <div ref={invPickerRef} style={{ position: 'relative', width: '100%', marginBottom: '10px' }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Search 
                      size={14} 
                      style={{ 
                        position: 'absolute', 
                        left: '10px', 
                        color: invSearch ? 'var(--accent-primary, #6366f1)' : 'var(--text-muted)',
                        pointerEvents: 'none'
                      }} 
                    />
                    <input
                      type="text"
                      className="form-input"
                      value={invSearch}
                      onFocus={() => setIsInvOpen(true)}
                      onChange={(e) => {
                        setInvSearch(e.target.value);
                        setIsInvOpen(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (filteredInventory.length > 0) {
                            handleAddItemById(filteredInventory[0].id);
                          }
                        } else if (e.key === 'Escape') {
                          setIsInvOpen(false);
                        }
                      }}
                      placeholder="Quick search & add inventory (type name, SKU, or category)..."
                      style={{
                        height: '34px',
                        paddingLeft: '32px',
                        paddingRight: '60px',
                        fontSize: '0.8rem',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderColor: isInvOpen ? 'var(--accent-primary, #6366f1)' : 'var(--subtle-border)'
                      }}
                    />
                    <div style={{ position: 'absolute', right: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {invSearch ? (
                        <button
                          type="button"
                          onClick={() => setInvSearch('')}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '3px',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            display: 'flex',
                            borderRadius: '50%'
                          }}
                        >
                          <X size={13} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsInvOpen(!isInvOpen)}
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: 'none',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.68rem',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px'
                          }}
                        >
                          <span>Browse</span>
                          <ChevronDown size={11} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Attached dropdown menu */}
                  {isInvOpen && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      zIndex: 100,
                      maxHeight: '220px',
                      overflowY: 'auto',
                      background: 'var(--bg-secondary, #121822)',
                      border: '1px solid var(--panel-border-highlight, rgba(99, 102, 241, 0.35))',
                      borderRadius: '8px',
                      boxShadow: '0 12px 30px rgba(0, 0, 0, 0.75)',
                      padding: '4px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}>
                      {/* Compact category filter pills */}
                      <div style={{ display: 'flex', gap: '4px', padding: '4px 6px', borderBottom: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto' }}>
                        {categories.map(cat => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedCategory(cat)}
                            style={{
                              border: 'none',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              background: selectedCategory === cat ? 'var(--accent-primary, #6366f1)' : 'rgba(255,255,255,0.06)',
                              color: selectedCategory === cat ? '#fff' : 'var(--text-secondary)'
                            }}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>

                      {/* Items list */}
                      {filteredInventory.length === 0 ? (
                        <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          No catalog items found.
                        </div>
                      ) : (
                        filteredInventory.map(item => (
                          <div
                            key={item.id}
                            onClick={() => handleAddItemById(item.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              transition: 'background 0.15s',
                              gap: '8px'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.12)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {item.name}
                                </span>
                                {item.type && (
                                  <span style={{
                                    fontSize: '0.64rem',
                                    padding: '1px 4px',
                                    borderRadius: '3px',
                                    background: item.type === 'Hardware' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                                    color: item.type === 'Hardware' ? '#60a5fa' : '#c084fc',
                                    fontWeight: 600
                                  }}>
                                    {item.type}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', marginTop: '1px' }}>
                                <span>LKR {(item.price || 0).toLocaleString()}</span>
                                {item.stock !== undefined && (
                                  <span>Stock: <strong style={{ color: item.stock > 0 ? '#34d399' : '#f87171' }}>{item.stock}</strong></span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ height: '24px', padding: '0 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddItemById(item.id);
                              }}
                            >
                              <Plus size={12} /> Add
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Added Items Compact Table */}
              {formData.items.length > 0 ? (
                <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <th style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Item</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', width: '105px', color: 'var(--text-muted)', fontWeight: 600 }}>Fee Type</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', width: '90px', color: 'var(--text-muted)', fontWeight: 600 }}>Qty</th>
                        <th style={{ padding: '6px 4px', textAlign: 'right', width: '85px', color: 'var(--text-muted)', fontWeight: 600 }}>Price</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right', width: '85px', color: 'var(--text-muted)', fontWeight: 600 }}>Total</th>
                        <th style={{ padding: '6px 6px', width: '32px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((it, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '6px 8px', fontWeight: 600, color: 'var(--text-primary)' }}>
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
                              <div style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={it.name}>
                                {it.name}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                            <select
                              className="form-input"
                              style={{ 
                                height: '26px', 
                                fontSize: '0.72rem', 
                                padding: '1px 4px', 
                                width: '98px', 
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
                          <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQty(idx, -1)}
                                style={{ width: '20px', height: '20px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <Minus size={10} />
                              </button>
                              <span style={{ minWidth: '18px', textAlign: 'center', fontWeight: 700, fontSize: '0.78rem' }}>
                                {it.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQty(idx, 1)}
                                style={{ width: '20px', height: '20px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <Plus size={10} />
                              </button>
                            </div>
                          </td>
                          <td style={{ padding: '6px 4px', textAlign: 'right' }}>
                            <input 
                              type="number" 
                              className="form-input" 
                              style={{ height: '26px', width: '80px', fontSize: '0.75rem', padding: '2px 4px', textAlign: 'right' }} 
                              value={it.price} 
                              onChange={(e) => handleUpdateItemPrice(idx, e.target.value)} 
                            />
                          </td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {(it.price * it.quantity).toLocaleString()}
                          </td>
                          <td style={{ padding: '6px 6px', textAlign: 'right' }}>
                            <button 
                              type="button" 
                              onClick={() => handleRemoveItem(idx)}
                              style={{ background: 'none', border: 'none', color: 'var(--danger, #ef4444)', padding: '2px', cursor: 'pointer', display: 'flex' }}
                              title="Remove item"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '6px' }}>
                  No items in proposal. Click or search above to add items from inventory.
                </div>
              )}
            </div>

            {/* Row 4: Discount & Financial Summary (Compact Bar) */}
            <div style={{ padding: '10px 12px', background: 'rgba(245, 158, 11, 0.04)', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b' }}>
                  <Tag size={13} />
                  <span>Discount Presets:</span>
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {[
                    { label: '5%', calc: (s) => Math.round(s * 0.05) },
                    { label: '10%', calc: (s) => Math.round(s * 0.10) },
                    { label: '15%', calc: (s) => Math.round(s * 0.15) },
                    { label: '5k', calc: () => 5000 },
                    { label: '10k', calc: () => 10000 }
                  ].map((p, idx) => {
                    const sub = calculateSubtotal(formData.items);
                    const val = p.calc(sub);
                    const active = Number(formData.discount) === val && val > 0;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFormData({ ...formData, discount: val, amount: calculateTotal(formData.items, val) })}
                        style={{
                          height: '22px',
                          padding: '0 6px',
                          borderRadius: '4px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          border: 'none',
                          cursor: 'pointer',
                          background: active ? '#f59e0b' : 'rgba(245, 158, 11, 0.12)',
                          color: active ? '#fff' : '#f59e0b'
                        }}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', paddingTop: '6px', borderTop: '1px solid rgba(245, 158, 11, 0.12)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Subtotal: <strong style={{ color: 'var(--text-primary)' }}>LKR {calculateSubtotal(formData.items).toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Discount (LKR):</span>
                  <input 
                    type="number" 
                    className="form-input" 
                    style={{ width: '90px', height: '28px', fontSize: '0.78rem', padding: '2px 6px', textAlign: 'right', fontWeight: 700, color: '#f59e0b' }} 
                    value={formData.discount === 0 ? '' : formData.discount} 
                    onChange={e => setFormData({ ...formData, discount: e.target.value, amount: calculateTotal(formData.items, e.target.value) })}
                    placeholder="0"
                  />
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent-primary, #6366f1)' }}>
                  Net: LKR {calculateTotal(formData.items, formData.discount).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Row 5: Agreement Terms (Compact Textarea) */}
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>
                Terms & Conditions (Optional)
              </label>
              <textarea 
                className="form-input" 
                style={{ minHeight: '48px', height: '52px', fontSize: '0.75rem', padding: '6px 8px', resize: 'vertical' }}
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
              padding: '10px 18px',
              borderTop: '1px solid var(--panel-border)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
              background: 'var(--panel-bg, #0d1218)'
            }}
          >
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ height: '34px', padding: '0 14px', fontSize: '0.8rem' }} 
              onClick={onClose}
            >
              {isLocked ? 'Close' : 'Discard'}
            </button>
            {!isLocked && (
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ height: '34px', padding: '0 16px', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={15} /> Save Quotation
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
