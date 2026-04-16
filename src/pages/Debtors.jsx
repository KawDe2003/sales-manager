import React, { useContext, useMemo, useState } from 'react';
import { StoreContext } from '../context/StoreContext';
import { 
  AlertCircle, Search, User, ExternalLink, 
  ChevronRight, ChevronDown, BadgeDollarSign, ArrowRightLeft,
  Send, Clock, History, Filter, ArrowUpDown, TrendingDown
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Debtors = () => {
  const { customers = [], invoices = [], payments = [], triggerSMS, showNotification } = useContext(StoreContext) || {};
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDebtor, setExpandedDebtor] = useState(null);
  const [sortBy, setSortBy] = useState('debt'); // 'debt' or 'oldest'

  // --- LOGIC: AGGREGATE DEBTORS & AGING ---
  const debtorList = useMemo(() => {
    const now = new Date();
    
    const mappedDebtors = customers.map(customer => {
      const customerPartialInvoices = invoices
        .filter(inv => inv.customerId === customer.id && inv.status !== 'Paid')
        .map(inv => {
          const invPayments = payments.filter(p => p.documentId === inv.id);
          const totalPaid = invPayments.reduce((sum, p) => sum + p.amount, 0);
          
          if (invPayments.length === 0 && inv.status !== 'Partially Paid') return null; // Filter for only those with history as per user req

          const balance = inv.amount - totalPaid;
          
          // Calculate Age (Days Overdue)
          const dueDate = new Date(inv.dueDate);
          const diffTime = now - dueDate;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          let ageBucket = 'current'; // Default
          if (diffDays > 21) ageBucket = 'overdue';
          else if (diffDays > 7) ageBucket = 'warning';

          return {
            ...inv,
            paidAmount: totalPaid,
            remainingBalance: balance,
            paymentHistory: invPayments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
            ageDays: diffDays,
            ageBucket
          };
        }).filter(Boolean);

      if (customerPartialInvoices.length === 0) return null;

      const totalOutstanding = customerPartialInvoices.reduce((sum, inv) => sum + inv.remainingBalance, 0);
      const oldestInvoiceDate = new Date(Math.min(...customerPartialInvoices.map(i => new Date(i.date))));
      
      return {
        customer,
        invoices: customerPartialInvoices,
        totalOutstanding,
        oldestInvoiceDate
      };
    }).filter(Boolean);

    // Sorting
    if (sortBy === 'debt') {
        return mappedDebtors.sort((a, b) => b.totalOutstanding - a.totalOutstanding);
    } else {
        return mappedDebtors.sort((a, b) => a.oldestInvoiceDate - b.oldestInvoiceDate);
    }
  }, [customers, invoices, payments, sortBy]);

  const filteredDebtors = debtorList.filter(d => 
    d.customer.gymName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.customer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- ANALYTICS: BUCKET CALCULATIONS ---
  const buckets = useMemo(() => {
    const summary = { current: 0, warning: 0, overdue: 0 };
    debtorList.forEach(d => {
      d.invoices.forEach(inv => {
        summary[inv.ageBucket] += inv.remainingBalance;
      });
    });
    return summary;
  }, [debtorList]);

  const globalTotalDebt = useMemo(() => 
    Object.values(buckets).reduce((sum, val) => sum + val, 0), 
  [buckets]);

  const handleNudge = (customer, invoice) => {
    if (triggerSMS) {
      triggerSMS('DebtorNudge', customer, {
        invoiceNumber: invoice.invoiceNumber,
        remainingBalance: invoice.remainingBalance,
        dueDate: invoice.dueDate
      });
      showNotification(`Nudge sent to ${customer.gymName}`);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', paddingBottom: '40px' }}>
      {/* HEADER SECTION */}
      <div className="page-hero">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <h1 className="h1 mb-2">Advanced Asset Recovery</h1>
            <p className="text-secondary">Enterprise-grade tracking of uncollected revenue and partial payment aging.</p>
          </div>
          
          <div className="flex items-center gap-4">
              <div className="glass-panel" style={{ padding: '12px 20px', background: 'var(--subtle-bg)', border: '1px solid var(--panel-border)' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Global Receivables</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                      LKR {globalTotalDebt.toLocaleString()}
                  </div>
              </div>
              <div className="btn-group">
                  <button 
                    className={`btn ${sortBy === 'debt' ? 'btn-primary' : 'btn-secondary'}`} 
                    onClick={() => setSortBy('debt')}
                    style={{ padding: '8px 16px', fontSize: '0.75rem' }}
                  >
                      <TrendingDown size={14} /> By Value
                  </button>
                  <button 
                    className={`btn ${sortBy === 'oldest' ? 'btn-primary' : 'btn-secondary'}`} 
                    onClick={() => setSortBy('oldest')}
                    style={{ padding: '8px 16px', fontSize: '0.75rem' }}
                  >
                      <Clock size={14} /> By Age
                  </button>
              </div>
          </div>
        </div>
      </div>

      {/* AGING BUCKETS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <AgingBucket label="Current" amount={buckets.current} color="var(--success)" desc="< 7 days overdue" percent={(buckets.current / globalTotalDebt) * 100} />
        <AgingBucket label="Warning" amount={buckets.warning} color="var(--warning)" desc="7 - 21 days overdue" percent={(buckets.warning / globalTotalDebt) * 100} />
        <AgingBucket label="At Risk" amount={buckets.overdue} color="var(--danger)" desc="21+ days overdue" percent={(buckets.overdue / globalTotalDebt) * 100} />
      </div>

      {/* SEARCH & FILTERS */}
      <div className="glass-panel mb-8" style={{ padding: '8px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="form-input" 
            placeholder="Search active debtors..." 
            style={{ paddingLeft: '52px', height: '48px', border: 'none', background: 'transparent' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* DEBTOR LIST */}
      <div className="flex flex-col gap-4">
        {filteredDebtors.length === 0 ? (
          <div className="glass-panel flex flex-col items-center justify-center" style={{ padding: '80px', textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
              <BadgeDollarSign size={40} color="var(--success)" />
            </div>
            <h3 className="h2">Perfect Collections</h3>
            <p className="text-secondary" style={{ maxWidth: '350px' }}>Your receivers are currently 100% synchronized. No partial payments are pending collection.</p>
          </div>
        ) : (
          filteredDebtors.map((debtor) => (
            <div key={debtor.customer.id} className="glass-panel" style={{ padding: 0, overflow: 'hidden', border: expandedDebtor === debtor.customer.id ? '1px solid var(--accent-primary)40' : '1px solid var(--panel-border)' }}>
              <div 
                onClick={() => setExpandedDebtor(expandedDebtor === debtor.customer.id ? null : debtor.customer.id)}
                style={{ 
                  padding: '24px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  cursor: 'pointer',
                  background: expandedDebtor === debtor.customer.id ? 'var(--bg-primary)' : 'transparent',
                  transition: 'background 0.3s ease'
                }}
              >
                <div className="flex items-center gap-5">
                  <div style={{ position: 'relative' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--subtle-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={24} className="text-secondary" />
                    </div>
                    {debtor.invoices.some(i => i.ageBucket === 'overdue') && (
                        <div style={{ position: 'absolute', top: '-4px', right: '-4px', width: '12px', height: '12px', background: 'var(--danger)', borderRadius: '50%', border: '2px solid var(--bg-secondary)', boxShadow: '0 0 10px var(--danger)50' }}></div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{debtor.customer.gymName}</div>
                    <div className="flex items-center gap-2" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <span>{debtor.customer.name}</span>
                        <span style={{ opacity: 0.3 }}>|</span>
                        <span>{debtor.customer.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-10">
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Outstanding Balance</div>
                    <div style={{ fontWeight: 800, color: debtor.invoices.some(i => i.ageDays > 7) ? 'var(--danger)' : 'var(--text-primary)', fontSize: '1.25rem', fontFamily: 'var(--font-display)' }}>
                        LKR {debtor.totalOutstanding.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--subtle-bg)' }}>
                    {expandedDebtor === debtor.customer.id ? <ChevronDown size={20} className="text-muted" /> : <ChevronRight size={20} className="text-muted" />}
                  </div>
                </div>
              </div>

              {/* EXPANDED CONTENT */}
              {expandedDebtor === debtor.customer.id && (
                <div style={{ padding: '0 24px 24px 24px', animation: 'fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                  <div style={{ height: '1px', background: 'var(--panel-border)', marginBottom: '32px' }}></div>
                  
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                    {/* Unpaid Invoices List */}
                    <div className="xl:col-span-7 flex flex-col gap-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock size={16} className="text-muted" />
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Receivables</span>
                        </div>
                        {debtor.invoices.map(inv => (
                        <div key={inv.id} style={{ padding: '24px', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--panel-border)', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: inv.ageBucket === 'overdue' ? 'var(--danger)' : inv.ageBucket === 'warning' ? 'var(--warning)' : 'var(--success)' }}></div>
                            
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary)', background: 'var(--accent-primary)15', padding: '4px 10px', borderRadius: '6px' }}>{inv.invoiceNumber}</span>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: inv.ageDays > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                                            {inv.ageDays > 0 ? `${inv.ageDays} Days Overdue` : 'Payment Current'}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>LKR {inv.remainingBalance.toLocaleString()} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>of {inv.amount.toLocaleString()}</span></div>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                      onClick={() => handleNudge(debtor.customer, inv)}
                                      className="btn btn-secondary" 
                                      style={{ padding: '8px 12px', background: 'var(--danger-bg)', borderColor: 'var(--danger)20', color: 'var(--danger)' }}
                                    >
                                        <Send size={16} /> Send Nudge
                                    </button>
                                    <Link to="/payments" className="btn btn-primary" style={{ padding: '8px 16px' }}>
                                        Record Payment
                                    </Link>
                                </div>
                            </div>

                            <div style={{ position: 'relative', height: '10px', background: 'var(--bg-primary)', borderRadius: '5px', overflow: 'hidden', marginBottom: '12px' }}>
                                <div style={{ 
                                    position: 'absolute', left: 0, top: 0, bottom: 0, 
                                    width: `${(inv.paidAmount / inv.amount) * 100}%`,
                                    background: 'var(--success)',
                                    boxShadow: '0 0 15px var(--success)40',
                                    transition: 'width 1s ease-out'
                                }}></div>
                            </div>
                            <div className="flex justify-between items-center" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                <span>Collection Ratio: {Math.round((inv.paidAmount / inv.amount) * 100)}%</span>
                                <span>Source: {inv.status}</span>
                            </div>
                        </div>
                        ))}
                    </div>

                    {/* Payment History Timeline */}
                    <div className="xl:col-span-5">
                         <div className="flex items-center gap-2 mb-6">
                            <History size={16} className="text-muted" />
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Consolidated Log</span>
                        </div>
                        <div style={{ borderLeft: '2px solid var(--panel-border)', marginLeft: '8px', paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {debtor.invoices.flatMap(i => i.paymentHistory).length === 0 ? (
                                <div className="text-secondary" style={{ fontSize: '0.85rem' }}>No payment history available for this record.</div>
                            ) : (
                                debtor.invoices.flatMap(i => i.paymentHistory)
                                  .sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp))
                                  .slice(0, 10)
                                  .map((pay, pIdx) => (
                                    <div key={pay.id || pIdx} style={{ position: 'relative' }}>
                                        <div style={{ position: 'absolute', left: '-33px', top: '4px', width: '16px', height: '16px', borderRadius: '50%', background: 'var(--bg-secondary)', border: '3px solid var(--accent-primary)' }}></div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>LKR {pay.amount.toLocaleString()} Received</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(pay.timestamp).toLocaleString()} • {pay.type || 'Cash'} Deposit</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const AgingBucket = ({ label, amount, color, desc, percent }) => (
    <div className="glass-panel" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: '-20px', bottom: '-20px', opacity: 0.05 }}>
            <TrendingDown size={120} color={color} />
        </div>
        <div className="flex justify-between items-start mb-4">
            <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: amount > 0 ? color : 'var(--text-muted)', fontFamily: 'var(--font-display)', margin: '4px 0' }}>
                    LKR {amount.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{desc}</div>
            </div>
            <div style={{ padding: '8px', borderRadius: '10px', background: `${color}15` }}>
                <Clock size={20} color={color} />
            </div>
        </div>
        <div style={{ height: '4px', width: '100%', background: 'var(--subtle-bg)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${percent || 0}%`, background: color }}></div>
        </div>
    </div>
);

export default Debtors;
