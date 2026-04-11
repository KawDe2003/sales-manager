import React, { useContext, useState } from 'react';
import { StoreContext } from '../context/StoreContext';
import { Receipt, Plus, Download, Trash2, Smartphone, Edit2, X, PlusCircle, ShoppingBag, FileText, Calendar, Building2, User, Link as LinkIcon, Search } from 'lucide-react';
import { generateDocumentPDF } from '../utils/pdfGenerator';

const Invoices = () => {
  const { invoices = [], customers = [], addInvoice, updateInvoice, updateInvoiceStatus, inventory = [], triggerSMS, showNotification } = useContext(StoreContext) || {};
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.gymName : 'Unknown Gym';
  };

  return (
    <div style={{ animation: 'fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="h1 mb-2">Invoice Ledger</h1>
          <p className="text-secondary" style={{ fontSize: '1rem' }}>Full record of software licenses, service fees, and gym billing status.</p>
        </div>
        <button className="btn btn-primary" style={{ padding: '12px 24px' }} onClick={() => { setEditingInvoice(null); setShowModal(true); }}>
          <Plus size={18} /> Create Invoice
        </button>
      </div>

      {/* Styled Search Toolbar */}
      <div className="glass-panel" style={{ padding: '16px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '480px' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '12px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search invoices by gym name or invoice #..."
            style={{ paddingLeft: '48px', height: '42px', background: 'var(--subtle-bg)' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {(() => {
          const filteredInvoices = invoices.filter(inv => {
            const gymName = getCustomerName(inv.customerId).toLowerCase();
            return gymName.includes(searchTerm.toLowerCase()) ||
                   (inv.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
          });

          if (filteredInvoices.length === 0) {
            return (
              <div className="glass-panel flex flex-col items-center justify-center" style={{ padding: '80px 0', textAlign: 'center' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--subtle-bg)', display: 'flex', alignItems: 'center', marginBottom: '24px', justifyContent: 'center' }}>
                  <Search size={32} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                </div>
                <h3 className="h2" style={{ fontSize: '1.2rem', marginBottom: '8px' }}>No Results Found</h3>
                <p className="text-secondary" style={{ fontSize: '0.95rem' }}>We couldn't find any invoices matching your search query.</p>
              </div>
            );
          }

          return filteredInvoices.map(invoice => (
            <InvoiceCard 
              key={invoice.id} 
              invoice={invoice} 
              customers={customers}
              updateInvoiceStatus={updateInvoiceStatus} 
              onEdit={() => { setEditingInvoice(invoice); setShowModal(true); }}
              onSendSms={() => {
                 const customer = customers.find(c => c.id === invoice.customerId);
                 if (!customer || !customer.phone) {
                   showNotification(`Cannot send SMS! No phone attached to ${getCustomerName(invoice.customerId)}.`, 'error');
                   return;
                 }
                 if(triggerSMS) triggerSMS('InvoiceReminder', customer, invoice);
              }}
              onDownload={() => {
                const docData = { ...invoice, gymName: getCustomerName(invoice.customerId) };
                generateDocumentPDF('Invoice', docData, invoice.items || []);
              }}
            />
          ));
        })()}
      </div>

      {showModal && (
        <InvoiceModal 
          onClose={() => { setShowModal(false); setEditingInvoice(null); }} 
          onSave={(data) => {
            if (editingInvoice) updateInvoice(editingInvoice.id, data);
            else addInvoice(data);
          }} 
          customers={customers} 
          inventory={inventory}
          initialData={editingInvoice}
        />
      )}
    </div>
  );
};

const InvoiceCard = ({ invoice, customers, updateInvoiceStatus, onEdit, onSendSms, onDownload }) => {
  const customer = customers.find(c => c.id === invoice.customerId) || {};
  const isPaid = invoice.status === 'Paid';
  const isOverdue = invoice.status === 'Overdue' || (new Date(invoice.dueDate) < new Date() && !isPaid);

  let borderLeftColor = 'var(--panel-border)';
  if (isPaid) borderLeftColor = 'var(--success)';
  else if (isOverdue) borderLeftColor = 'var(--danger)';
  else if (invoice.status === 'Sent') borderLeftColor = 'var(--warning)';

  return (
    <div className="glass-panel hover-lift" style={{ 
      padding: '16px 24px', 
      display: 'flex', 
      alignItems: 'center', 
      gap: '16px',
      borderLeft: `4px solid ${borderLeftColor}`
    }}>
      {/* Icon */}
      <div style={{
        width: '44px', height: '44px', borderRadius: '12px',
        background: isPaid ? 'rgba(34, 197, 94, 0.1)' : 'var(--subtle-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${isPaid ? 'rgba(34, 197, 94, 0.2)' : 'var(--subtle-border)'}`, flexShrink: 0
      }}>
        <FileText size={20} color={isPaid ? 'var(--success)' : 'var(--text-muted)'} />
      </div>

      {/* Invoice Details */}
      <div style={{ flex: '1 1 180px' }}>
        <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1rem', marginBottom: '4px', letterSpacing: '-0.01em' }}>
          {customer.gymName || 'Unknown Gym'}
        </div>
        <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>#{invoice.invoiceNumber}</span>
          <span style={{ opacity: 0.3 }}>•</span>
          <User size={13} style={{ opacity: 0.7 }} /> 
          <span>{customer.name || 'No Contact'}</span>
        </div>
      </div>

      {/* Dates (Hidden on small screens) */}
      <div className="sm-hidden" style={{ flex: '0 1 160px' }}>
         <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
            <span style={{ display: 'inline-block', width: '36px', opacity: 0.6 }}>Issued</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{new Date(invoice.date).toLocaleDateString()}</span>
         </div>
         <div style={{ fontSize: '0.8rem', color: isOverdue ? 'var(--danger)' : 'var(--warning)', fontWeight: isOverdue ? 700 : 500 }}>
            <span style={{ display: 'inline-block', width: '36px', opacity: isOverdue ? 1 : 0.6 }}>Due</span>
            <span>{new Date(invoice.dueDate).toLocaleDateString()}</span>
         </div>
      </div>

      {/* Amount Section */}
      <div style={{ flex: '0 1 130px', textAlign: 'right' }}>
        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Amount Due</div>
        <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1rem', fontFamily: 'var(--font-display)' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '4px' }}>LKR</span>
          {invoice.amount?.toLocaleString() || 0}
        </div>
      </div>

      {/* Status Select */}
      <div style={{ flex: '0 0 110px', paddingLeft: '8px' }}>
        <select 
          className={`badge badge-${isPaid ? 'success' : isOverdue ? 'danger' : invoice.status === 'Sent' ? 'warning' : 'secondary'}`}
          style={{ width: '100%', cursor: 'pointer', outline: 'none', padding: '4px 8px', fontSize: '0.75rem', backgroundImage: 'none', textAlign: 'center', appearance: 'menulist' }}
          value={invoice.status}
          onChange={(e) => updateInvoiceStatus && updateInvoiceStatus(invoice.id, e.target.value)}
        >
          <option value="Draft">Draft</option>
          <option value="Sent">Sent</option>
          <option value="Paid">Paid</option>
          <option value="Overdue">Overdue</option>
        </select>
      </div>

      {/* Action Buttons */}
      <div style={{ flex: '0 0 auto', display: 'flex', gap: '6px', marginLeft: '12px' }}>
        <button 
          className="btn btn-secondary" 
          style={{ padding: '8px', background: 'var(--subtle-bg)' }} 
          onClick={() => {
            const link = `${window.location.origin}/share/invoice/${invoice.id}`;
            navigator.clipboard.writeText(link);
            showNotification && showNotification('Public share link copied to clipboard!', 'success');
          }}
          title="Copy Share Link"
        >
          <LinkIcon size={14} className="text-secondary" />
        </button>
        <button 
          className="btn btn-secondary" 
          style={{ padding: '8px', background: 'var(--subtle-bg)' }} 
          onClick={onSendSms}
          title="Send SMS Link"
        >
          <Smartphone size={14} className="text-accent-primary" />
        </button>
        <button 
          className="btn btn-secondary" 
          style={{ padding: '8px', background: 'var(--subtle-bg)' }} 
          onClick={onEdit}
          title="Edit Details"
        >
          <Edit2 size={14} />
        </button>
        <button 
          className="btn btn-secondary" 
          style={{ padding: '8px', background: 'var(--subtle-bg)' }} 
          onClick={onDownload}
          title="Download PDF"
        >
          <Download size={14} />
        </button>
      </div>
    </div>
  );
};

const InvoiceModal = ({ onClose, onSave, customers, inventory, initialData }) => {
  const [formData, setFormData] = useState(initialData || {
    invoiceNumber: initialData?.invoiceNumber || `INV-${Math.floor(Math.random() * 10000)}`, 
    date: initialData?.date || new Date().toISOString().split('T')[0], 
    dueDate: initialData?.dueDate || '',
    customerId: initialData?.customerId || (customers[0]?.id || ''),
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

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      padding: '24px'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '720px', padding: 0, maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ padding: '32px 40px', borderBottom: '1px solid var(--panel-border)', background: 'linear-gradient(135deg, rgba(255,255,255,0.05), transparent)'}}>
           <div className="flex justify-between items-center">
             <h2 className="h2" style={{ margin: 0, fontSize: '1.5rem' }}>{initialData ? 'Update Invoice' : 'Draft New Invoice'}</h2>
             <button className="btn btn-secondary" style={{ padding: '8px', background: 'rgba(255,255,255,0.05)' }} onClick={onClose}><X size={20} /></button>
           </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSave(formData); onClose(); }} style={{ padding: '40px' }}>
          <div className="grid grid-cols-2 gap-8">
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Invoice Serial #</label>
              <input required type="text" className="form-input" style={{ height: '44px' }} value={formData.invoiceNumber} onChange={e => setFormData({...formData, invoiceNumber: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Client / Local Gym</label>
              <select className="form-input" style={{ height: '44px' }} value={formData.customerId} onChange={e => setFormData({...formData, customerId: e.target.value})} required>
                <option value="">Select a Client</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.gymName}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Invoice Issue Date</label>
              <input required type="date" className="form-input" style={{ height: '44px' }} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Payment Due Date</label>
              <input required type="date" className="form-input" style={{ height: '44px' }} value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
            </div>
          </div>

          <div style={{ marginTop: '32px', padding: '24px', background: 'var(--subtle-bg)', borderRadius: '16px', border: '1px solid var(--panel-border)' }}>
            <label className="form-label" style={{ fontSize: '0.85rem' }}>Dynamic Line Items</label>
            <div className="flex gap-4 mb-4">
              <select className="form-input flex-1" style={{ height: '44px' }} value={selectedInventoryId} onChange={e => setSelectedInventoryId(e.target.value)}>
                <option value="">+ Browse inventory or software subscription...</option>
                {inventory.map(inv => <option key={inv.id} value={inv.id}>{inv.name} • LKR {inv.price.toLocaleString()}</option>)}
              </select>
              <button type="button" className="btn btn-primary" style={{ height: '44px', width: '44px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={handleAddItem}><PlusCircle size={20} /></button>
            </div>

            {formData.items.length > 0 && (
              <div className="table-container" style={{ marginTop: '16px', background: 'transparent' }}>
                <table style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <th style={{ padding: '8px 0', opacity: 0.7 }}>Product</th>
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
                        <td style={{ color: 'var(--text-muted)' }}>{it.price.toLocaleString()}</td>
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

          <div className="flex justify-between items-center" style={{ marginTop: '40px', padding: '24px', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '16px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
            <div className="flex items-center gap-3">
              <ShoppingBag size={24} className="text-secondary" />
              <span className="text-secondary" style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.05em' }}>NET TOTAL AMOUNT</span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-display)', textShadow: '0 2px 10px rgba(34, 197, 94, 0.2)' }}>
              LKR {calculateTotal(formData.items).toLocaleString()}
            </div>
          </div>

          <div style={{ height: '1px', background: 'var(--panel-border)', margin: '40px 0 32px 0' }}></div>

          <div className="flex justify-end gap-4">
            <button type="button" className="btn btn-secondary" style={{ padding: '12px 24px', fontSize: '0.95rem' }} onClick={onClose}>Discard</button>
            <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '0.95rem' }}>Finalize Ledger</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Invoices;
