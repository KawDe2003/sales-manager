import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StoreContext } from '../context/StoreContext';
import { Receipt, Plus, Download, Trash2, Smartphone, Edit2, X, PlusCircle, ShoppingBag, FileText, Calendar, Building2, User, Link as LinkIcon, Search, BadgeDollarSign, Eye } from 'lucide-react';
import { generateDocumentPDF } from '../utils/pdfGenerator';
import { exportToCSV } from '../utils/export';

const Invoices = () => {
  const { invoices = [], customers = [], payments = [], addInvoice, updateInvoice, updateInvoiceStatus, inventory = [], triggerSMS, showNotification } = useContext(StoreContext) || {};
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.gymName : 'Unknown Gym';
  };

  const handleExport = () => {
    // We export the *filtered* invoices
    const filteredInvoices = getFilteredInvoices();
    const exportData = filteredInvoices.map(inv => ({
      InvoiceNumber: inv.invoiceNumber,
      Client: getCustomerName(inv.customerId),
      Date: inv.date,
      DueDate: inv.dueDate,
      Amount: inv.amount,
      Status: inv.status
    }));
    exportToCSV('Invoices_Export', exportData);
  };

  const getFilteredInvoices = () => {
    return invoices.filter(inv => {
      const gymName = getCustomerName(inv.customerId).toLowerCase();
      const searchMatch = gymName.includes(searchTerm.toLowerCase()) ||
                          (inv.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const statusMatch = statusFilter === 'All' || inv.status === statusFilter;
      
      let dateMatch = true;
      if (dateFilter === 'Last30') {
        const d = new Date(inv.date);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        dateMatch = d >= thirtyDaysAgo;
      } else if (dateFilter === 'ThisYear') {
        const d = new Date(inv.date);
        dateMatch = d.getFullYear() === new Date().getFullYear();
      }

      return searchMatch && statusMatch && dateMatch;
    });
  };

  return (
    <div style={{ position: 'relative', width: '100%', paddingBottom: '40px' }}>
      <div className="page-hero">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="h1 mb-2">Invoice Ledger</h1>
            <p className="text-secondary" style={{ fontSize: '1rem' }}>Full record of software licenses, service fees, and gym billing status.</p>
          </div>
          <div className="btn-group flex gap-3">
            <button className="btn btn-secondary" onClick={handleExport} title="Export CSV">
              <Download size={18} className="text-success" />
              <span className="sm-hidden">Export CSV</span>
            </button>
            <button className="btn btn-primary" style={{ padding: '12px 24px', height: '44px' }} onClick={() => { setEditingInvoice(null); setShowModal(true); }}>
              <Plus size={18} /> Create Invoice
            </button>
          </div>
        </div>
      {/* TOP INVOICE METRICS BAR */}
      {(() => {
        const totalInvoiced = invoices.reduce((s, i) => s + (Number(i.amount) || 0), 0);
        const totalCollected = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + (Number(i.amount) || 0), 0);
        const totalOutstanding = invoices.filter(i => i.status !== 'Paid').reduce((s, i) => s + (Number(i.amount) || 0), 0);
        const overdueCount = invoices.filter(i => i.status === 'Overdue').length;

        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="glass-panel hover-lift" style={{ padding: '18px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Total Invoiced</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>LKR {totalInvoiced.toLocaleString()}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>{invoices.length} Invoices</div>
            </div>
            <div className="glass-panel hover-lift" style={{ padding: '18px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Total Collected</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-display)' }}>LKR {totalCollected.toLocaleString()}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--success)', marginTop: '2px', fontWeight: 700 }}>Settled Invoices</div>
            </div>
            <div className="glass-panel hover-lift" style={{ padding: '18px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Total Outstanding</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--warning)', fontFamily: 'var(--font-display)' }}>LKR {totalOutstanding.toLocaleString()}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--warning)', marginTop: '2px', fontWeight: 700 }}>Unpaid & Pending</div>
            </div>
            <div className="glass-panel hover-lift" style={{ padding: '18px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Overdue Invoices</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: overdueCount > 0 ? 'var(--danger)' : 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>{overdueCount} Accounts</div>
              <div style={{ fontSize: '0.7rem', color: overdueCount > 0 ? 'var(--danger)' : 'var(--text-muted)', marginTop: '2px', fontWeight: 700 }}>{overdueCount > 0 ? 'Requires follow-up' : 'All clear'}</div>
            </div>
          </div>
        );
      })()}

      {/* Styled Search & Filter Toolbar */}
      <div className="glass-panel flex flex-col md:flex-row gap-4 mb-6" style={{ padding: '16px 24px', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '100%', flex: 1 }}>
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
        <div className="flex gap-4 w-full md:w-auto">
          <select 
            className="form-input"
            style={{ height: '42px', width: '100%', mdWidth: '130px', background: 'var(--subtle-bg)' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Sent">Sent</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Paid">Paid</option>
            <option value="Overdue">Overdue</option>
          </select>
          <select 
            className="form-input"
            style={{ height: '42px', width: '100%', mdWidth: '140px', background: 'var(--subtle-bg)' }}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="All">All Time</option>
            <option value="Last30">Last 30 Days</option>
            <option value="ThisYear">This Year</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {(() => {
          const filteredInvoices = getFilteredInvoices();

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
              payments={payments}
              updateInvoiceStatus={updateInvoiceStatus} 
              onEdit={() => { setEditingInvoice(invoice); setShowModal(true); }}
              onRecordPayment={() => navigate('/payments')}
              onSendSms={() => {
                 const customer = customers.find(c => c.id === invoice.customerId);
                 if (!customer || !customer.phone) {
                   showNotification(`Cannot send SMS! No phone attached to ${getCustomerName(invoice.customerId)}.`, 'error');
                   return;
                 }
                 if(triggerSMS) triggerSMS('InvoiceReminder', customer, invoice);
              }}
              onSendEmail={() => {
                 // Placeholder for email trigger
                 showNotification('Email functionality pending SMTP setup.', 'info');
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

const InvoiceCard = ({ invoice, customers, payments = [], updateInvoiceStatus, onEdit, onRecordPayment, onSendSms, onDownload }) => {
  const shareLink = `${window.location.origin}/share/invoice/${invoice.id || invoice.shareKey}`;
  const previewLink = `${shareLink}?preview=true`;
  const customer = customers.find(c => c.id === invoice.customerId) || {};
  
  const historicalPayments = payments.filter(p => p.documentId === invoice.id).reduce((sum, p) => sum + p.amount, 0);
  const amountDue = invoice.amount - historicalPayments;

  const isPaid = invoice.status === 'Paid' || amountDue <= 0;
  const isOverdue = invoice.status === 'Overdue' || (new Date(invoice.dueDate) < new Date() && !isPaid);

  let borderLeftColor = 'var(--panel-border)';
  if (isPaid) borderLeftColor = 'var(--success)';
  else if (isOverdue) borderLeftColor = 'var(--danger)';
  else if (invoice.status === 'Partially Paid') borderLeftColor = '#0284c7'; // info
  else if (invoice.status === 'Sent') borderLeftColor = 'var(--warning)';

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
            background: isPaid ? 'rgba(34, 197, 94, 0.08)' : 'rgba(129, 140, 248, 0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${isPaid ? 'rgba(34, 197, 94, 0.2)' : 'rgba(129, 140, 248, 0.2)'}`, flexShrink: 0
          }}>
            <Receipt size={22} color={isPaid ? 'var(--success)' : 'var(--accent-primary)'} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: '2px', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {customer.gymName || 'Unknown Entity'}
            </div>
            <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>#{invoice.invoiceNumber}</span>
              <span style={{ opacity: 0.3 }}>•</span>
              <span className="sm-hidden">{customer.name || 'No Contact'}</span>
              <span className="sm-hidden" style={{ opacity: 0.3 }}>•</span>
              <span className="sm-hidden">Due {new Date(invoice.dueDate).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div style={{ flexShrink: 0 }}>
          <select 
            className={`badge badge-${isPaid ? 'success' : isOverdue ? 'danger' : invoice.status === 'Partially Paid' ? 'info' : invoice.status === 'Sent' ? 'warning' : 'secondary'}`}
            style={{ minWidth: '125px', cursor: 'pointer', outline: 'none', padding: '6px 8px', fontSize: '0.7rem', backgroundImage: 'none', textAlign: 'center', appearance: 'none', border: '1px solid currentColor' }}
            value={invoice.status}
            onChange={(e) => updateInvoiceStatus && updateInvoiceStatus(invoice.id, e.target.value)}
          >
            <option value="Draft">Draft</option>
            <option value="Sent">Sent</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Paid">Paid</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Detail & Action Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-panel">
        <div>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Outstanding Balance</div>
          <div style={{ fontWeight: 850, color: 'var(--text-primary)', fontSize: '1.15rem', fontFamily: 'var(--font-display)' }}>
            <span style={{ color: 'var(--accent-primary)', fontSize: '0.8rem', marginRight: '4px' }}>LKR</span>
            {Math.max(0, amountDue).toLocaleString() || 0}
          </div>
          {historicalPayments > 0 && amountDue > 0 && (
             <div style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 600, marginTop: '2px' }}>
                Paid so far: LKR {historicalPayments.toLocaleString()}
             </div>
          )}
        </div>

        <div className="action-bar md:justify-end w-full">
          <a 
            href={previewLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn btn-secondary" 
            style={{ width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
            title="View Shared Document"
          >
            <Eye size={16} className="text-accent" />
          </a>
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
          <button className="btn btn-secondary" style={{ width: '40px', height: '40px', padding: 0 }} onClick={onSendSms} title="Notify Client">
            <Smartphone size={16} className="text-secondary" />
          </button>
          <button className="btn btn-secondary" style={{ width: '40px', height: '40px', padding: 0 }} onClick={onEdit} title="Modify Record">
            <Edit2 size={16} />
          </button>
          <button className="btn btn-secondary" style={{ width: '40px', height: '40px', padding: 0 }} onClick={onDownload} title="Export PDF">
            <Download size={16} />
          </button>
          
          {!isPaid && (
             <button 
               className="btn btn-primary" 
               style={{ height: '40px', padding: '0 12px', background: 'var(--accent-primary)', border: 'none', flex: '1 0 auto' }} 
               onClick={onRecordPayment}
             >
               <BadgeDollarSign size={16} /> <span style={{ fontSize: '0.8rem' }}>Record Payment</span>
             </button>
          )}
        </div>
      </div>
    </div>
  );
};

const InvoiceModal = ({ onClose, onSave, customers, inventory, initialData }) => {
  const { smsConfig = {} } = useContext(StoreContext) || {};
  const initialDiscountItem = initialData?.items?.find(i => i.isDiscount);
  const initialDiscount = initialDiscountItem ? Math.abs(initialDiscountItem.price) : 0;
  const initialItems = initialData?.items?.filter(i => !i.isDiscount) || [];

  const [formData, setFormData] = useState({
    invoiceNumber: initialData?.invoiceNumber || `${smsConfig.invoicePrefix || 'INV-'}${smsConfig.nextInvoiceNumber || 1001}`, 
    date: initialData?.date || new Date().toISOString().split('T')[0], 
    dueDate: initialData?.dueDate || '',
    customerId: initialData?.customerId || (customers[0]?.id || ''),
    items: initialItems,
    discount: initialDiscount,
    amount: initialData?.amount || 0,
    agreementTerms: initialData?.agreementTerms || ''
  });

  const [selectedInventoryId, setSelectedInventoryId] = useState('');

  const calculateSubtotal = (items) => items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const calculateTotal = (items, discount = 0) => calculateSubtotal(items) - Number(discount || 0);

  const handleAddItem = () => {
    if (!selectedInventoryId) return;
    const invItem = inventory.find(i => i.id === selectedInventoryId);
    if (!invItem) return;

    let newItems = [...formData.items];
    const existingIndex = newItems.findIndex(i => i.id === invItem.id);
    
    if (existingIndex >= 0) newItems[existingIndex].quantity += 1;
    else newItems.push({ ...invItem, quantity: 1 });
    
    setFormData({ ...formData, items: newItems, amount: calculateTotal(newItems, formData.discount) });
    setSelectedInventoryId('');
  };

  const handleRemoveItem = (idx) => {
    const newItems = formData.items.filter((_, i) => i !== idx);
    setFormData({ ...formData, items: newItems, amount: calculateTotal(newItems, formData.discount) });
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      padding: '24px'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '720px', padding: 0, maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
        <div className="modal-header">
           <div className="flex justify-between items-center">
             <h2 className="h2" style={{ margin: 0, fontSize: '1.5rem' }}>{initialData ? 'Update Invoice' : 'Draft New Invoice'}</h2>
             <button className="btn btn-secondary" style={{ padding: '8px', background: 'rgba(255,255,255,0.05)' }} onClick={onClose}><X size={20} /></button>
           </div>
        </div>

        <form onSubmit={(e) => { 
          e.preventDefault(); 
          const finalItems = [...formData.items];
          if (Number(formData.discount) > 0) {
            finalItems.push({ name: 'Discount', price: -Number(formData.discount), quantity: 1, isDiscount: true });
          }
          onSave({ ...formData, items: finalItems }); 
          onClose(); 
        }} className="modal-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                {inventory.map(inv => <option key={inv.id} value={inv.id}>{inv.name} • Selling Price: LKR {(inv.price || 0).toLocaleString()}</option>)}
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

          <div className="flex justify-end items-center gap-4" style={{ marginTop: '24px', padding: '0 24px' }}>
            <label className="form-label mb-0" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Discount Amount (LKR):</label>
            <input 
              type="number" 
              className="form-input" 
              style={{ width: '150px', height: '44px', textAlign: 'right' }} 
              value={formData.discount === 0 ? '' : formData.discount} 
              onChange={e => setFormData({ ...formData, discount: e.target.value, amount: calculateTotal(formData.items, e.target.value) })}
              placeholder="0"
            />
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4" style={{ marginTop: '24px', padding: '24px', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '16px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
            <div className="flex items-center gap-3">
              <ShoppingBag size={24} className="text-secondary" />
              <span className="text-secondary" style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.05em' }}>NET TOTAL AMOUNT</span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-display)', textShadow: '0 2px 10px rgba(34, 197, 94, 0.2)' }}>
              LKR {calculateTotal(formData.items, formData.discount).toLocaleString()}
            </div>
          </div>

          <div style={{ marginTop: '24px' }}>
            <label className="form-label" style={{ fontSize: '0.85rem' }}>Service Agreement & Terms (Optional)</label>
            <textarea 
              className="form-input" 
              style={{ minHeight: '120px', resize: 'vertical', width: '100%', padding: '12px' }}
              placeholder="Enter payment terms, SLA, or conditions the client must agree to..."
              value={formData.agreementTerms}
              onChange={e => setFormData({ ...formData, agreementTerms: e.target.value })}
            ></textarea>
            <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '6px' }}>This agreement will be shown on the client portal and printed on the PDF.</p>
          </div>

          <div style={{ height: '1px', background: 'var(--panel-border)', margin: '40px 0 32px 0' }}></div>

          <div className="flex justify-end gap-4 responsive-form-actions">
            <button type="button" className="btn btn-secondary" style={{ padding: '12px 24px', fontSize: '0.95rem' }} onClick={onClose}>Discard</button>
            <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '0.95rem' }}>Finalize Ledger</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Invoices;
