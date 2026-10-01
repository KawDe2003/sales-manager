import React, { useContext, useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { StoreContext } from '../context/StoreContext';
import { 
  AlertCircle, Search, User, ExternalLink, 
  ChevronRight, ChevronDown, BadgeDollarSign, ArrowRightLeft,
  Send, Clock, History, Filter, ArrowUpDown, TrendingDown,
  Download, CheckCircle, Plus, Calendar, Tag, DollarSign, X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { generateDebtorReportPDF } from '../utils/pdfGenerator';
import CustomSelect from '../components/CustomSelect';

const Debtors = () => {
  const { 
    customers = [], invoices = [], payments = [], 
    recordEnhancedPayment, smsConfig = {}, showNotification 
  } = useContext(StoreContext) || {};

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Partially Paid' | 'Overdue' | 'Due Today' | 'Due This Week'
  const [tagFilter, setTagFilter] = useState('All');
  const [customerFilter, setCustomerFilter] = useState('All');
  
  // Inline Record Payment Modal state
  const [activePaymentInvoice, setActivePaymentInvoice] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Cash');
  const [payRef, setPayRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- LOGIC: AGGREGATE DEBTORS (ALL INVOICES WITH OUTSTANDING > 0) ---
  const debtorList = useMemo(() => {
    const now = new Date();
    todayStart: {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
    }
    const todayStr = now.toISOString().split('T')[0];

    // Compute end of week
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
    const endOfWeekStr = endOfWeek.toISOString().split('T')[0];

    const list = [];

    invoices.forEach(inv => {
      // Must not be closed or cancelled
      if (inv.status === 'Paid' || inv.status === 'Closed' || inv.status === 'Cancelled') return;

      const cust = customers.find(c => c.id === inv.customerId || c.gymName === inv.prospectName) || {
        id: inv.customerId,
        gymName: inv.prospectName || 'Valued Customer',
        name: inv.prospectName || 'Customer',
        phone: '',
        tags: ['Walk-in']
      };

      const invPayments = payments.filter(p => p.documentId === inv.id);
      const totalPaid = invPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const invoiceTotal = Number(inv.amount) || 0;
      const outstanding = Math.max(0, invoiceTotal - totalPaid);

      // Business Rule: Outstanding > 0 -> Show in Debtors. Outstanding = 0 -> Auto-removed.
      if (outstanding <= 0) return;

      // Age calculation
      const dueDate = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.date);
      const diffTime = now.getTime() - dueDate.getTime();
      const daysOverdue = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
      const isPastDue = diffTime > 0;
      const isDueToday = inv.dueDate === todayStr;
      const isDueThisWeek = inv.dueDate >= todayStr && inv.dueDate <= endOfWeekStr;

      const lastPayment = invPayments.length > 0
        ? invPayments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
        : null;

      list.push({
        invoice: inv,
        customer: cust,
        total: invoiceTotal,
        paid: totalPaid,
        outstanding,
        daysOverdue,
        isPastDue,
        isDueToday,
        isDueThisWeek,
        lastPayment,
        dueDateStr: inv.dueDate || 'N/A',
        invoiceDateStr: inv.date || 'N/A'
      });
    });

    return list;
  }, [invoices, customers, payments]);

  // Filtering
  const filteredDebtors = useMemo(() => {
    return debtorList.filter(d => {
      const searchStr = (searchTerm || '').toLowerCase();
      const matchSearch = d.customer.gymName.toLowerCase().includes(searchStr) ||
                          d.customer.name.toLowerCase().includes(searchStr) ||
                          d.invoice.invoiceNumber.toLowerCase().includes(searchStr);

      let matchStatus = true;
      if (statusFilter === 'Partially Paid') {
        matchStatus = d.paid > 0 && d.outstanding > 0;
      } else if (statusFilter === 'Overdue') {
        matchStatus = d.isPastDue && d.daysOverdue > 0;
      } else if (statusFilter === 'Due Today') {
        matchStatus = d.isDueToday;
      } else if (statusFilter === 'Due This Week') {
        matchStatus = d.isDueThisWeek;
      }

      let matchTag = true;
      if (tagFilter !== 'All') {
        matchTag = Array.isArray(d.customer.tags) ? d.customer.tags.includes(tagFilter) : d.customer.tag === tagFilter;
      }

      let matchCustomer = true;
      if (customerFilter !== 'All') {
        matchCustomer = d.customer.id === customerFilter;
      }

      return matchSearch && matchStatus && matchTag && matchCustomer;
    });
  }, [debtorList, searchTerm, statusFilter, tagFilter, customerFilter]);

  // Aggregates
  const totalReceivables = useMemo(() => {
    return filteredDebtors.reduce((s, d) => s + d.outstanding, 0);
  }, [filteredDebtors]);

  const totalOverdue = useMemo(() => {
    return filteredDebtors.filter(d => d.isPastDue && d.daysOverdue > 0).reduce((s, d) => s + d.outstanding, 0);
  }, [filteredDebtors]);

  // Inline Payment Submit
  const handleInlinePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!activePaymentInvoice || !payAmount) return;

    setIsSubmitting(true);
    try {
      const result = await recordEnhancedPayment({
        customerId: activePaymentInvoice.customer.id,
        documentId: activePaymentInvoice.invoice.id,
        amount: parseFloat(payAmount),
        method: payMethod,
        reference: payRef,
        notes: `Recorded directly via Debtors Outstanding list`
      });

      if (result) {
        showNotification(`Payment of LKR ${parseFloat(payAmount).toLocaleString()} recorded. Balance updated.`, 'success');
        setActivePaymentInvoice(null);
        setPayAmount('');
        setPayRef('');
      }
    } catch (err) {
      console.error(err);
      showNotification('Failed to record payment.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', paddingBottom: '40px' }}>
      {/* HEADER SECTION */}
      <div className="page-hero">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <h1 className="h1 mb-2">Debtors & Outstanding Ledger</h1>
            <p className="text-secondary">
              Track uncollected invoices, aging schedules, and record payments directly from the debtors list.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              type="button"
              className="btn btn-primary"
              style={{ gap: '8px' }}
              onClick={() => generateDebtorReportPDF(filteredDebtors, totalReceivables)}
            >
              <Download size={16} /> Export Debtor Report PDF
            </button>
          </div>
        </div>
      </div>

      {/* KPI METRICS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid var(--accent-primary)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Active Debtors</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '4px' }}>
            {filteredDebtors.length} Invoices
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>Across {new Set(filteredDebtors.map(d => d.customer.id)).size} unique customers</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid var(--warning)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Receivables Balance</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--warning)', marginTop: '4px', fontFamily: 'var(--font-display)' }}>
            LKR {totalReceivables.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>Pending collection from customers</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid var(--danger)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Overdue Receivables</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--danger)', marginTop: '4px', fontFamily: 'var(--font-display)' }}>
            LKR {totalOverdue.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>Past payment due dates</div>
        </div>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="glass-panel mb-6" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div style={{ position: 'relative', flex: 1, width: '100%' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '12px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search by customer name, owner, or invoice number (INV-XXXX)..." 
              style={{ paddingLeft: '48px', height: '42px', background: 'var(--subtle-bg)' }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-2 flex-wrap w-full md:w-auto">
            {['All', 'Partially Paid', 'Overdue', 'Due Today', 'Due This Week'].map(st => (
              <button
                key={st}
                type="button"
                className={`btn ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                onClick={() => setStatusFilter(st)}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 flex-wrap items-center pt-2 border-t border-panel">
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Filter By:</span>
          
          <CustomSelect 
            value={tagFilter}
            onChange={setTagFilter}
            options={['All', 'Corporate', 'Individual', 'VIP', 'Student', 'Walk-in'].map(t => ({ value: t, label: t === 'All' ? 'All Tags' : `Tag: ${t}` }))}
            style={{ height: '36px', minWidth: '130px' }}
          />

          <CustomSelect 
            value={customerFilter}
            onChange={setCustomerFilter}
            options={[
              { value: 'All', label: 'All Customers' },
              ...customers.map(c => ({ value: c.id, label: c.gymName }))
            ]}
            style={{ height: '36px', minWidth: '180px' }}
          />

          {(searchTerm || statusFilter !== 'All' || tagFilter !== 'All' || customerFilter !== 'All') && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ height: '36px', fontSize: '0.75rem', padding: '0 12px' }}
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('All');
                setTagFilter('All');
                setCustomerFilter('All');
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* DEBTORS TABLE */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Invoice #</th>
                <th>Invoice Date</th>
                <th>Due Date</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Outstanding</th>
                <th>Days Overdue</th>
                <th>Last Payment</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDebtors.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                    No outstanding debtors found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredDebtors.map(d => (
                  <tr key={d.invoice.id}>
                    <td>
                      <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{d.customer.gymName}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{d.customer.name}</div>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                      #{d.invoice.invoiceNumber}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(d.invoiceDateStr).toLocaleDateString()}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: d.isPastDue ? 'var(--danger)' : 'var(--text-muted)', fontWeight: d.isPastDue ? 700 : 400 }}>
                      {new Date(d.dueDateStr).toLocaleDateString()}
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      LKR {d.total.toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>
                      LKR {d.paid.toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 850, color: 'var(--danger)', fontFamily: 'var(--font-display)', fontSize: '0.95rem' }}>
                      LKR {d.outstanding.toLocaleString()}
                    </td>
                    <td>
                      {d.daysOverdue > 0 ? (
                        <span className="badge badge-danger" style={{ fontSize: '0.68rem', fontWeight: 800 }}>
                          {d.daysOverdue} days overdue
                        </span>
                      ) : (
                        <span className="badge badge-neutral" style={{ fontSize: '0.68rem' }}>Current</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {d.lastPayment ? (
                        <div>
                          <div>LKR {Number(d.lastPayment.amount).toLocaleString()}</div>
                          <div style={{ fontSize: '0.68rem', opacity: 0.8 }}>{new Date(d.lastPayment.timestamp).toLocaleDateString()}</div>
                        </div>
                      ) : (
                        'None'
                      )}
                    </td>
                    <td>
                      <span className={`badge ${d.paid > 0 ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                        {d.paid > 0 ? 'Partially Paid' : 'Unpaid'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {/* INLINE RECORD PAYMENT BUTTON */}
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ height: '32px', padding: '0 12px', fontSize: '0.75rem', fontWeight: 800, gap: '4px' }}
                        onClick={() => {
                          setActivePaymentInvoice(d);
                          setPayAmount(d.outstanding.toString());
                        }}
                      >
                        <DollarSign size={13} /> Record Payment
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INLINE RECORD PAYMENT MODAL */}
      {activePaymentInvoice && typeof document !== 'undefined' && createPortal(
        <div 
          className="modal-overlay app-modal-backdrop"
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, inset: 0,
            background: 'rgba(2, 6, 23, 0.88)', backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999, padding: '12px'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setActivePaymentInvoice(null); }}
        >
          <div 
            className="glass-panel app-modal-dialog" 
            style={{ 
              width: '100%', maxWidth: '480px', maxHeight: 'min(92vh, calc(100dvh - 24px))', overflowY: 'auto',
              padding: '24px', background: '#111827', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '16px', boxShadow: '0 25px 65px -10px rgba(0, 0, 0, 0.85)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="h3" style={{ margin: 0, fontSize: '1.3rem' }}>Record Payment</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Invoice #{activePaymentInvoice.invoice.invoiceNumber} • {activePaymentInvoice.customer.gymName}
                </div>
              </div>
              <button type="button" className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => setActivePaymentInvoice(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'var(--subtle-bg)', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Invoice Total</div>
                <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>LKR {activePaymentInvoice.total.toLocaleString()}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Remaining Balance</div>
                <div style={{ fontWeight: 900, color: 'var(--danger)' }}>LKR {activePaymentInvoice.outstanding.toLocaleString()}</div>
              </div>
            </div>

            <form onSubmit={handleInlinePaymentSubmit}>
              <div className="form-group mb-4">
                <label className="form-label">Payment Amount (LKR) *</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>LKR</span>
                  <input 
                    required
                    type="number"
                    className="form-input"
                    style={{ paddingLeft: '52px', height: '46px', fontSize: '1.1rem', fontWeight: 800 }}
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group mb-4">
                <label className="form-label">Payment Method</label>
                <CustomSelect 
                  value={payMethod}
                  onChange={setPayMethod}
                  options={['Cash', 'Bank Transfer', 'Card', 'Online Payment', 'Other'].map(m => ({ value: m, label: m }))}
                  style={{ height: '44px' }}
                />
              </div>

              <div className="form-group mb-6">
                <label className="form-label">Reference Number (Optional)</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="e.g. SLIP-0012 / Cheque #8812"
                  value={payRef}
                  onChange={e => setPayRef(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" className="btn btn-secondary" onClick={() => setActivePaymentInvoice(null)}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  style={{ padding: '0 24px', fontWeight: 800 }}
                >
                  {isSubmitting ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Debtors;
