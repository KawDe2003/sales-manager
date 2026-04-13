import React, { useContext, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StoreContext } from '../context/StoreContext';
import { FileText, Plus, Download, Trash2, Smartphone, Edit2, X, PlusCircle, ShoppingBag, User, Link as LinkIcon, Search, Receipt } from 'lucide-react';
import { generateDocumentPDF } from '../utils/pdfGenerator';

const Quotations = () => {
  const { quotes = [], addQuote, updateQuote, updateQuoteStatus, convertQuoteToInvoice, inventory = [], triggerSMS, smsConfig, customers = [], leads = [], showNotification } = useContext(StoreContext) || {};
  const [showModal, setShowModal] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
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
    <div style={{ animation: 'fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      <div className="responsive-header mb-8">
        <div>
          <h1 className="h1 mb-2">Proposals & Quotes</h1>
          <p className="text-secondary" style={{ fontSize: '1rem' }}>Generate and track professional software offers for new prospects.</p>
        </div>
        <button className="btn btn-primary" style={{ padding: '12px 24px' }} onClick={() => { setEditingQuote(null); setShowModal(true); }}>
          <Plus size={18} /> New Quotation
        </button>
      </div>

      {/* Styled Search Toolbar */}
      <div className="glass-panel" style={{ padding: '16px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '480px' }}>
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
      </div>

      <div className="flex flex-col gap-4">
        {(() => {
          const filteredQuotes = quotes.filter(q => 
            (q.prospectName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (q.quoteNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (q.prospectPhone || '').toLowerCase().includes(searchTerm.toLowerCase())
          );

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
              onEdit={() => { setEditingQuote(quote); setShowModal(true); }}
              onSendSms={() => {
                if (!quote.prospectPhone) {
                  showNotification && showNotification(`No phone saved.`, 'error');
                  return;
                }
                triggerSMS && triggerSMS('Quotation', null, quote);
              }}
              onDownload={() => generateDocumentPDF('Quotation', quote, quote.items || [])}
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
  const isAccepted = quote.status === 'Accepted';
  const isRejected = quote.status === 'Rejected';
  
  let borderLeftColor = 'var(--panel-border)';
  if (isAccepted) borderLeftColor = 'var(--success)';
  else if (isRejected) borderLeftColor = 'var(--danger)';
  else borderLeftColor = 'var(--warning)'; // Pending

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
          </div>
        </div>

        <div style={{ flexShrink: 0 }}>
          <select 
            className={`badge badge-${isAccepted ? 'success' : isRejected ? 'danger' : 'warning'}`}
            style={{ 
              width: '100px', cursor: 'pointer', outline: 'none', padding: '6px 8px', 
              fontSize: '0.7rem', backgroundImage: 'none', textAlign: 'center', 
              appearance: 'none', border: '1px solid currentColor' 
            }}
            value={quote.status || 'Pending'}
            onChange={(e) => updateQuoteStatus && updateQuoteStatus(quote.id, e.target.value)}
          >
            <option value="Pending">Pending</option>
            <option value="Accepted">Accepted</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

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
          <button 
            className="btn btn-secondary" 
            style={{ width: '40px', height: '40px', padding: 0 }} 
            onClick={() => {
              const link = `${window.location.origin}/share/quote/${quote.id}`;
              navigator.clipboard.writeText(link);
              showNotification && showNotification('Link copied!', 'success');
            }}
            title="Share Link"
          >
            <LinkIcon size={16} />
          </button>
          <button className="btn btn-secondary" style={{ width: '40px', height: '40px', padding: 0 }} onClick={onSendSms} title="Send SMS">
            <Smartphone size={16} className="text-secondary" />
          </button>
          <button className="btn btn-secondary" style={{ width: '40px', height: '40px', padding: 0 }} onClick={onEdit} title="Edit Configuration">
            <Edit2 size={16} />
          </button>
          <button className="btn btn-secondary" style={{ width: '40px', height: '40px', padding: 0 }} onClick={onDownload} title="Export PDF">
            <Download size={16} />
          </button>
          
          {isAccepted && (
             <button 
               className="btn btn-primary" 
               style={{ height: '40px', padding: '0 12px', background: 'var(--success)', border: 'none', flex: '1 0 auto' }} 
               onClick={() => convertQuoteToInvoice && convertQuoteToInvoice(quote.id)}
             >
               <Receipt size={16} /> <span style={{ fontSize: '0.8rem' }}>Issue Invoice</span>
             </button>
          )}
        </div>
      </div>
    </div>
  );
};

const QuoteModal = ({ onClose, onSave, inventory, initialData, customers = [] }) => {
  const [formData, setFormData] = useState(initialData || {
    quoteNumber: initialData?.quoteNumber || `QT-${Math.floor(Math.random() * 10000)}`, 
    date: initialData?.date || new Date().toISOString().split('T')[0], 
    prospectName: initialData?.prospectName || '', 
    prospectPhone: initialData?.prospectPhone || '',
    status: initialData?.status || 'Pending',
    items: initialData?.items || [],
    amount: initialData?.amount || 0
  });

  const [selectedInventoryId, setSelectedInventoryId] = useState('');

  const calculateTotal = (items) => items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleAddItem = () => {
    if (!selectedInventoryId) return;
    const invItem = inventory.find(i => i.id === selectedInventoryId);
    if (!invItem) return;

    let newItems = [...formData.items];
    const existingIndex = newItems.findIndex(i => i.id === invItem.id);
    
    if (existingIndex >= 0) newItems[existingIndex].quantity += 1;
    else newItems.push({ ...invItem, quantity: 1 });
    
    setFormData({ ...formData, items: newItems, amount: calculateTotal(newItems) });
    setSelectedInventoryId('');
  };

  const handleRemoveItem = (idx) => {
    const newItems = formData.items.filter((_, i) => i !== idx);
    setFormData({ ...formData, items: newItems, amount: calculateTotal(newItems) });
  };

  const handleUpdateItemPrice = (idx, newPrice) => {
    const newItems = [...formData.items];
    newItems[idx].price = Number(newPrice);
    setFormData({ ...formData, items: newItems, amount: calculateTotal(newItems) });
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      padding: '24px'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '680px', padding: 0, maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
        <div className="modal-header">
           <div className="flex justify-between items-center">
             <h2 className="h2" style={{ margin: 0, fontSize: '1.5rem' }}>{initialData ? 'Update Quotation' : 'Craft New Proposal'}</h2>
             <button className="btn btn-secondary" style={{ padding: '8px', background: 'rgba(255,255,255,0.05)' }} onClick={onClose}><X size={20} /></button>
           </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSave(formData); onClose(); }} className="modal-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Quotation ID #</label>
              <input required type="text" className="form-input" style={{ height: '44px' }} value={formData.quoteNumber} onChange={e => setFormData({...formData, quoteNumber: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Offer Date</label>
              <input required type="date" className="form-input" style={{ height: '44px' }} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
          </div>

          <div style={{ margin: '32px 0 0 0', padding: '24px', background: 'var(--subtle-bg)', borderRadius: '16px', border: '1px solid var(--panel-border)' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.85rem' }}>Prospect / Gym Name</label>
                <div style={{ position: 'relative' }}>
                  <input required type="text" className="form-input" style={{ height: '44px' }} value={formData.prospectName} onChange={e => setFormData({...formData, prospectName: e.target.value})} />
                  {customers.length > 0 && !initialData && (
                    <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Quick link: <select 
                        style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                        onChange={e => {
                          const sel = customers.find(c => c.id === e.target.value);
                          if (sel) setFormData(prev => ({ ...prev, prospectName: sel.gymName, prospectPhone: sel.phone || '' }));
                        }}
                      >
                        <option value="">Select Existing Client...</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.gymName}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.85rem' }}>Prospect Mobile</label>
                <input type="tel" className="form-input" style={{ height: '44px' }} placeholder="07XXXXXXXX" value={formData.prospectPhone} onChange={e => setFormData({...formData, prospectPhone: e.target.value})} />
              </div>
            </div>
          </div>

          <div style={{ marginTop: '32px', padding: '24px', background: 'var(--subtle-bg)', borderRadius: '16px', border: '1px solid var(--panel-border)' }}>
            <label className="form-label" style={{ fontSize: '0.85rem' }}>Proposal Line Items</label>
            <div className="flex gap-4">
              <select className="form-input flex-1" style={{ height: '44px' }} value={selectedInventoryId} onChange={e => setSelectedInventoryId(e.target.value)}>
                <option value="">+ Browse inventory...</option>
                {inventory.map(inv => <option key={inv.id} value={inv.id}>{inv.name} • LKR {inv.price.toLocaleString()}</option>)}
              </select>
              <button type="button" className="btn btn-primary" style={{ height: '44px', width: '44px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={handleAddItem}><PlusCircle size={20} /></button>
            </div>

            {formData.items.length > 0 && (
              <div className="table-container" style={{ marginTop: '16px', background: 'transparent' }}>
                <table style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <th style={{ padding: '8px 0', opacity: 0.7 }}>Product / Service</th>
                      <th style={{ padding: '8px 0', opacity: 0.7 }}>Qty</th>
                      <th style={{ padding: '8px 0', opacity: 0.7 }}>LKR Unit</th>
                      <th style={{ padding: '8px 0', textAlign: 'right', opacity: 0.7 }}>Total</th>
                      <th style={{ padding: '8px 0', textAlign: 'right', opacity: 0.7 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--subtle-border)' }}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)', padding: '12px 0' }}>{it.name}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{it.quantity}</td>
                        <td style={{ color: 'var(--text-muted)' }}>
                          <input 
                            type="number" 
                            className="form-input" 
                            style={{ height: '32px', width: '100px', fontSize: '0.8rem', padding: '4px 8px' }} 
                            value={it.price} 
                            onChange={(e) => handleUpdateItemPrice(idx, e.target.value)} 
                          />
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>{(it.price * it.quantity).toLocaleString()}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button type="button" className="btn btn-danger" style={{ padding: '6px', borderRadius: '8px', background: 'var(--danger-20)', border: 'none' }} onClick={() => handleRemoveItem(idx)}>
                            <Trash2 size={14} color="var(--danger)" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center" style={{ marginTop: '40px', padding: '24px', background: 'rgba(129, 140, 248, 0.05)', borderRadius: '16px', border: '1px solid rgba(129, 140, 248, 0.2)' }}>
            <div className="flex items-center gap-3">
              <ShoppingBag size={24} className="text-secondary" />
              <span className="text-secondary" style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.05em' }}>NET QUOTE ESTIMATE</span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-primary)', fontFamily: 'var(--font-display)', textShadow: '0 2px 10px rgba(129, 140, 248, 0.2)' }}>
              LKR {calculateTotal(formData.items).toLocaleString()}
            </div>
          </div>

          <div style={{ height: '1px', background: 'var(--panel-border)', margin: '40px 0 32px 0' }}></div>

          <div className="flex justify-end gap-4 responsive-form-actions">
            <button type="button" className="btn btn-secondary" style={{ padding: '12px 24px', fontSize: '0.95rem' }} onClick={onClose}>Discard</button>
            <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '0.95rem' }}>Finalize Quotation</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Quotations;
