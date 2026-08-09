import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StoreContext } from '../context/StoreContext';
import { Receipt, Plus, Download, Trash2, Smartphone, Edit2, X, PlusCircle, ShoppingBag, FileText, Calendar, Building2, User, Link as LinkIcon, Search, BadgeDollarSign, Eye, CalendarDays, CheckCircle, Clock, Tag } from 'lucide-react';
import { generateDocumentPDF } from '../utils/pdfGenerator';
import { exportToCSV } from '../utils/export';

const Invoices = () => {
  const { invoices = [], customers = [], payments = [], addInvoice, updateInvoice, updateInvoiceStatus, inventory = [], triggerSMS, showNotification } = useContext(StoreContext) || {};
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [viewingInstallmentInvoice, setViewingInstallmentInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.gymName : 'Unknown Gym';
  };

  const handleExport = () => {
    const filteredInvoices = getFilteredInvoices();
    const exportData = filteredInvoices.map(inv => ({
      InvoiceNumber: inv.invoiceNumber,
      Client: getCustomerName(inv.customerId),
      Date: inv.date,
      DueDate: inv.dueDate,
      Amount: inv.amount,
      Status: inv.status,
      InstallmentPlan: inv.installmentPlan?.enabled ? `${inv.installmentPlan.count} Installments` : 'None'
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

  // Compute stats
  const totalInvoiced = invoices.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const totalCollected = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const totalOutstanding = invoices.filter(i => i.status !== 'Paid').reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const installmentInvoices = invoices.filter(i => i.installmentPlan?.enabled).length;
  const overdueCount = invoices.filter(i => i.status === 'Overdue').length;

  return (
    <div style={{ position: 'relative', width: '100%', paddingBottom: '40px' }}>

      {/* ===== HERO HEADER ===== */}
      <div className="page-hero" style={{ position: 'relative', zIndex: 50 }}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="h1 mb-1" style={{ color: 'var(--text-primary)', fontWeight: 800 }}>
              Invoice Ledger
            </h1>
            <p className="text-secondary" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: overdueCount > 0 ? 'var(--danger)' : 'var(--success)', boxShadow: `0 0 10px ${overdueCount > 0 ? 'var(--danger)' : 'var(--success)'}`, flexShrink: 0 }}></span>
              Billing &amp; Collections · Software Licenses · Gym Invoices
              {overdueCount > 0 && (
                <span style={{ marginLeft: '4px', background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '8px', padding: '1px 8px', fontSize: '0.7rem', fontWeight: 800 }}>
                  ⚠ {overdueCount} Overdue
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-3" style={{ flexShrink: 0 }}>
            <button className="btn btn-secondary" onClick={handleExport} style={{ padding: '10px 18px', fontSize: '0.85rem' }}>
              <Download size={16} />
              <span className="sm-hidden">Export CSV</span>
            </button>
            <button className="btn btn-primary" onClick={() => { setEditingInvoice(null); setShowModal(true); }} style={{ padding: '10px 18px', fontSize: '0.85rem' }}>
              <Plus size={16} /> Create Invoice
            </button>
          </div>
        </div>
      </div>

      {/* ===== KPI STAT CARDS ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="glass-panel hover-lift" style={{ padding: '20px', overflow: 'hidden', borderBottom: '3px solid var(--accent-secondary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>TOTAL INVOICED</div>
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-secondary)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <Receipt size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-secondary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', lineHeight: 1 }}>LKR {totalInvoiced.toLocaleString()}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px', fontWeight: 600 }}>{invoices.length} Total Invoices</div>
        </div>

        <div className="glass-panel hover-lift" style={{ padding: '20px', overflow: 'hidden', borderBottom: '3px solid var(--success)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>COLLECTED</div>
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <CheckCircle size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--success)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', lineHeight: 1 }}>LKR {totalCollected.toLocaleString()}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px', fontWeight: 600 }}>Settled / Paid</div>
        </div>

        <div className="glass-panel hover-lift" style={{ padding: '20px', overflow: 'hidden', borderBottom: '3px solid var(--warning)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>OUTSTANDING</div>
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--warning)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', lineHeight: 1 }}>LKR {totalOutstanding.toLocaleString()}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px', fontWeight: 600 }}>Unpaid &amp; Pending</div>
        </div>

        <div className="glass-panel hover-lift" style={{ padding: '20px', overflow: 'hidden', borderBottom: '3px solid var(--accent-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>INSTALLMENT PLANS</div>
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <CalendarDays size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', lineHeight: 1 }}>{installmentInvoices}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px', fontWeight: 600 }}>Structured Payments</div>
        </div>
      </div>


      {/* ===== SEARCH & FILTER TOOLBAR ===== */}
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
            style={{ height: '42px', flex: '1 1 130px', minWidth: '120px', background: 'var(--subtle-bg)' }}
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
            style={{ height: '42px', flex: '1 1 140px', minWidth: '120px', background: 'var(--subtle-bg)' }}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="All">All Time</option>
            <option value="Last30">Last 30 Days</option>
            <option value="ThisYear">This Year</option>
          </select>
        </div>
      </div>

      {/* ===== INVOICE LIST ===== */}
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
              onViewInstallments={() => setViewingInstallmentInvoice(invoice)}
              onSendSms={() => {
                const customer = customers.find(c => c.id === invoice.customerId);
                if (!customer || !customer.phone) {
                  showNotification(`Cannot send SMS! No phone attached to ${getCustomerName(invoice.customerId)}.`, 'error');
                  return;
                }
                if (triggerSMS) triggerSMS('InvoiceReminder', customer, invoice);
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

      {viewingInstallmentInvoice && (
        <InstallmentPlanDetailsModal
          invoice={viewingInstallmentInvoice}
          onClose={() => setViewingInstallmentInvoice(null)}
          payments={payments}
          getCustomerName={getCustomerName}
        />
      )}
    </div>
  );
};

const InvoiceCard = ({ invoice, customers, payments = [], updateInvoiceStatus, onEdit, onRecordPayment, onViewInstallments, onSendSms, onDownload }) => {
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
  else if (invoice.status === 'Partially Paid') borderLeftColor = '#0284c7';
  else if (invoice.status === 'Sent') borderLeftColor = 'var(--warning)';

  const plan = invoice.installmentPlan;

  return (
    <div className="glass-panel hover-lift" style={{
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      borderLeft: `4px solid ${borderLeftColor}`
    }}>
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
            <div className="flex items-center gap-2 flex-wrap" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>#{invoice.invoiceNumber}</span>
              <span style={{ opacity: 0.3 }}>•</span>
              <span className="sm-hidden">{customer.name || 'No Contact'}</span>
              <span className="sm-hidden" style={{ opacity: 0.3 }}>•</span>
              <span>Due {new Date(invoice.dueDate).toLocaleDateString()}</span>
              {plan?.enabled && (
                <>
                  <span style={{ opacity: 0.3 }}>•</span>
                  <button
                    onClick={onViewInstallments}
                    style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <CalendarDays size={13} /> {plan.count} Installments Plan
                  </button>
                </>
              )}
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

        <div className="action-bar md:justify-end w-full flex gap-2">
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
            onClick={() => { navigator.clipboard.writeText(shareLink); }}
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

const InstallmentPlanDetailsModal = ({ invoice, onClose, payments = [], getCustomerName }) => {
  const plan = invoice?.installmentPlan;
  if (!plan) return null;

  const totalInvoiceAmount = invoice.amount || 0;
  const totalPaidSoFar = payments.filter(p => p.documentId === invoice.id).reduce((s, p) => s + p.amount, 0);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
      padding: '24px'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '640px', padding: 0, border: '1px solid rgba(99, 102, 241, 0.3)', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}>
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), transparent)' }}>
          <div className="flex justify-between items-center">
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Customer Installment Plan</div>
              <h2 className="h2" style={{ margin: 0, fontSize: '1.3rem' }}>Invoice #{invoice.invoiceNumber} - {getCustomerName(invoice.customerId)}</h2>
            </div>
            <button className="btn btn-secondary" style={{ padding: '8px' }} onClick={onClose}><X size={20} /></button>
          </div>
        </div>

        <div className="modal-body" style={{ padding: '24px' }}>
          <div className="grid grid-cols-3 gap-3 mb-6" style={{ background: 'var(--subtle-bg)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Total Amount</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 850, color: 'var(--text-primary)' }}>LKR {totalInvoiceAmount.toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Paid So Far</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 850, color: 'var(--success)' }}>LKR {totalPaidSoFar.toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Remaining</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 850, color: 'var(--warning)' }}>LKR {Math.max(0, totalInvoiceAmount - totalPaidSoFar).toLocaleString()}</div>
            </div>
          </div>
          <h3 className="h3" style={{ fontSize: '1rem', marginBottom: '12px' }}>Payment Schedule Breakdown ({plan.count} {plan.frequency} Payments)</h3>
        </div>
      </div>
    </div>
  );
};

const InvoiceModal = ({ onClose, onSave, customers, inventory, initialData }) => {
  const { smsConfig = {}, generateInstallmentSchedule } = useContext(StoreContext) || {};
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

  const [enableInstallments, setEnableInstallments] = useState(initialData?.installmentPlan?.enabled || false);
  const [installmentCount, setInstallmentCount] = useState(initialData?.installmentPlan?.count || 3);
  const [downPayment, setDownPayment] = useState(initialData?.installmentPlan?.downPayment || 0);
  const [installmentFrequency, setInstallmentFrequency] = useState(initialData?.installmentPlan?.frequency || 'Monthly');
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
      <div className="glass-panel" style={{ width: '100%', maxWidth: '780px', padding: 0, maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
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
          const netTotal = calculateTotal(formData.items, formData.discount);
          const finalPlan = (enableInstallments && generateInstallmentSchedule)
            ? generateInstallmentSchedule(netTotal, installmentCount, downPayment, formData.date, installmentFrequency)
            : null;
          onSave({ ...formData, amount: netTotal, items: finalItems, installmentPlan: finalPlan });
          onClose();
        }} className="modal-body">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Invoice Serial #</label>
              <input required type="text" className="form-input" style={{ height: '44px' }} value={formData.invoiceNumber} onChange={e => setFormData({ ...formData, invoiceNumber: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Client / Local Gym</label>
              <select className="form-input" style={{ height: '44px' }} value={formData.customerId} onChange={e => setFormData({ ...formData, customerId: e.target.value })} required>
                <option value="">Select a Client</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.gymName}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Invoice Issue Date</label>
              <input required type="date" className="form-input" style={{ height: '44px' }} value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Payment Due Date</label>
              <input required type="date" className="form-input" style={{ height: '44px' }} value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} />
            </div>
          </div>

          <div style={{ marginTop: '32px', padding: '24px', background: 'var(--subtle-bg)', borderRadius: '16px', border: '1px solid var(--panel-border)' }}>
            <label className="form-label" style={{ fontSize: '0.85rem' }}>Dynamic Line Items</label>
            <div className="flex gap-4 mb-4">
              <select className="form-input flex-1" style={{ height: '44px' }} value={selectedInventoryId} onChange={e => setSelectedInventoryId(e.target.value)}>
                <option value="">+ Browse inventory or software subscription...</option>
                {inventory.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.name} • LKR {(inv.price || 0).toLocaleString()} {inv.type === 'Hardware' ? `(In Stock: ${inv.stock || 0} units)` : '(Service/Software)'}
                  </option>
                ))}
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

          {/* DISCOUNT MODULE */}
          <div style={{ marginTop: '24px', padding: '20px', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '16px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Tag size={18} color="#f59e0b" />
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f59e0b' }}>Special Discount &amp; Coupon Module</span>
              </div>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Quick Presets:</span>
                {[
                  { label: '5%', calc: (sub) => Math.round(sub * 0.05) },
                  { label: '10%', calc: (sub) => Math.round(sub * 0.10) },
                  { label: '15%', calc: (sub) => Math.round(sub * 0.15) },
                  { label: 'LKR 5k', calc: () => 5000 },
                  { label: 'LKR 10k', calc: () => 10000 }
                ].map((preset, pIdx) => {
                  const sub = calculateSubtotal(formData.items);
                  const discountVal = preset.calc(sub);
                  return (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => setFormData({ ...formData, discount: discountVal, amount: calculateTotal(formData.items, discountVal) })}
                      style={{
                        background: Number(formData.discount) === discountVal ? '#f59e0b' : 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        color: Number(formData.discount) === discountVal ? '#ffffff' : '#f59e0b',
                        padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer'
                      }}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Gross Subtotal: <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>LKR {calculateSubtotal(formData.items).toLocaleString()}</strong>
              </div>
              <div className="flex items-center gap-3">
                <label className="form-label mb-0" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Deduction (LKR):</label>
                <input
                  type="number"
                  className="form-input"
                  style={{ width: '160px', height: '40px', textAlign: 'right', fontWeight: 800, color: '#f59e0b' }}
                  value={formData.discount === 0 ? '' : formData.discount}
                  onChange={e => setFormData({ ...formData, discount: e.target.value, amount: calculateTotal(formData.items, e.target.value) })}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4" style={{ marginTop: '20px', padding: '24px', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '16px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
            <div className="flex items-center gap-3">
              <ShoppingBag size={24} className="text-secondary" />
              <span className="text-secondary" style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.05em' }}>NET TOTAL AMOUNT</span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-display)', textShadow: '0 2px 10px rgba(34, 197, 94, 0.2)' }}>
              LKR {calculateTotal(formData.items, formData.discount).toLocaleString()}
            </div>
          </div>

          {/* INSTALLMENT PLAN */}
          <div style={{ marginTop: '24px', padding: '20px', background: 'rgba(99, 102, 241, 0.06)', borderRadius: '16px', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarDays size={20} color="var(--accent-primary)" />
                <span style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)' }}>Customer Payment Installment Plan</span>
              </div>
              <label className="flex items-center gap-2" style={{ cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                <input
                  type="checkbox"
                  checked={enableInstallments}
                  onChange={e => setEnableInstallments(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
                Enable Installment Plan
              </label>
            </div>
            {enableInstallments && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Upfront Down Payment (LKR)</label>
                    <input type="number" className="form-input" style={{ height: '42px' }} placeholder="0" value={downPayment === 0 ? '' : downPayment} onChange={e => setDownPayment(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}># of Installments</label>
                    <select className="form-input" style={{ height: '42px' }} value={installmentCount} onChange={e => setInstallmentCount(e.target.value)}>
                      <option value="2">2 Installments</option>
                      <option value="3">3 Installments</option>
                      <option value="4">4 Installments</option>
                      <option value="6">6 Installments</option>
                      <option value="12">12 Installments</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Frequency</label>
                    <select className="form-input" style={{ height: '42px' }} value={installmentFrequency} onChange={e => setInstallmentFrequency(e.target.value)}>
                      <option value="Monthly">Monthly</option>
                      <option value="Weekly">Weekly</option>
                    </select>
                  </div>
                </div>
                {(() => {
                  const netTotal = calculateTotal(formData.items, formData.discount);
                  if (!generateInstallmentSchedule) return null;
                  const planPreview = generateInstallmentSchedule(netTotal, installmentCount, downPayment, formData.date, installmentFrequency);
                  return (
                    <div style={{ background: 'var(--subtle-bg)', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Calculated Schedule Preview ({planPreview.installments.length} Payments)
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                        {planPreview.installments.map((inst, idx) => (
                          <div key={idx} style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--subtle-border)' }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{inst.title}</div>
                            <div style={{ fontSize: '0.92rem', fontWeight: 850, color: 'var(--text-primary)', margin: '3px 0' }}>LKR {inst.amount.toLocaleString()}</div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Due: {new Date(inst.dueDate).toLocaleDateString()}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          <div style={{ marginTop: '24px' }}>
            <label className="form-label" style={{ fontSize: '0.85rem' }}>Service Agreement &amp; Terms (Optional)</label>
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
