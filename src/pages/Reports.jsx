import React, { useContext, useState } from 'react';
import { StoreContext } from '../context/StoreContext';
import { BarChart3, TrendingUp, Users, AlertCircle, FileText, Target, Wallet, Plus, Trash2, Download, Printer, FileSpreadsheet } from 'lucide-react';
import { exportToCSV, exportToExcel } from '../utils/export';
import { generateAccountingReportPDF } from '../utils/pdfGenerator';

const Reports = () => {
  const { 
    invoices = [], 
    customers = [], 
    quotes = [], 
    leads = [], 
    expenses = [],
    addExpense, deleteExpense 
  } = useContext(StoreContext) || {};
  const totalRevenue = invoices.filter(i => i.status === 'Paid').reduce((acc, i) => acc + Number(i.amount || 0), 0);
  const projectedRenewals = customers.filter(c => c.status === 'Active').reduce((acc, c) => acc + Number(c.annualFee || 0), 0);
  const activeGyms = customers.filter(c => c.status === 'Active').length;
  const overdueInvoices = invoices.filter(i => i.status === 'Overdue');
  const overdueTotal = overdueInvoices.reduce((acc, i) => acc + Number(i.amount || 0), 0);

  const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', category: 'Operational' });

  // Lead Conversion Stats
  const totalLeads = leads.length;
  const convertedLeads = quotes.filter(q => leads.some(l => l.gymName === q.prospectName)).length;
  const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

  // Monthly revenue breakdown — group paid invoices by month
  const monthlyRevenue = {};
  invoices.filter(i => i.status === 'Paid').forEach(inv => {
    const d = new Date(inv.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('default', { month: 'short', year: 'numeric' });
    if (!monthlyRevenue[key]) monthlyRevenue[key] = { label, total: 0 };
    monthlyRevenue[key].total += Number(inv.amount || 0);
  });
  const monthlyData = Object.entries(monthlyRevenue).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);

  // Top clients by total spend
  const clientSpend = {};
  invoices.filter(i => i.status === 'Paid').forEach(inv => {
    const c = customers.find(c => c.id === inv.customerId);
    const name = c?.gymName || 'Unknown';
    clientSpend[name] = (clientSpend[name] || 0) + Number(inv.amount || 0);
  });
  const topClients = Object.entries(clientSpend).sort(([, a], [, b]) => b - a).slice(0, 5);

  // Quotes pipeline
  const quotePipeline = [
    { label: 'Pending', count: quotes.filter(q => q.status === 'Pending').length, color: '#f59e0b' },
    { label: 'Accepted', count: quotes.filter(q => q.status === 'Accepted').length, color: '#10b981' },
    { label: 'Counter Offer', count: quotes.filter(q => q.status === 'Counter Offer').length, color: '#3b82f6' },
    { label: 'Rejected', count: quotes.filter(q => q.status === 'Rejected').length, color: '#ef4444' },
  ];

  let momGrowth = 0;
  if (monthlyData.length >= 2) {
    const currentM = monthlyData[monthlyData.length - 1].total;
    const prevM = monthlyData[monthlyData.length - 2].total;
    if (prevM > 0) momGrowth = Math.round(((currentM - prevM) / prevM) * 100);
  }

  const expenseByCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount || 0);
    return acc;
  }, {});

  const forecast = { '3 Months': 0, '6 Months': 0, '12 Months': 0 };
  const today = new Date();
  customers.filter(c => c.status === 'Active' && c.renewalDate).forEach(c => {
    const r = new Date(c.renewalDate);
    const diffMonths = (r.getFullYear() - today.getFullYear()) * 12 + (r.getMonth() - today.getMonth());
    if (diffMonths <= 3 && diffMonths >= 0) forecast['3 Months'] += Number(c.annualFee || 0);
    if (diffMonths <= 6 && diffMonths >= 0) forecast['6 Months'] += Number(c.annualFee || 0);
    if (diffMonths <= 12 && diffMonths >= 0) forecast['12 Months'] += Number(c.annualFee || 0);
  });

  const getAccountingData = () => {
    const exportData = [];
    invoices.filter(i => i.status === 'Paid').forEach(inv => {
       const clientName = customers.find(c => c.id === inv.customerId)?.gymName || 'Unknown';
       exportData.push({
         Date: inv.date,
         Type: 'Revenue',
         Category: 'Invoice Payment',
         Description: `Invoice #${inv.invoiceNumber} - ${clientName}`,
         Amount: inv.amount
       });
    });
    expenses.forEach(exp => {
       exportData.push({
         Date: exp.date || new Date().toISOString().split('T')[0],
         Type: 'Expense',
         Category: exp.category,
         Description: exp.description,
         Amount: -Math.abs(exp.amount) 
       });
    });
    return exportData.sort((a, b) => new Date(b.Date) - new Date(a.Date));
  };

  const handleExportCSV = () => {
    exportToCSV('Accounting_Summary', getAccountingData());
  };

  const handleExportExcel = () => {
    exportToExcel('Accounting_Summary', getAccountingData());
  };

  const handleExportPDF = () => {
    generateAccountingReportPDF(getAccountingData());
  };

  return (
    <div style={{ animation: 'fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div>
          <h1 className="h1 mb-1">Reports & Analytics</h1>
          <p className="text-secondary" style={{ fontSize: '0.9rem' }}>Real-time overview of your gym software sales performance.</p>
        </div>
        <div className="btn-group flex gap-3">
          <button className="btn btn-secondary" style={{ padding: '10px 20px', height: '44px', color: 'var(--success)' }} onClick={handleExportExcel}>
            <FileSpreadsheet size={16} /> Excel Download
          </button>
          <button className="btn btn-secondary" style={{ padding: '10px 20px', height: '44px' }} onClick={handleExportPDF}>
            <Download size={16} className="text-accent-primary" /> PDF Report
          </button>
          <button className="btn btn-primary" style={{ padding: '10px 20px', height: '44px' }} onClick={() => window.print()}>
            <Printer size={16} /> Print View
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { title: 'Total Revenue', value: `LKR ${totalRevenue.toLocaleString()}`, icon: <TrendingUp />, color: 'var(--success)', sub: 'Paid Invoices' },
          { title: 'Net Profit', value: `LKR ${netProfit.toLocaleString()}`, icon: <Wallet />, color: netProfit >= 0 ? "var(--success)" : "var(--danger)", sub: 'Rev - Exp' },
          { title: 'Total Expenses', value: `LKR ${totalExpenses.toLocaleString()}`, icon: <AlertCircle />, color: 'var(--warning)', sub: `${expenses.length} Records` },
          { title: 'Active Gyms', value: activeGyms, icon: <Users />, color: 'var(--accent-primary)', sub: 'Live Clients' },
        ].map(card => (
          <div key={card.title} className="glass-panel hover-lift" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px' }}>
            <div style={{ 
              width: '42px', height: '42px', borderRadius: '12px', 
              background: `${card.color}10`, display: 'flex', 
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              border: `1px solid ${card.color}15`
            }}>
              {React.cloneElement(card.icon, { size: 20, color: card.color })}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="text-secondary mb-1" style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.title}</p>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 850, margin: 0, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.value}</h3>
              <p className="text-muted" style={{ fontSize: '0.65rem', marginTop: '4px', fontWeight: 600, opacity: 0.6 }}>{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ marginBottom: '32px' }}>
        {/* Expense Tracker */}
        <div className="glass-panel">
          <div className="flex justify-between items-center" style={{ marginBottom: '20px' }}>
            <h2 className="h3" style={{ margin: 0 }}>Operational Expenses</h2>
            <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => setShowExpenseModal(true)}>
              <Plus size={16} /> Add Expense
            </button>
          </div>
          <div className="flex flex-col gap-2" style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '8px' }}>
            {expenses.length === 0 ? (
              <p className="text-secondary" style={{ textAlign: 'center', padding: '24px 0' }}>No expenses recorded.</p>
            ) : (
              expenses.map(exp => (
                <div key={exp.id} className="flex justify-between items-center hover-lift" style={{ 
                  padding: '12px 16px', background: 'var(--subtle-bg)', borderRadius: '12px', border: '1px solid var(--subtle-border)' 
                }}>
                   <div style={{ flex: 1 }}>
                     <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem', marginBottom: '4px' }}>{exp.description}</div>
                     <span className="badge badge-info" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>{exp.category}</span>
                   </div>
                   <div className="flex items-center gap-4">
                     <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>LKR {Number(exp.amount).toLocaleString()}</span>
                     <button className="btn btn-secondary" style={{ padding: '6px', color: 'var(--danger)', background: 'transparent' }} onClick={() => deleteExpense(exp.id)}>
                       <Trash2 size={14} />
                     </button>
                   </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Lead Conversion Funnel */}
        <div className="glass-panel">
          <div className="flex items-center gap-2" style={{ marginBottom: '20px' }}>
            <Target size={20} color="var(--accent-primary)" />
            <h2 className="h3" style={{ margin: 0 }}>Sales Conversion Funnel</h2>
          </div>
          <div style={{ padding: '10px 0' }}>
            <FunnelRow label="Total Leads" count={totalLeads} color="var(--accent-primary)" total={totalLeads} />
            <FunnelRow label="Quotes Created" count={convertedLeads} color="var(--warning)" total={totalLeads} />
            <FunnelRow label="Active Customers" count={activeGyms} color="var(--success)" total={totalLeads} />
            
            <div style={{ marginTop: '32px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--success)' }}>{conversionRate}%</div>
              <p className="text-secondary">Lead to Quote Conversion Rate</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ marginBottom: '32px' }}>
        {/* Revenue Forecasting */}
        <div className="glass-panel">
          <div className="flex items-center gap-2" style={{ marginBottom: '16px' }}>
            <TrendingUp size={18} color="var(--success)" />
            <h2 className="h3" style={{ margin: 0 }}>Revenue Forecast</h2>
          </div>
          <div className="flex flex-col gap-2">
             {Object.entries(forecast).map(([period, amount]) => (
                <div key={period} className="flex justify-between items-center" style={{ padding: '10px 14px', background: 'var(--subtle-bg)', borderRadius: '10px' }}>
                   <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Next {period}</span>
                   <span style={{ fontWeight: 800, color: 'var(--success)', fontSize: '1rem' }}>LKR {amount.toLocaleString()}</span>
                </div>
             ))}
          </div>
        </div>

        {/* Expense Distribution */}
        <div className="glass-panel">
          <div className="flex items-center gap-2" style={{ marginBottom: '16px' }}>
            <AlertCircle size={18} color="var(--warning)" />
            <h2 className="h3" style={{ margin: 0 }}>Expense Distribution</h2>
          </div>
          {Object.keys(expenseByCategory).length === 0 ? (
            <p className="text-secondary" style={{ textAlign: 'center', padding: '16px 0', fontSize: '0.85rem' }}>No expense data.</p>
          ) : (
            <div className="flex flex-col gap-2">
               {Object.entries(expenseByCategory).map(([cat, amount]) => {
                 const pct = Math.round((amount / totalExpenses) * 100) || 0;
                 return (
                  <div key={cat} style={{ marginBottom: '4px' }}>
                    <div className="flex justify-between" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>
                       <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{cat}</span>
                       <span style={{ color: 'var(--text-muted)' }}>{pct}%</span>
                    </div>
                    <div style={{ height: '5px', background: 'var(--subtle-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                       <div style={{ height: '100%', width: `${pct}%`, background: 'var(--warning)', borderRadius: '4px' }}></div>
                    </div>
                  </div>
                 );
               })}
            </div>
          )}
        </div>

        {/* MoM Growth */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
          <h2 className="h3" style={{ marginBottom: '4px' }}>Revenue Growth</h2>
          <p className="text-secondary" style={{ fontSize: '0.7rem', marginBottom: '16px' }}>Monthly MoM Tracker</p>
          
          <div style={{ 
            width: '90px', height: '90px', borderRadius: '50%', 
            background: momGrowth >= 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(244, 63, 94, 0.1)',
            border: `2px solid ${momGrowth >= 0 ? 'var(--success)' : 'var(--danger)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: momGrowth >= 0 ? 'var(--success)' : 'var(--danger)',
            fontSize: '1.5rem', fontWeight: 900, fontFamily: 'var(--font-display)',
            boxShadow: `0 0 16px ${momGrowth >= 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(244, 63, 94, 0.15)'}`
          }}>
             {momGrowth > 0 ? '+' : ''}{momGrowth}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ marginBottom: '24px' }}>
        {/* Monthly Revenue Table */}
        <div className="glass-panel">
          <h2 className="h3" style={{ marginBottom: '16px' }}>Monthly Revenue (Paid)</h2>
          {monthlyData.length === 0 ? (
            <p className="text-secondary" style={{ textAlign: 'center', padding: '24px 0' }}>No paid invoices yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
               {monthlyData.map(row => (
                  <div key={row.label} className="flex justify-between items-center" style={{ 
                     padding: '16px', background: 'var(--subtle-bg)', borderRadius: '12px', border: '1px solid var(--subtle-border)' 
                  }}>
                     <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.label}</span>
                     <span style={{ fontWeight: 800, color: 'var(--success)' }}>LKR {row.total.toLocaleString()}</span>
                  </div>
               ))}
            </div>
          )}
        </div>

        {/* Top Clients */}
        <div className="glass-panel">
          <h2 className="h3" style={{ marginBottom: '16px' }}>Top Clients by Spend</h2>
          {topClients.length === 0 ? (
            <p className="text-secondary" style={{ textAlign: 'center', padding: '24px 0' }}>No paid invoices yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
               {topClients.map(([name, total]) => (
                  <div key={name} className="flex justify-between items-center" style={{ 
                     padding: '16px', background: 'var(--subtle-bg)', borderRadius: '12px', border: '1px solid var(--subtle-border)' 
                  }}>
                     <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{name}</span>
                     <span style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>LKR {total.toLocaleString()}</span>
                  </div>
               ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Overdue Invoices */}
        <div className="glass-panel">
          <h2 className="h3" style={{ marginBottom: '16px' }}>
            <span style={{ color: 'var(--danger)' }}>⚠ </span>Overdue Invoices
          </h2>
          {overdueInvoices.length === 0 ? (
            <p className="text-secondary" style={{ textAlign: 'center', padding: '24px 0' }}>No overdue invoices. </p>
          ) : (
            <div className="flex flex-col gap-2">
               {overdueInvoices.map(inv => {
                  const c = customers.find(c => c.id === inv.customerId);
                  return (
                    <div key={inv.id} className="flex justify-between items-center" style={{ 
                      padding: '16px', background: 'var(--subtle-bg)', borderRadius: '12px', border: '1px solid var(--subtle-border)' 
                    }}>
                       <div>
                         <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem', marginBottom: '2px' }}>#{inv.invoiceNumber}</div>
                         <div className="text-secondary" style={{ fontSize: '0.8rem' }}>{c?.gymName || 'Unknown Gym'}</div>
                       </div>
                       <span style={{ fontWeight: 800, color: 'var(--danger)' }}>LKR {Number(inv.amount).toLocaleString()}</span>
                    </div>
                  );
               })}
            </div>
          )}
        </div>

        {/* Quotes Pipeline */}
        <div className="glass-panel">
          <div className="flex items-center gap-2" style={{ marginBottom: '20px' }}>
            <FileText size={20} color="var(--accent-primary)" />
            <h2 className="h3" style={{ margin: 0 }}>Quotations Pipeline</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '12px' }}>
            {quotePipeline.map(({ label, count, color }) => (
              <div key={label} style={{
                textAlign: 'center', padding: '20px 12px',
                background: 'var(--subtle-bg)', borderRadius: '10px',
                border: `1px solid ${color}40`, minWidth: 0
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color }}>{count}</div>
                <div className="text-secondary" style={{ fontSize: '0.75rem', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '16px', padding: '12px', background: 'var(--subtle-bg)', borderRadius: '8px', textAlign: 'center' }}>
            <span className="text-secondary" style={{ fontSize: '0.85rem' }}>
              Pipeline Value: <strong style={{ color: 'var(--success)' }}>
                LKR {quotes.reduce((s, q) => s + Number(q.amount || 0), 0).toLocaleString()}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {showExpenseModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '24px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: 0, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="modal-header">
               <h2 className="h2" style={{ margin: 0, fontSize: '1.35rem' }}>Track Expense Request</h2>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              addExpense({ ...expenseForm, amount: Number(expenseForm.amount) });
              setShowExpenseModal(false);
              setExpenseForm({ description: '', amount: '', category: 'Operational' });
            }} className="modal-body">
              <div className="form-group mb-6">
                <label className="form-label" style={{ fontSize: '0.85rem' }}>Expense Description</label>
                <input required type="text" className="form-input" style={{ height: '44px' }} placeholder="e.g. AWS Hosting Bill" value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} />
              </div>
              <div className="form-group mb-6">
                <label className="form-label" style={{ fontSize: '0.85rem' }}>Budget Category</label>
                <select className="form-input" style={{ height: '44px' }} value={expenseForm.category} onChange={e => setExpenseForm({...expenseForm, category: e.target.value})}>
                  <option value="Operational">Operational (Server/SMS)</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Taxes">Taxes</option>
                  <option value="Staff">Staff/Salary</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group mb-6">
                <label className="form-label" style={{ fontSize: '0.85rem' }}>Billed Amount (LKR)</label>
                <input required type="number" className="form-input" style={{ height: '44px' }} value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} />
              </div>
              
              <div style={{ height: '1px', background: 'var(--panel-border)', margin: '0 0 32px 0' }}></div>

              <div className="flex justify-end gap-4 responsive-form-actions">
                <button type="button" className="btn btn-secondary" style={{ padding: '12px 24px', fontSize: '0.95rem' }} onClick={() => setShowExpenseModal(false)}>Discard</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '0.95rem' }}>Approve Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; padding: 20px !important; }
          .glass-panel { background: white !important; border: 1px solid #ccc !important; box-shadow: none !important; color: black !important; }
          .glass-panel * { color: black !important; }
          .text-secondary, .text-muted { color: #666 !important; }
          .badge { border: 1px solid #ccc !important; }
        }
      `}</style>
    </div>
  );
};

const FunnelRow = ({ label, count, color, total }) => {
  const width = total > 0 ? (count / total) * 100 : 0;
  return (
    <div style={{ marginBottom: '16px' }}>
      <div className="flex justify-between items-center" style={{ marginBottom: '6px', fontSize: '0.85rem' }}>
        <span className="text-secondary">{label}</span>
        <span style={{ fontWeight: 700, color }}>{count}</span>
      </div>
      <div style={{ height: '12px', background: 'var(--subtle-bg)', borderRadius: '20px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${width}%`, background: color, borderRadius: '20px', transition: '1s ease' }}></div>
      </div>
    </div>
  );
};

export default Reports;
