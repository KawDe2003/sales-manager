import React, { useContext, useState, useMemo } from 'react';
import { StoreContext } from '../context/StoreContext';
import { 
  BarChart3, TrendingUp, Users, AlertCircle, FileText, Target, Wallet, 
  Plus, Trash2, Download, Printer, FileSpreadsheet, Scale, CheckCircle2, 
  Layers, RefreshCw, Calendar, ArrowUpRight, DollarSign, Building2, ShieldCheck, 
  HelpCircle, UserCheck, Compass, Clock, Award
} from 'lucide-react';
import { exportToCSV, exportToExcel } from '../utils/export';
import { 
  generateSLFRSFinancialStatementsPDF,
  generateSalesReportPDF,
  generatePaymentReportPDF,
  generateDebtorReportPDF,
  generateRenewalReportPDF,
  generateStaffPerformanceReportPDF,
  generateLeadSourceReportPDF
} from '../utils/pdfGenerator';
import { generatePnLStatement, generateBalanceSheet, generateCashFlowStatement } from '../utils/slfrsEngine';
import DatePicker from '../components/DatePicker';
import CustomSelect from '../components/CustomSelect';

const Reports = () => {
  const { 
    invoices = [], 
    customers = [], 
    quotes = [], 
    payments = [],
    leads = [], 
    inventory = [],
    expenses = [],
    accounts = [],
    journalEntries = [],
    journalLines = [],
    teamMembers = [],
    smsConfig = {}
  } = useContext(StoreContext) || {};

  // Active Tab: 'sales' | 'payments' | 'debtors' | 'renewals' | 'staff_perf' | 'lead_source' | 'slfrs'
  const [activeTab, setActiveTab] = useState('sales');

  // Shared Reporting Period Controls
  const [periodPreset, setPeriodPreset] = useState('this_year'); // 'this_month' | 'this_quarter' | 'this_year' | 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Dynamic Date Range Calculation
  const dateRange = useMemo(() => {
    const now = new Date();
    let start = '';
    let end = '';
    let priorStart = '';
    let priorEnd = '';
    let periodLabel = 'This Year (2026)';

    if (periodPreset === 'this_month') {
      const yr = now.getFullYear();
      const mo = now.getMonth();
      start = `${yr}-${String(mo + 1).padStart(2, '0')}-01`;
      end = new Date(yr, mo + 1, 0).toISOString().split('T')[0];

      const pMo = mo === 0 ? 11 : mo - 1;
      const pYr = mo === 0 ? yr - 1 : yr;
      priorStart = `${pYr}-${String(pMo + 1).padStart(2, '0')}-01`;
      priorEnd = new Date(pYr, pMo + 1, 0).toISOString().split('T')[0];
      periodLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    } else if (periodPreset === 'this_quarter') {
      const yr = now.getFullYear();
      const q = Math.floor(now.getMonth() / 3);
      start = `${yr}-${String(q * 3 + 1).padStart(2, '0')}-01`;
      end = new Date(yr, (q + 1) * 3, 0).toISOString().split('T')[0];

      const pYr = q === 0 ? yr - 1 : yr;
      const pQ = q === 0 ? 3 : q - 1;
      priorStart = `${pYr}-${String(pQ * 3 + 1).padStart(2, '0')}-01`;
      priorEnd = new Date(pYr, (pQ + 1) * 3, 0).toISOString().split('T')[0];
      periodLabel = `Q${q + 1} ${yr}`;
    } else if (periodPreset === 'this_year') {
      const yr = now.getFullYear();
      start = `${yr}-01-01`;
      end = `${yr}-12-31`;
      priorStart = `${yr - 1}-01-01`;
      priorEnd = `${yr - 1}-12-31`;
      periodLabel = `Financial Year ${yr}`;
    } else if (periodPreset === 'custom') {
      start = customStartDate;
      end = customEndDate;
      periodLabel = `${start || 'Start'} to ${end || 'End'}`;
    }

    return { startDate: start, endDate: end, priorStartDate: priorStart, priorEndDate: priorEnd, periodLabel };
  }, [periodPreset, customStartDate, customEndDate]);

  // Helper date filter
  const isDateInRange = (dateStr) => {
    if (!dateStr || !dateRange.startDate || !dateRange.endDate) return true;
    const d = dateStr.slice(0, 10);
    return d >= dateRange.startDate && d <= dateRange.endDate;
  };

  // --- 1. SALES REPORT METRICS ---
  const salesData = useMemo(() => {
    const periodQuotes = quotes.filter(q => isDateInRange(q.date));
    const periodInvoices = invoices.filter(i => isDateInRange(i.date));
    const periodPayments = payments.filter(p => isDateInRange(p.timestamp));

    const totalQuotes = periodQuotes.length;
    const acceptedQuotes = periodQuotes.filter(q => q.status === 'Accepted' || q.status === 'Converted to Invoice').length;
    const rejectedQuotes = periodQuotes.filter(q => q.status === 'Rejected').length;
    const conversionRate = totalQuotes > 0 ? ((acceptedQuotes / totalQuotes) * 100).toFixed(1) : 0;

    const totalInvoiced = periodInvoices.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const totalCollected = periodPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const totalOutstanding = Math.max(0, totalInvoiced - totalCollected);

    return {
      periodQuotes,
      periodInvoices,
      periodPayments,
      totalQuotes,
      acceptedQuotes,
      rejectedQuotes,
      conversionRate,
      totalInvoiced,
      totalCollected,
      totalOutstanding
    };
  }, [quotes, invoices, payments, dateRange]);

  // --- 2. PAYMENT REPORT DATA ---
  const paymentReportData = useMemo(() => {
    return payments
      .filter(p => isDateInRange(p.timestamp))
      .map(p => {
        const cust = customers.find(c => c.id === p.customerId);
        const inv = invoices.find(i => i.id === p.documentId);
        return {
          id: p.id,
          receiptNumber: p.receiptNumber || 'REC',
          date: p.timestamp ? p.timestamp.slice(0, 10) : '',
          customerName: cust?.gymName || 'Valued Customer',
          invoiceNumber: inv?.invoiceNumber || p.invoiceNumber || 'INV',
          method: p.method || 'Cash',
          reference: p.reference || '—',
          amount: Number(p.amount) || 0,
          recordedBy: p.recordedBy || 'Staff'
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [payments, customers, invoices, dateRange]);

  // --- 3. DEBTOR REPORT DATA ---
  const debtorReportData = useMemo(() => {
    const list = [];
    const now = new Date();

    invoices.forEach(inv => {
      if (inv.status === 'Paid' || inv.status === 'Closed' || inv.status === 'Cancelled') return;

      const cust = customers.find(c => c.id === inv.customerId || c.gymName === inv.prospectName) || {
        gymName: inv.prospectName || 'Valued Customer'
      };

      const invPayments = payments.filter(p => p.documentId === inv.id);
      const paid = invPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const total = Number(inv.amount) || 0;
      const outstanding = Math.max(0, total - paid);

      if (outstanding <= 0) return;

      const dueDate = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.date);
      const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

      list.push({
        customer: cust,
        invoice: inv,
        total,
        paid,
        outstanding,
        daysOverdue,
        dueDateStr: inv.dueDate || 'N/A'
      });
    });

    return list;
  }, [invoices, customers, payments]);

  // --- 4. RENEWAL REPORT DATA ---
  const renewalReportData = useMemo(() => {
    const now = new Date();
    return customers
      .filter(c => c.renewalFrequency && c.renewalFrequency !== 'None')
      .map(c => {
        const renDate = c.renewalDate ? new Date(c.renewalDate) : null;
        const diffDays = renDate ? Math.ceil((renDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        let status = c.renewalStatus || 'Active';
        if (renDate && diffDays < 0) status = 'Overdue';
        else if (renDate && diffDays <= 30) status = 'Upcoming';

        return {
          id: c.id,
          code: c.code || c.id,
          customerName: c.gymName,
          contactPerson: c.name,
          phone: c.phone,
          renewalFrequency: c.renewalFrequency,
          renewalDate: c.renewalDate || 'N/A',
          annualFee: Number(c.annualFee) || 350000,
          status,
          daysUntil: diffDays
        };
      })
      .sort((a, b) => new Date(a.renewalDate) - new Date(b.renewalDate));
  }, [customers]);

  // --- 5. STAFF PERFORMANCE REPORT DATA ---
  const staffPerformanceData = useMemo(() => {
    const staffList = teamMembers.length > 0 ? teamMembers : [
      { id: '1', name: 'System Administrator' },
      { id: '2', name: 'Sales Executive' },
      { id: '3', name: 'Senior Accountant' }
    ];

    return staffList.map(member => {
      // Find quotes associated with member or all if single user
      const memberQuotes = quotes.filter(q => q.createdBy === member.id || q.createdBy === member.name || !q.createdBy);
      const totalQuotes = memberQuotes.length;
      const acceptedQuotes = memberQuotes.filter(q => q.status === 'Accepted' || q.status === 'Converted to Invoice').length;
      const rejectedQuotes = memberQuotes.filter(q => q.status === 'Rejected').length;
      const conversionRate = totalQuotes > 0 ? ((acceptedQuotes / totalQuotes) * 100).toFixed(1) : 0;

      const memberInvoices = invoices.filter(i => i.createdBy === member.id || !i.createdBy);
      const totalInvoiced = memberInvoices.reduce((s, i) => s + (Number(i.amount) || 0), 0);

      const memberPayments = payments.filter(p => p.recordedBy === member.name || !p.recordedBy);
      const totalCollected = memberPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

      return {
        staffName: member.name,
        role: member.role || 'Staff',
        totalQuotes,
        acceptedQuotes,
        rejectedQuotes,
        conversionRate,
        totalInvoiced,
        totalCollected
      };
    });
  }, [teamMembers, quotes, invoices, payments]);

  // --- 6. LEAD SOURCE REPORT DATA ---
  const leadSourceData = useMemo(() => {
    const sources = ['Walk-in', 'Referral', 'Social Media', 'Website', 'Phone Call', 'Other'];
    return sources.map(source => {
      const srcCustomers = customers.filter(c => (c.leadSource || 'Walk-in') === source);
      const custIds = new Set(srcCustomers.map(c => c.id));
      const custNames = new Set(srcCustomers.map(c => c.gymName));

      const srcInvoices = invoices.filter(i => custIds.has(i.customerId) || custNames.has(i.prospectName));
      const totalRevenue = srcInvoices.reduce((s, i) => s + (Number(i.amount) || 0), 0);

      return {
        source,
        customerCount: srcCustomers.length,
        totalRevenue,
        avgDealSize: srcCustomers.length > 0 ? Math.round(totalRevenue / srcCustomers.length) : 0
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [customers, invoices]);

  // SLFRS STATEMENTS
  const pnlStatement = useMemo(() => {
    return generatePnLStatement({
      accounts,
      journalEntries,
      journalLines,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      priorStartDate: dateRange.priorStartDate,
      priorEndDate: dateRange.priorEndDate
    });
  }, [accounts, journalEntries, journalLines, dateRange]);

  const balanceSheet = useMemo(() => {
    return generateBalanceSheet({
      accounts,
      journalEntries,
      journalLines,
      endDate: dateRange.endDate,
      pnlProfitForPeriod: pnlStatement.current.profitForPeriod
    });
  }, [accounts, journalEntries, journalLines, dateRange, pnlStatement]);

  const cashFlowStatement = useMemo(() => {
    return generateCashFlowStatement({
      accounts,
      journalEntries,
      journalLines,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      pnlStatement,
      balanceSheet
    });
  }, [accounts, journalEntries, journalLines, dateRange, pnlStatement, balanceSheet]);

  const handleExportActivePDF = () => {
    if (activeTab === 'sales') {
      generateSalesReportPDF(salesData, dateRange.periodLabel);
    } else if (activeTab === 'payments') {
      generatePaymentReportPDF(paymentReportData, dateRange.periodLabel);
    } else if (activeTab === 'debtors') {
      const tot = debtorReportData.reduce((s, d) => s + d.outstanding, 0);
      generateDebtorReportPDF(debtorReportData, tot);
    } else if (activeTab === 'renewals') {
      generateRenewalReportPDF(renewalReportData, dateRange.periodLabel);
    } else if (activeTab === 'staff_perf') {
      generateStaffPerformanceReportPDF(staffPerformanceData, dateRange.periodLabel);
    } else if (activeTab === 'lead_source') {
      generateLeadSourceReportPDF(leadSourceData, dateRange.periodLabel);
    } else if (activeTab === 'slfrs') {
      generateSLFRSFinancialStatementsPDF({
        companyName: smsConfig.companyName || 'Seynex Technology (Pvt) Ltd',
        periodLabel: dateRange.periodLabel,
        pnl: pnlStatement,
        balanceSheet,
        cashFlow: cashFlowStatement
      });
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1)', paddingBottom: '40px' }}>
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div style={{ padding: '10px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
              <Scale size={24} color="var(--accent-primary)" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Enterprise Intelligence</span>
                <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Live Database Connected</span>
              </div>
              <h1 className="h1" style={{ margin: 0 }}>Business Reports & Analytics</h1>
            </div>
          </div>
          <p className="text-secondary" style={{ fontSize: '0.9rem', margin: 0 }}>
            Real-time sales, collections, aging debtor ledgers, recurring renewals, and audit-ready SLFRS financial statements.
          </p>
        </div>

        {/* EXPORT ACTION BUTTON */}
        <div className="flex items-center gap-3">
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={handleExportActivePDF}
            style={{ padding: '10px 20px', fontSize: '0.88rem', gap: '8px', fontWeight: 800 }}
          >
            <Download size={16} /> Export Active Report PDF
          </button>
        </div>
      </div>

      {/* SHARED REPORTING PERIOD SELECTOR BAR */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar size={18} color="var(--accent-primary)" />
            <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Reporting Period:</span>
            <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>{dateRange.periodLabel}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {[
              { id: 'this_month', label: 'This Month' },
              { id: 'this_quarter', label: 'This Quarter' },
              { id: 'this_year', label: 'This Year (2026)' },
              { id: 'custom', label: 'Custom Range' }
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriodPreset(p.id)}
                className={`btn ${periodPreset === p.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 14px', fontSize: '0.78rem', borderRadius: '8px' }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {periodPreset === 'custom' && (
          <div className="flex items-center gap-4 pt-3 flex-wrap" style={{ borderTop: '1px solid var(--panel-border)', marginTop: '8px' }}>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Start Date:</span>
              <div style={{ width: '180px' }}>
                <DatePicker value={customStartDate} onChange={setCustomStartDate} placeholder="Start Date" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>End Date:</span>
              <div style={{ width: '180px' }}>
                <DatePicker value={customEndDate} onChange={setCustomEndDate} placeholder="End Date" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* REPORT MODULE NAVIGATION TABS */}
      <div className="glass-panel" style={{ padding: '6px', marginBottom: '24px', display: 'flex', gap: '6px', overflowX: 'auto' }}>
        {[
          { id: 'sales', label: 'Sales Report', icon: TrendingUp },
          { id: 'payments', label: 'Payment Ledger', icon: DollarSign },
          { id: 'debtors', label: 'Debtors & Aging', icon: AlertCircle },
          { id: 'renewals', label: 'Renewals & Recurring', icon: Clock },
          { id: 'staff_perf', label: 'Staff Performance', icon: UserCheck },
          { id: 'lead_source', label: 'Lead Source ROI', icon: Compass },
          { id: 'slfrs', label: 'SLFRS Financials', icon: Scale }
        ].map(t => (
          <button
            key={t.id}
            type="button"
            className={`btn ${activeTab === t.id ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '10px 14px', fontSize: '0.84rem', borderRadius: '10px', justifyContent: 'center', whiteSpace: 'nowrap', gap: '6px' }}
            onClick={() => setActiveTab(t.id)}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT 1: SALES REPORT */}
      {activeTab === 'sales' && (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div className="glass-panel" style={{ padding: '18px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Quotations Issued</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '4px' }}>{salesData.totalQuotes}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{salesData.acceptedQuotes} Accepted • {salesData.rejectedQuotes} Rejected</div>
            </div>

            <div className="glass-panel" style={{ padding: '18px', borderLeft: '4px solid var(--accent-primary)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Conversion Rate</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--accent-primary)', marginTop: '4px' }}>{salesData.conversionRate}%</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Accepted / Total Issued</div>
            </div>

            <div className="glass-panel" style={{ padding: '18px', borderLeft: '4px solid var(--success)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Total Invoiced</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '4px', fontFamily: 'var(--font-display)' }}>
                LKR {salesData.totalInvoiced.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: '4px' }}>Collected: LKR {salesData.totalCollected.toLocaleString()}</div>
            </div>

            <div className="glass-panel" style={{ padding: '18px', borderLeft: '4px solid var(--danger)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Outstanding Receivables</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--danger)', marginTop: '4px', fontFamily: 'var(--font-display)' }}>
                LKR {salesData.totalOutstanding.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Net Pending Balance</div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="h3" style={{ margin: 0 }}>Period Invoices ({salesData.periodInvoices.length})</h3>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Total (LKR)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {salesData.periodInvoices.map(inv => (
                    <tr key={inv.id}>
                      <td style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>#{inv.invoiceNumber}</td>
                      <td>{inv.date}</td>
                      <td style={{ fontWeight: 700 }}>{inv.prospectName}</td>
                      <td style={{ fontWeight: 800 }}>LKR {(Number(inv.amount) || 0).toLocaleString()}</td>
                      <td><span className={`badge badge-${inv.status === 'Paid' ? 'success' : 'warning'}`}>{inv.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: PAYMENT REPORT */}
      {activeTab === 'payments' && (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--panel-border)' }}>
            <h3 className="h3" style={{ margin: 0 }}>Payments Collected ({paymentReportData.length})</h3>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Invoice Ref</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th>Amount</th>
                  <th>Recorded By</th>
                </tr>
              </thead>
              <tbody>
                {paymentReportData.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>{p.receiptNumber}</td>
                    <td>{p.date}</td>
                    <td style={{ fontWeight: 700 }}>{p.customerName}</td>
                    <td>#{p.invoiceNumber}</td>
                    <td><span className="badge badge-neutral">{p.method}</span></td>
                    <td>{p.reference}</td>
                    <td style={{ fontWeight: 850, color: 'var(--success)' }}>LKR {p.amount.toLocaleString()}</td>
                    <td>{p.recordedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: DEBTOR REPORT */}
      {activeTab === 'debtors' && (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="h3" style={{ margin: 0 }}>Debtors & Overdue Aging List ({debtorReportData.length})</h3>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Invoice #</th>
                  <th>Due Date</th>
                  <th>Invoice Total</th>
                  <th>Paid</th>
                  <th>Outstanding</th>
                  <th>Overdue Status</th>
                </tr>
              </thead>
              <tbody>
                {debtorReportData.map((d, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 800 }}>{d.customer.gymName}</td>
                    <td style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>#{d.invoice.invoiceNumber}</td>
                    <td>{d.dueDateStr}</td>
                    <td>LKR {d.total.toLocaleString()}</td>
                    <td>LKR {d.paid.toLocaleString()}</td>
                    <td style={{ fontWeight: 850, color: 'var(--danger)' }}>LKR {d.outstanding.toLocaleString()}</td>
                    <td>
                      {d.daysOverdue > 0 ? (
                        <span className="badge badge-danger">{d.daysOverdue} days overdue</span>
                      ) : (
                        <span className="badge badge-neutral">Current</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: RENEWAL REPORT */}
      {activeTab === 'renewals' && (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--panel-border)' }}>
            <h3 className="h3" style={{ margin: 0 }}>Recurring Billing & Renewal Schedule ({renewalReportData.length})</h3>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Frequency</th>
                  <th>Next Renewal Date</th>
                  <th>Annual / Cycle Fee</th>
                  <th>Renewal Status</th>
                </tr>
              </thead>
              <tbody>
                {renewalReportData.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 800 }}>{r.customerName}</td>
                    <td>{r.contactPerson} • {r.phone}</td>
                    <td><span className="badge badge-primary">{r.renewalFrequency}</span></td>
                    <td style={{ fontWeight: 700 }}>{r.renewalDate}</td>
                    <td style={{ fontWeight: 800 }}>LKR {r.annualFee.toLocaleString()}</td>
                    <td>
                      <span className={`badge badge-${r.status === 'Overdue' ? 'danger' : r.status === 'Upcoming' ? 'warning' : 'success'}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: STAFF PERFORMANCE REPORT */}
      {activeTab === 'staff_perf' && (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--panel-border)' }}>
            <h3 className="h3" style={{ margin: 0 }}>Staff Sales Performance & Conversion Tracking</h3>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Role</th>
                  <th>Quotes Created</th>
                  <th>Quotes Accepted</th>
                  <th>Quotes Rejected</th>
                  <th>Conversion Rate</th>
                  <th>Total Invoiced (LKR)</th>
                  <th>Total Collected (LKR)</th>
                </tr>
              </thead>
              <tbody>
                {staffPerformanceData.map((s, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{s.staffName}</td>
                    <td><span className="badge badge-neutral">{s.role}</span></td>
                    <td style={{ fontWeight: 700 }}>{s.totalQuotes}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 700 }}>{s.acceptedQuotes}</td>
                    <td style={{ color: 'var(--danger)', fontWeight: 700 }}>{s.rejectedQuotes}</td>
                    <td style={{ fontWeight: 850, color: 'var(--accent-primary)' }}>{s.conversionRate}%</td>
                    <td style={{ fontWeight: 800 }}>LKR {s.totalInvoiced.toLocaleString()}</td>
                    <td style={{ fontWeight: 800, color: 'var(--success)' }}>LKR {s.totalCollected.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 6: LEAD SOURCE REPORT */}
      {activeTab === 'lead_source' && (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--panel-border)' }}>
            <h3 className="h3" style={{ margin: 0 }}>Lead Source Breakdown & Marketing ROI</h3>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Lead Origin Channel</th>
                  <th>Acquired Customers</th>
                  <th>Total Revenue Generated (LKR)</th>
                  <th>Average Deal Size (LKR)</th>
                </tr>
              </thead>
              <tbody>
                {leadSourceData.map((l, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{l.source}</td>
                    <td style={{ fontWeight: 700 }}>{l.customerCount} Customers</td>
                    <td style={{ fontWeight: 850, color: 'var(--success)', fontFamily: 'var(--font-display)' }}>
                      LKR {l.totalRevenue.toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>
                      LKR {l.avgDealSize.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 7: SLFRS STATEMENTS */}
      {activeTab === 'slfrs' && (
        <div>
          <div className="glass-panel mb-6" style={{ padding: '24px' }}>
            <h3 className="h3" style={{ marginBottom: '16px' }}>Statement of Profit or Loss (LKAS 1)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="flex justify-between py-2 border-b border-panel">
                <span style={{ fontWeight: 700 }}>Revenue from Contracts with Customers</span>
                <span style={{ fontWeight: 800 }}>LKR {pnlStatement.current.revenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-panel">
                <span style={{ color: 'var(--text-muted)' }}>Cost of Sales</span>
                <span style={{ color: 'var(--danger)' }}>(LKR {Math.abs(pnlStatement.current.costOfSales).toLocaleString()})</span>
              </div>
              <div className="flex justify-between py-2 border-b border-panel" style={{ background: 'var(--subtle-bg)' }}>
                <span style={{ fontWeight: 900 }}>GROSS PROFIT</span>
                <span style={{ fontWeight: 900, color: 'var(--accent-primary)' }}>LKR {pnlStatement.current.grossProfit.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-panel">
                <span style={{ color: 'var(--text-muted)' }}>Administrative & Operational Expenses</span>
                <span style={{ color: 'var(--danger)' }}>(LKR {Math.abs(pnlStatement.current.adminExpenses).toLocaleString()})</span>
              </div>
              <div className="flex justify-between py-3" style={{ background: 'rgba(99, 102, 241, 0.1)', borderRadius: '8px', padding: '12px 16px' }}>
                <span style={{ fontWeight: 900, fontSize: '1.1rem' }}>NET PROFIT FOR THE PERIOD</span>
                <span style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--success)' }}>LKR {pnlStatement.current.profitForPeriod.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
