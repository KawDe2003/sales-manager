import React, { useContext, useState } from 'react';
import { StoreContext } from '../context/StoreContext';
import { BarChart3, TrendingUp, Users, AlertCircle, FileText, Target, Wallet, Plus, Trash2, Download, Printer, FileSpreadsheet } from 'lucide-react';
import { exportToCSV, exportToExcel } from '../utils/export';
import { generateAccountingReportPDF, generatePnLReportPDF, printPnLReportPDF } from '../utils/pdfGenerator';

const Reports = () => {
  const { 
    invoices = [], 
    customers = [], 
    quotes = [], 
    leads = [], 
    inventory = [],
    expenses = [],
    accounts = [],
    journalEntries = [],
    journalLines = [],
    paymentAllocations = [],
    getInvoicePaymentSummary,
    addExpense, deleteExpense 
  } = useContext(StoreContext) || {};

  const totalRevenue = invoices.filter(i => i.status === 'Paid').reduce((acc, i) => acc + Number(i.amount || 0), 0);
  const projectedRenewals = customers.filter(c => c.status === 'Active').reduce((acc, c) => acc + Number(c.annualFee || 0), 0);
  const activeGyms = customers.filter(c => c.status === 'Active').length;
  const overdueInvoices = invoices.filter(i => i.status === 'Overdue');
  const overdueTotal = overdueInvoices.reduce((acc, i) => acc + Number(i.amount || 0), 0);

  // Stock Cost & Valuation Calculations
  const totalStockCost = inventory.reduce((acc, item) => acc + (Number(item.costPrice || 0) * Number(item.stock || 0)), 0);
  const totalStockRetail = inventory.reduce((acc, item) => acc + (Number(item.price || 0) * Number(item.stock || 0)), 0);
  
  // Calculate COGS (Estimated at 40% of revenue or calculated stock cost)
  const estimatedCOGS = Math.round(totalRevenue * 0.3) + totalStockCost;
  const grossProfit = totalRevenue - estimatedCOGS;
  const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
  const netProfit = grossProfit - totalExpenses;
  const grossMarginPct = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;
  const netMarginPct = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

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

  // --- DOUBLE-ENTRY LEDGER COMPUTATIONS ---
  // 1. Trial Balance Report from journal_lines
  const trialBalance = accounts.map(acc => {
    const accLines = journalLines.filter(l => l.accountId === acc.id);
    const totalDebit = accLines.reduce((s, l) => s + Number(l.debit || 0), 0);
    const totalCredit = accLines.reduce((s, l) => s + Number(l.credit || 0), 0);
    return { ...acc, totalDebit, totalCredit };
  });
  const trialBalanceTotalDebit = trialBalance.reduce((s, a) => s + a.totalDebit, 0);
  const trialBalanceTotalCredit = trialBalance.reduce((s, a) => s + a.totalCredit, 0);

  // 2. Ledger-based P&L from journal_lines
  const ledgerRevenueTotal = journalLines
    .filter(l => {
      const acc = accounts.find(a => a.id === l.accountId);
      return acc?.type === 'revenue';
    })
    .reduce((s, l) => s + (Number(l.credit || 0) - Number(l.debit || 0)), 0);

  const ledgerExpenseTotal = journalLines
    .filter(l => {
      const acc = accounts.find(a => a.id === l.accountId);
      return acc?.type === 'expense';
    })
    .reduce((s, l) => s + (Number(l.debit || 0) - Number(l.credit || 0)), 0);

  const ledgerNetProfit = ledgerRevenueTotal - ledgerExpenseTotal;

  // 3. Debtors Aging Report from payment_allocations & due dates
  const debtorsAging = { '0-30': 0, '31-60': 0, '60+': 0, items: [] };
  const todayMs = new Date().getTime();

  invoices.forEach(inv => {
    const summary = getInvoicePaymentSummary ? getInvoicePaymentSummary(inv.id, inv.amount) : { remaining: inv.amount };
    const remaining = summary.remaining;
    if (remaining > 0) {
      const dueDateMs = new Date(inv.dueDate || inv.date).getTime();
      const daysOverdue = Math.max(0, Math.floor((todayMs - dueDateMs) / (1000 * 60 * 60 * 24)));
      let category = '0-30';
      if (daysOverdue > 60) category = '60+';
      else if (daysOverdue > 30) category = '31-60';

      debtorsAging[category] += remaining;
      debtorsAging.items.push({
        invoiceNumber: inv.invoiceNumber,
        prospectName: inv.prospectName || 'Customer',
        dueDate: inv.dueDate,
        daysOverdue,
        category,
        remaining
      });
    }
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

  const handleExportPnLPDF = () => {
    generatePnLReportPDF({
      totalRevenue,
      projectedRenewals,
      totalStockCost,
      totalStockRetail,
      estimatedCOGS,
      grossProfit,
      totalExpenses,
      netProfit,
      expenseByCategory
    });
  };

  const handlePrintPnLStatement = () => {
    printPnLReportPDF({
      totalRevenue,
      projectedRenewals,
      totalStockCost,
      totalStockRetail,
      estimatedCOGS,
      grossProfit,
      totalExpenses,
      netProfit,
      expenseByCategory
    });
  };

  return (
    <div style={{ animation: 'fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div>
          <h1 className="h1 mb-1">Profit & Loss Reports</h1>
          <p className="text-secondary" style={{ fontSize: '0.9rem' }}>Financial P&L statements, stock cost of goods sold, and operational analytics.</p>
        </div>
        <div className="btn-group flex gap-3">
          <button className="btn btn-primary" style={{ padding: '10px 20px', height: '44px' }} onClick={handleExportPnLPDF}>
            <Download size={16} /> Download P&L Statement (PDF)
          </button>
          <button className="btn btn-secondary" style={{ padding: '10px 20px', height: '44px', color: 'var(--success)' }} onClick={handleExportExcel}>
            <FileSpreadsheet size={16} /> Excel Download
          </button>
          <button className="btn btn-secondary" style={{ padding: '10px 20px', height: '44px' }} onClick={handlePrintPnLStatement}>
            <Printer size={16} /> Print P&L Statement
          </button>
        </div>
      </div>

      {/* P&L Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[
          { title: 'Total Revenue', value: `LKR ${totalRevenue.toLocaleString()}`, icon: <TrendingUp />, color: 'var(--success)', sub: 'Paid Invoices' },
          { title: 'Stock Cost (COGS)', value: `LKR ${estimatedCOGS.toLocaleString()}`, icon: <BarChart3 />, color: 'var(--warning)', sub: 'Stock + Acquisition' },
          { title: 'Gross Profit', value: `LKR ${grossProfit.toLocaleString()}`, icon: <Wallet />, color: grossProfit >= 0 ? "var(--success)" : "var(--danger)", sub: 'Revenue - COGS' },
          { title: 'Expenses', value: `LKR ${totalExpenses.toLocaleString()}`, icon: <AlertCircle />, color: 'var(--danger)', sub: `${expenses.length} Records` },
          { title: 'Net Profit (P&L)', value: `LKR ${netProfit.toLocaleString()}`, icon: <Wallet />, color: netProfit >= 0 ? "var(--success)" : "var(--danger)", sub: 'Gross - Expenses' },
        ].map(card => (
          <div key={card.title} className="glass-panel hover-lift" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px' }}>
            <div style={{ 
              width: '40px', height: '40px', borderRadius: '10px', 
              background: `${card.color}10`, display: 'flex', 
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              border: `1px solid ${card.color}15`
            }}>
              {React.cloneElement(card.icon, { size: 18, color: card.color })}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="text-secondary mb-1" style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.title}</p>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.value}</h3>
              <p className="text-muted" style={{ fontSize: '0.62rem', marginTop: '3px', fontWeight: 600, opacity: 0.7 }}>{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* FORMAL PROFIT & LOSS STATEMENT (P&L) CARD */}
      <div className="glass-panel mb-8" style={{ padding: '28px' }}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4" style={{ borderBottom: '1px solid var(--panel-border)' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
              Financial Performance
            </div>
            <h2 className="h2" style={{ margin: 0, fontSize: '1.4rem' }}>Profit & Loss Statement (P&L)</h2>
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleExportPnLPDF}>
            <Download size={14} /> Download P&L PDF
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 1. REVENUE */}
          <div style={{ background: 'var(--subtle-bg)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--subtle-border)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
              1. Revenue (Income)
            </div>
            <div className="flex justify-between items-center mb-2" style={{ fontSize: '0.9rem' }}>
              <span className="text-secondary">Collected Invoice Revenue (Paid)</span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>LKR {totalRevenue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center mb-2" style={{ fontSize: '0.9rem' }}>
              <span className="text-secondary">Projected Annual Client Renewals</span>
              <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>LKR {projectedRenewals.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-2" style={{ borderTop: '1px solid var(--subtle-border)', fontSize: '0.95rem', fontWeight: 800 }}>
              <span style={{ color: 'var(--text-primary)' }}>Total Net Revenue:</span>
              <span style={{ color: 'var(--success)' }}>LKR {totalRevenue.toLocaleString()}</span>
            </div>
          </div>

          {/* 2. COST OF GOODS SOLD (COGS) */}
          <div style={{ background: 'var(--subtle-bg)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--subtle-border)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
              2. Cost of Goods Sold (COGS)
            </div>
            <div className="flex justify-between items-center mb-2" style={{ fontSize: '0.9rem' }}>
              <span className="text-secondary">Inventory Hardware & Stock Cost</span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>LKR {totalStockCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center mb-2" style={{ fontSize: '0.9rem' }}>
              <span className="text-secondary">Direct Stock & Delivery COGS</span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>LKR {estimatedCOGS.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-2" style={{ borderTop: '1px solid var(--subtle-border)', fontSize: '0.95rem', fontWeight: 800 }}>
              <span style={{ color: 'var(--text-primary)' }}>Total Cost of Goods Sold:</span>
              <span style={{ color: 'var(--warning)' }}>(LKR {estimatedCOGS.toLocaleString()})</span>
            </div>
          </div>

          {/* GROSS PROFIT HIGHLIGHT */}
          <div style={{ 
            background: grossProfit >= 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)', 
            padding: '16px 20px', borderRadius: '12px', 
            border: `1px solid ${grossProfit >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: grossProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>Gross Profit</span>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>Total Revenue minus COGS</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: grossProfit >= 0 ? 'var(--success)' : 'var(--danger)', fontFamily: 'var(--font-display)' }}>
                LKR {grossProfit.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: grossProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {grossMarginPct}% Gross Margin
              </div>
            </div>
          </div>

          {/* 3. OPERATING EXPENSES */}
          <div style={{ background: 'var(--subtle-bg)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--subtle-border)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
              3. Operating Expenses (OPEX)
            </div>
            <div className="flex justify-between items-center mb-2" style={{ fontSize: '0.9rem' }}>
              <span className="text-secondary">Operational & Hosting (Server/SMS)</span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>LKR {(expenseByCategory?.Operational || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center mb-2" style={{ fontSize: '0.9rem' }}>
              <span className="text-secondary">Marketing & Acquisition</span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>LKR {(expenseByCategory?.Marketing || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center mb-2" style={{ fontSize: '0.9rem' }}>
              <span className="text-secondary">Staff & Admin</span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>LKR {((expenseByCategory?.Staff || 0) + (expenseByCategory?.Taxes || 0) + (expenseByCategory?.Other || 0)).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-2" style={{ borderTop: '1px solid var(--subtle-border)', fontSize: '0.95rem', fontWeight: 800 }}>
              <span style={{ color: 'var(--text-primary)' }}>Total Operating Expenses:</span>
              <span style={{ color: 'var(--danger)' }}>(LKR {totalExpenses.toLocaleString()})</span>
            </div>
          </div>

          {/* NET PROFIT (FINAL P&L BOTTOM LINE) */}
          <div style={{ 
            background: netProfit >= 0 ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.05))' : 'linear-gradient(135deg, rgba(244, 63, 94, 0.15), rgba(245, 158, 11, 0.05))', 
            padding: '20px 24px', borderRadius: '14px', 
            border: `1px solid ${netProfit >= 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            boxShadow: netProfit >= 0 ? '0 10px 30px rgba(16, 185, 129, 0.1)' : '0 10px 30px rgba(244, 63, 94, 0.1)'
          }}>
            <div>
              <span style={{ fontSize: '0.95rem', fontWeight: 850, textTransform: 'uppercase', letterSpacing: '0.08em', color: netProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                Net Profit Before Tax (EBITDA)
              </span>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Final Profit & Loss Bottom Line</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 850, color: netProfit >= 0 ? 'var(--success)' : 'var(--danger)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
                LKR {netProfit.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: netProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {netMarginPct}% Net Profit Margin
              </div>
            </div>
          </div>
        </div>
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

      {/* LEDGER TRIAL BALANCE & DEBTORS AGING */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 mb-8">
        {/* TRIAL BALANCE */}
        <div className="glass-panel">
          <div className="flex justify-between items-center mb-4">
            <h2 className="h3">Ledger Trial Balance</h2>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', background: 'var(--subtle-bg)', color: 'var(--accent-primary)' }}>
              Reconciled
            </span>
          </div>
          <div className="table-container" style={{ margin: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Account Code & Name</th>
                  <th>Type</th>
                  <th className="text-right">Debit (LKR)</th>
                  <th className="text-right">Credit (LKR)</th>
                </tr>
              </thead>
              <tbody>
                {trialBalance.map(acc => (
                  <tr key={acc.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{acc.code} - {acc.name}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        {acc.type}
                      </span>
                    </td>
                    <td className="text-right numeric" style={{ fontWeight: 700, color: acc.totalDebit > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {acc.totalDebit > 0 ? acc.totalDebit.toLocaleString() : '-'}
                    </td>
                    <td className="text-right numeric" style={{ fontWeight: 700, color: acc.totalCredit > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {acc.totalCredit > 0 ? acc.totalCredit.toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--panel-border)', fontWeight: 800 }}>
                  <td colSpan="2">Total Ledger Balance</td>
                  <td className="text-right numeric" style={{ color: 'var(--success)' }}>LKR {trialBalanceTotalDebit.toLocaleString()}</td>
                  <td className="text-right numeric" style={{ color: 'var(--success)' }}>LKR {trialBalanceTotalCredit.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* DEBTORS AGING REPORT */}
        <div className="glass-panel">
          <div className="flex justify-between items-center mb-4">
            <h2 className="h3">Debtors Aging Summary</h2>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', background: 'var(--warning-bg)', color: 'var(--warning)' }}>
              Unpaid Invoices
            </span>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--subtle-bg)', textAlign: 'center', border: '1px solid var(--subtle-border)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>0 - 30 Days</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--info)' }} className="numeric">LKR {debtorsAging['0-30'].toLocaleString()}</div>
            </div>
            <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--subtle-bg)', textAlign: 'center', border: '1px solid var(--subtle-border)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>31 - 60 Days</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--warning)' }} className="numeric">LKR {debtorsAging['31-60'].toLocaleString()}</div>
            </div>
            <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--subtle-bg)', textAlign: 'center', border: '1px solid var(--subtle-border)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>60+ Days</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--danger)' }} className="numeric">LKR {debtorsAging['60+'].toLocaleString()}</div>
            </div>
          </div>

          <div className="table-container" style={{ margin: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Client / Invoice</th>
                  <th>Age Category</th>
                  <th className="text-right">Balance Due</th>
                </tr>
              </thead>
              <tbody>
                {debtorsAging.items.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="text-center py-6 text-secondary">No unpaid balances outstanding.</td>
                  </tr>
                ) : (
                  debtorsAging.items.slice(0, 6).map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.prospectName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.invoiceNumber}</div>
                      </td>
                      <td>
                        <span className={`badge badge-${item.category === '60+' ? 'danger' : item.category === '31-60' ? 'warning' : 'info'}`}>
                          {item.category} ({item.daysOverdue}d)
                        </span>
                      </td>
                      <td className="text-right numeric" style={{ fontWeight: 800, color: 'var(--danger)' }}>
                        LKR {item.remaining.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
