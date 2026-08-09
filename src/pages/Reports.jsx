import React, { useContext, useState, useMemo } from 'react';
import { StoreContext } from '../context/StoreContext';
import { 
  BarChart3, TrendingUp, Users, AlertCircle, FileText, Target, Wallet, 
  Plus, Trash2, Download, Printer, FileSpreadsheet, Scale, CheckCircle2, 
  Layers, RefreshCw, Calendar, ArrowUpRight, DollarSign, Building2, ShieldCheck, HelpCircle
} from 'lucide-react';
import { exportToCSV, exportToExcel } from '../utils/export';
import { generateSLFRSFinancialStatementsPDF } from '../utils/pdfGenerator';
import { generatePnLStatement, generateBalanceSheet, generateCashFlowStatement } from '../utils/slfrsEngine';
import DatePicker from '../components/DatePicker';

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
    smsConfig = {},
    getInvoicePaymentSummary
  } = useContext(StoreContext) || {};

  // Active Tab: 'pnl' | 'balance_sheet' | 'cash_flow' | 'trial_balance' | 'kpi_overview'
  const [activeTab, setActiveTab] = useState('pnl');

  // Shared Reporting Period Controls
  const [periodPreset, setPeriodPreset] = useState('this_year'); // 'this_month' | 'this_quarter' | 'this_year' | 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

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

      // Prior Month
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

  // --- SLFRS / LKAS COMPUTATION ENGINE ---
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

  // Trial balance from journal_lines
  const trialBalance = useMemo(() => {
    return accounts.map(acc => {
      const accLines = journalLines.filter(l => l.accountId === acc.id);
      const totalDebit = accLines.reduce((s, l) => s + Number(l.debit || 0), 0);
      const totalCredit = accLines.reduce((s, l) => s + Number(l.credit || 0), 0);
      const net = (acc.type === 'revenue' || acc.type === 'liability' || acc.type === 'equity')
        ? totalCredit - totalDebit
        : totalDebit - totalCredit;
      return { ...acc, totalDebit, totalCredit, net };
    });
  }, [accounts, journalLines]);

  const companyLegalName = smsConfig.companyName || 'Seynex Technology (Pvt) Ltd';

  const handleExportPDF = () => {
    generateSLFRSFinancialStatementsPDF({
      companyName: companyLegalName,
      periodLabel: dateRange.periodLabel,
      pnl: pnlStatement,
      balanceSheet,
      cashFlow: cashFlowStatement
    });
  };

  const fmtLKR = (val) => {
    if (val === 0 || val === undefined || val === null) return '—';
    const num = Number(val);
    if (isNaN(num)) return '—';
    return num < 0 ? `(LKR ${Math.abs(num).toLocaleString()})` : `LKR ${num.toLocaleString()}`;
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
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>SLFRS / LKAS Compliant</span>
                <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>General Ledger Audited</span>
              </div>
              <h1 className="h1" style={{ margin: 0 }}>Financial Statements Suite</h1>
            </div>
          </div>
          <p className="text-secondary" style={{ fontSize: '0.9rem', margin: 0 }}>
            Official financial statements for <strong>{companyLegalName}</strong> prepared in accordance with Sri Lanka Accounting Standards (SLFRS/LKAS 1 & LKAS 7).
          </p>
        </div>

        {/* EXPORT ACTION BUTTONS */}
        <div className="flex items-center gap-3">
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={handleExportPDF}
            style={{ padding: '10px 20px', fontSize: '0.88rem', gap: '8px' }}
          >
            <Download size={16} /> Export Official SLFRS PDF
          </button>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => exportToCSV('Trial_Balance_Ledger', trialBalance)}
            style={{ padding: '10px 16px', fontSize: '0.88rem', gap: '6px' }}
          >
            <FileSpreadsheet size={16} /> CSV
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
          <div className="flex items-center gap-4 pt-3" style={{ borderTop: '1px solid var(--panel-border)', marginTop: '8px' }}>
            <div className="flex items-center gap-2" style={{ flex: '1 1 200px', maxWidth: '260px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Start Date:</span>
              <DatePicker value={customStartDate} onChange={setCustomStartDate} placeholder="Start Date" />
            </div>
            <div className="flex items-center gap-2" style={{ flex: '1 1 200px', maxWidth: '260px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>End Date:</span>
              <DatePicker value={customEndDate} onChange={setCustomEndDate} placeholder="End Date" />
            </div>
          </div>
        )}
      </div>

      {/* NAVIGATION STATEMENT TABS */}
      <div className="glass-panel" style={{ padding: '6px', marginBottom: '24px', display: 'flex', gap: '6px', overflowX: 'auto' }}>
        <button 
          className={`btn ${activeTab === 'pnl' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, padding: '10px 16px', fontSize: '0.86rem', borderRadius: '10px', justifyContent: 'center' }}
          onClick={() => setActiveTab('pnl')}
        >
          <BarChart3 size={16} /> 1. Profit or Loss (LKAS 1)
        </button>
        <button 
          className={`btn ${activeTab === 'balance_sheet' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, padding: '10px 16px', fontSize: '0.86rem', borderRadius: '10px', justifyContent: 'center' }}
          onClick={() => setActiveTab('balance_sheet')}
        >
          <Building2 size={16} /> 2. Financial Position / Balance Sheet
        </button>
        <button 
          className={`btn ${activeTab === 'cash_flow' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, padding: '10px 16px', fontSize: '0.86rem', borderRadius: '10px', justifyContent: 'center' }}
          onClick={() => setActiveTab('cash_flow')}
        >
          <Wallet size={16} /> 3. Statement of Cash Flows (LKAS 7)
        </button>
        <button 
          className={`btn ${activeTab === 'trial_balance' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, padding: '10px 16px', fontSize: '0.86rem', borderRadius: '10px', justifyContent: 'center' }}
          onClick={() => setActiveTab('trial_balance')}
        >
          <Layers size={16} /> 4. Ledger & Trial Balance
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: STATEMENT OF PROFIT OR LOSS (LKAS 1) */}
      {/* ========================================================================= */}
      {activeTab === 'pnl' && (
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div className="flex justify-between items-center mb-6" style={{ paddingBottom: '14px', borderBottom: '1px solid var(--panel-border)' }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>LKAS 1 Standard</div>
              <h2 className="h2" style={{ margin: 0, fontSize: '1.3rem' }}>Statement of Profit or Loss</h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>For the period ended {dateRange.endDate || 'Current Period'}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Accounting Standard</div>
              <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>LKAS 1 (Sri Lanka)</strong>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '50%' }}>Line Item Classification</th>
                  <th style={{ textAlign: 'right', width: '25%' }}>Current Period ({dateRange.periodLabel})</th>
                  <th style={{ textAlign: 'right', width: '25%' }}>Prior Comparative Period</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '0.9rem' }}>
                <tr>
                  <td style={{ fontWeight: 600 }}>Revenue</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>{fmtLKR(pnlStatement.current.revenue)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{fmtLKR(pnlStatement.prior.revenue)}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Cost of Sales</td>
                  <td style={{ textAlign: 'right', color: 'var(--danger)' }}>({fmtLKR(pnlStatement.current.costOfSales)})</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>({fmtLKR(pnlStatement.prior.costOfSales)})</td>
                </tr>
                <tr style={{ background: 'var(--subtle-bg)', borderTop: '1px solid var(--panel-border)', borderBottom: '1px solid var(--panel-border)' }}>
                  <td style={{ fontWeight: 850, fontSize: '0.95rem' }}>GROSS PROFIT</td>
                  <td style={{ textAlign: 'right', fontWeight: 850, fontSize: '0.95rem', color: pnlStatement.current.grossProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {fmtLKR(pnlStatement.current.grossProfit)}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-muted)' }}>{fmtLKR(pnlStatement.prior.grossProfit)}</td>
                </tr>

                <tr>
                  <td style={{ paddingLeft: '20px', color: 'var(--text-secondary)' }}>Other Income</td>
                  <td style={{ textAlign: 'right' }}>{fmtLKR(pnlStatement.current.otherIncome)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{fmtLKR(pnlStatement.prior.otherIncome)}</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '20px', color: 'var(--text-secondary)' }}>Distribution Costs</td>
                  <td style={{ textAlign: 'right', color: 'var(--danger)' }}>({fmtLKR(pnlStatement.current.distributionCosts)})</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>({fmtLKR(pnlStatement.prior.distributionCosts)})</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '20px', color: 'var(--text-secondary)' }}>Administrative Expenses</td>
                  <td style={{ textAlign: 'right', color: 'var(--danger)' }}>({fmtLKR(pnlStatement.current.adminExpenses)})</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>({fmtLKR(pnlStatement.prior.adminExpenses)})</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '20px', color: 'var(--text-secondary)' }}>Other Expenses</td>
                  <td style={{ textAlign: 'right', color: 'var(--danger)' }}>({fmtLKR(pnlStatement.current.otherExpenses)})</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>({fmtLKR(pnlStatement.prior.otherExpenses)})</td>
                </tr>

                <tr style={{ background: 'var(--subtle-bg)', borderTop: '1px solid var(--panel-border)', borderBottom: '1px solid var(--panel-border)' }}>
                  <td style={{ fontWeight: 850, fontSize: '0.95rem' }}>OPERATING PROFIT</td>
                  <td style={{ textAlign: 'right', fontWeight: 850, fontSize: '0.95rem', color: pnlStatement.current.operatingProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {fmtLKR(pnlStatement.current.operatingProfit)}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-muted)' }}>{fmtLKR(pnlStatement.prior.operatingProfit)}</td>
                </tr>

                <tr>
                  <td style={{ paddingLeft: '20px', color: 'var(--text-secondary)' }}>Finance Income</td>
                  <td style={{ textAlign: 'right' }}>{fmtLKR(pnlStatement.current.financeIncome)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{fmtLKR(pnlStatement.prior.financeIncome)}</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '20px', color: 'var(--text-secondary)' }}>Finance Costs</td>
                  <td style={{ textAlign: 'right', color: 'var(--danger)' }}>({fmtLKR(pnlStatement.current.financeCosts)})</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>({fmtLKR(pnlStatement.prior.financeCosts)})</td>
                </tr>

                <tr style={{ background: 'rgba(99, 102, 241, 0.08)', borderTop: '2px solid var(--accent-primary)' }}>
                  <td style={{ fontWeight: 850, fontSize: '1rem', color: 'var(--accent-primary)' }}>PROFIT BEFORE TAX</td>
                  <td style={{ textAlign: 'right', fontWeight: 850, fontSize: '1rem', color: 'var(--accent-primary)' }}>
                    {fmtLKR(pnlStatement.current.profitBeforeTax)}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-muted)' }}>{fmtLKR(pnlStatement.prior.profitBeforeTax)}</td>
                </tr>

                <tr>
                  <td style={{ paddingLeft: '20px', color: 'var(--text-secondary)' }}>Income Tax Expense</td>
                  <td style={{ textAlign: 'right', color: 'var(--danger)' }}>({fmtLKR(pnlStatement.current.taxExpense)})</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>({fmtLKR(pnlStatement.prior.taxExpense)})</td>
                </tr>

                <tr style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(99, 102, 241, 0.15))', borderTop: '2px solid var(--success)', borderBottom: '2px double var(--success)' }}>
                  <td style={{ fontWeight: 900, fontSize: '1.05rem', color: 'var(--text-primary)' }}>PROFIT FOR THE PERIOD</td>
                  <td style={{ textAlign: 'right', fontWeight: 900, fontSize: '1.05rem', color: pnlStatement.current.profitForPeriod >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {fmtLKR(pnlStatement.current.profitForPeriod)}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--text-muted)' }}>{fmtLKR(pnlStatement.prior.profitForPeriod)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '20px', padding: '14px', background: 'var(--subtle-bg)', borderRadius: '12px', fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HelpCircle size={16} color="var(--accent-primary)" />
            <span>Note: Depreciation & Amortisation included within Administrative Expenses for the period: <strong>{fmtLKR(pnlStatement.current.depreciationDisclosed)}</strong>.</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: STATEMENT OF FINANCIAL POSITION / BALANCE SHEET (LKAS 1) */}
      {/* ========================================================================= */}
      {activeTab === 'balance_sheet' && (
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div className="flex justify-between items-center mb-6" style={{ paddingBottom: '14px', borderBottom: '1px solid var(--panel-border)' }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>LKAS 1 Standard</div>
              <h2 className="h2" style={{ margin: 0, fontSize: '1.3rem' }}>Statement of Financial Position (Balance Sheet)</h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ending balances as at {dateRange.endDate || 'Current Date'}</p>
            </div>
          </div>

          {/* BALANCE CHECK VALIDATION BANNER */}
          <div style={{
            padding: '14px 18px', borderRadius: '14px', marginBottom: '24px',
            background: balanceSheet.isBalanced ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.15)',
            border: `1px solid ${balanceSheet.isBalanced ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.4)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div className="flex items-center gap-3">
              {balanceSheet.isBalanced ? (
                <CheckCircle2 size={22} color="var(--success)" />
              ) : (
                <AlertCircle size={22} color="var(--danger)" />
              )}
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: balanceSheet.isBalanced ? 'var(--success)' : 'var(--danger)' }}>
                  {balanceSheet.isBalanced ? "✓ BALANCE SHEET BALANCED" : "⚠️ UNBALANCED SHEET ERROR DETECTED"}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Total Assets: <strong>{fmtLKR(balanceSheet.totalAssets)}</strong> | Total Equity & Liabilities: <strong>{fmtLKR(balanceSheet.totalEquityAndLiabilities)}</strong>
                </div>
              </div>
            </div>
            {!balanceSheet.isBalanced && (
              <span className="badge badge-danger">Discrepancy: {fmtLKR(balanceSheet.discrepancy)}</span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* ASSETS COLUMN */}
            <div>
              <h3 className="h3 mb-3" style={{ fontSize: '1.05rem', color: 'var(--accent-primary)', borderBottom: '2px solid var(--accent-primary)', paddingBottom: '6px' }}>
                ASSETS
              </h3>

              {/* Non-Current Assets */}
              <div className="mb-4">
                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '6px' }}>Non-Current Assets</div>
                <div className="flex justify-between text-secondary py-1" style={{ fontSize: '0.85rem' }}>
                  <span>Property, Plant & Equipment (Net)</span>
                  <span>{fmtLKR(balanceSheet.nonCurrentAssets.ppeNet)}</span>
                </div>
                <div className="flex justify-between text-secondary py-1" style={{ fontSize: '0.85rem' }}>
                  <span>Intangible Assets</span>
                  <span>{fmtLKR(balanceSheet.nonCurrentAssets.intangibles)}</span>
                </div>
                <div className="flex justify-between font-bold py-1" style={{ fontSize: '0.88rem', borderTop: '1px solid var(--subtle-border)' }}>
                  <span>Total Non-Current Assets</span>
                  <span>{fmtLKR(balanceSheet.nonCurrentAssets.total)}</span>
                </div>
              </div>

              {/* Current Assets */}
              <div className="mb-4">
                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '6px' }}>Current Assets</div>
                <div className="flex justify-between text-secondary py-1" style={{ fontSize: '0.85rem' }}>
                  <span>Inventory</span>
                  <span>{fmtLKR(balanceSheet.currentAssets.inventory)}</span>
                </div>
                <div className="flex justify-between text-secondary py-1" style={{ fontSize: '0.85rem' }}>
                  <span>Trade Receivables (Accounts Receivable)</span>
                  <span>{fmtLKR(balanceSheet.currentAssets.tradeReceivables)}</span>
                </div>
                <div className="flex justify-between text-secondary py-1" style={{ fontSize: '0.85rem' }}>
                  <span>Cash and Cash Equivalents</span>
                  <span>{fmtLKR(balanceSheet.currentAssets.cashAndEquivalents)}</span>
                </div>
                <div className="flex justify-between font-bold py-1" style={{ fontSize: '0.88rem', borderTop: '1px solid var(--subtle-border)' }}>
                  <span>Total Current Assets</span>
                  <span>{fmtLKR(balanceSheet.currentAssets.total)}</span>
                </div>
              </div>

              <div className="flex justify-between p-3 rounded-lg" style={{ background: 'var(--subtle-bg)', border: '1px solid var(--accent-primary)', fontWeight: 900, fontSize: '1rem' }}>
                <span>TOTAL ASSETS</span>
                <span style={{ color: 'var(--accent-primary)' }}>{fmtLKR(balanceSheet.totalAssets)}</span>
              </div>
            </div>

            {/* EQUITY AND LIABILITIES COLUMN */}
            <div>
              <h3 className="h3 mb-3" style={{ fontSize: '1.05rem', color: '#a855f7', borderBottom: '2px solid #a855f7', paddingBottom: '6px' }}>
                EQUITY AND LIABILITIES
              </h3>

              {/* Equity */}
              <div className="mb-4">
                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '6px' }}>Equity</div>
                <div className="flex justify-between text-secondary py-1" style={{ fontSize: '0.85rem' }}>
                  <span>Stated Capital / Owner's Equity</span>
                  <span>{fmtLKR(balanceSheet.equity.statedCapital)}</span>
                </div>
                <div className="flex justify-between text-secondary py-1" style={{ fontSize: '0.85rem' }}>
                  <span>Retained Earnings (Rolled Forward)</span>
                  <span>{fmtLKR(balanceSheet.equity.retainedEarningsRolled)}</span>
                </div>
                <div className="flex justify-between font-bold py-1" style={{ fontSize: '0.88rem', borderTop: '1px solid var(--subtle-border)' }}>
                  <span>Total Equity</span>
                  <span>{fmtLKR(balanceSheet.equity.total)}</span>
                </div>
              </div>

              {/* Non-Current Liabilities */}
              <div className="mb-4">
                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '6px' }}>Non-Current Liabilities</div>
                <div className="flex justify-between text-secondary py-1" style={{ fontSize: '0.85rem' }}>
                  <span>Long-Term Loans</span>
                  <span>{fmtLKR(balanceSheet.nonCurrentLiabilities.longTermLoans)}</span>
                </div>
                <div className="flex justify-between font-bold py-1" style={{ fontSize: '0.88rem', borderTop: '1px solid var(--subtle-border)' }}>
                  <span>Total Non-Current Liabilities</span>
                  <span>{fmtLKR(balanceSheet.nonCurrentLiabilities.total)}</span>
                </div>
              </div>

              {/* Current Liabilities */}
              <div className="mb-4">
                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '6px' }}>Current Liabilities</div>
                <div className="flex justify-between text-secondary py-1" style={{ fontSize: '0.85rem' }}>
                  <span>Trade Payables (Accounts Payable)</span>
                  <span>{fmtLKR(balanceSheet.currentLiabilities.tradePayables)}</span>
                </div>
                <div className="flex justify-between text-secondary py-1" style={{ fontSize: '0.85rem' }}>
                  <span>Tax Payable</span>
                  <span>{fmtLKR(balanceSheet.currentLiabilities.taxPayable)}</span>
                </div>
                <div className="flex justify-between text-secondary py-1" style={{ fontSize: '0.85rem' }}>
                  <span>Short-Term Borrowings</span>
                  <span>{fmtLKR(balanceSheet.currentLiabilities.shortTermBorrowings)}</span>
                </div>
                <div className="flex justify-between font-bold py-1" style={{ fontSize: '0.88rem', borderTop: '1px solid var(--subtle-border)' }}>
                  <span>Total Current Liabilities</span>
                  <span>{fmtLKR(balanceSheet.currentLiabilities.total)}</span>
                </div>
              </div>

              <div className="flex justify-between p-3 rounded-lg" style={{ background: 'var(--subtle-bg)', border: '1px solid #a855f7', fontWeight: 900, fontSize: '1rem' }}>
                <span>TOTAL EQUITY AND LIABILITIES</span>
                <span style={{ color: '#a855f7' }}>{fmtLKR(balanceSheet.totalEquityAndLiabilities)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: STATEMENT OF CASH FLOWS (LKAS 7 - INDIRECT METHOD) */}
      {/* ========================================================================= */}
      {activeTab === 'cash_flow' && (
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div className="flex justify-between items-center mb-6" style={{ paddingBottom: '14px', borderBottom: '1px solid var(--panel-border)' }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>LKAS 7 Indirect Method</div>
              <h2 className="h2" style={{ margin: 0, fontSize: '1.3rem' }}>Statement of Cash Flows</h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Reconciliation for the period ended {dateRange.endDate || 'Current Period'}</p>
            </div>
          </div>

          {/* CASH RECONCILIATION BANNER */}
          <div style={{
            padding: '14px 18px', borderRadius: '14px', marginBottom: '24px',
            background: cashFlowStatement.isReconciled ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.15)',
            border: `1px solid ${cashFlowStatement.isReconciled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.4)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div className="flex items-center gap-3">
              {cashFlowStatement.isReconciled ? (
                <CheckCircle2 size={22} color="var(--success)" />
              ) : (
                <AlertCircle size={22} color="var(--warning)" />
              )}
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: cashFlowStatement.isReconciled ? 'var(--success)' : 'var(--warning)' }}>
                  {cashFlowStatement.isReconciled ? "✓ CASH RECONCILED WITH GENERAL LEDGER" : "⚠️ CASH DISCREPANCY DETECTED"}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Ending Cash Flow: <strong>{fmtLKR(cashFlowStatement.cashAtEndCalculated)}</strong> | Ledger Cash + Bank Sum: <strong>{fmtLKR(cashFlowStatement.cashAtEndActual)}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Cash Flow Activity Classification</th>
                  <th style={{ textAlign: 'right' }}>Amount (LKR)</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '0.9rem' }}>
                <tr style={{ background: 'var(--subtle-bg)' }}>
                  <td colSpan={2} style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>1. Cash Flows from Operating Activities</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '20px' }}>Profit Before Tax</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtLKR(cashFlowStatement.operating.pbt)}</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '32px', color: 'var(--text-muted)' }}>Adjustments for: Depreciation and Amortisation</td>
                  <td style={{ textAlign: 'right' }}>{fmtLKR(cashFlowStatement.operating.depreciation)}</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '32px', color: 'var(--text-muted)' }}>Adjustments for: Finance Costs</td>
                  <td style={{ textAlign: 'right' }}>{fmtLKR(cashFlowStatement.operating.financeCosts)}</td>
                </tr>
                <tr style={{ borderTop: '1px solid var(--subtle-border)' }}>
                  <td style={{ paddingLeft: '20px', fontWeight: 700 }}>Operating Profit Before Working Capital Changes</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtLKR(cashFlowStatement.operating.operatingProfitBeforeWC)}</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '32px', color: 'var(--text-muted)' }}>(Increase)/Decrease in Trade Receivables</td>
                  <td style={{ textAlign: 'right' }}>{fmtLKR(cashFlowStatement.operating.deltaReceivables)}</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '32px', color: 'var(--text-muted)' }}>(Increase)/Decrease in Inventory</td>
                  <td style={{ textAlign: 'right' }}>{fmtLKR(cashFlowStatement.operating.deltaInventory)}</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '32px', color: 'var(--text-muted)' }}>Increase/(Decrease) in Trade Payables</td>
                  <td style={{ textAlign: 'right' }}>{fmtLKR(cashFlowStatement.operating.deltaPayables)}</td>
                </tr>
                <tr style={{ borderTop: '1px solid var(--subtle-border)' }}>
                  <td style={{ paddingLeft: '20px', fontWeight: 700 }}>Cash Generated from Operations</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtLKR(cashFlowStatement.operating.cashGeneratedFromOps)}</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '20px', color: 'var(--danger)' }}>Income Tax Paid</td>
                  <td style={{ textAlign: 'right', color: 'var(--danger)' }}>({fmtLKR(cashFlowStatement.operating.taxPaid)})</td>
                </tr>
                <tr style={{ background: 'rgba(99, 102, 241, 0.08)', fontWeight: 800 }}>
                  <td style={{ paddingLeft: '20px' }}>Net Cash from Operating Activities</td>
                  <td style={{ textAlign: 'right', color: 'var(--accent-primary)' }}>{fmtLKR(cashFlowStatement.operating.netCashOperating)}</td>
                </tr>

                <tr style={{ background: 'var(--subtle-bg)' }}>
                  <td colSpan={2} style={{ fontWeight: 800, color: '#a855f7' }}>2. Cash Flows from Investing Activities</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '20px' }}>Purchase of Property, Plant & Equipment</td>
                  <td style={{ textAlign: 'right', color: 'var(--danger)' }}>({fmtLKR(cashFlowStatement.investing.ppePurchase)})</td>
                </tr>
                <tr style={{ background: 'rgba(168, 85, 247, 0.08)', fontWeight: 800 }}>
                  <td style={{ paddingLeft: '20px' }}>Net Cash used in Investing Activities</td>
                  <td style={{ textAlign: 'right', color: '#a855f7' }}>{fmtLKR(cashFlowStatement.investing.netCashInvesting)}</td>
                </tr>

                <tr style={{ background: 'var(--subtle-bg)' }}>
                  <td colSpan={2} style={{ fontWeight: 800, color: 'var(--success)' }}>3. Cash Flows from Financing Activities</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '20px' }}>Proceeds from Borrowings</td>
                  <td style={{ textAlign: 'right' }}>{fmtLKR(cashFlowStatement.financing.loanProceeds)}</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '20px' }}>Repayment of Borrowings</td>
                  <td style={{ textAlign: 'right', color: 'var(--danger)' }}>({fmtLKR(cashFlowStatement.financing.loanRepayments)})</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '20px' }}>Owner's Drawings / Dividends Paid</td>
                  <td style={{ textAlign: 'right', color: 'var(--danger)' }}>({fmtLKR(cashFlowStatement.financing.drawingsPaid)})</td>
                </tr>
                <tr style={{ background: 'rgba(16, 185, 129, 0.08)', fontWeight: 800 }}>
                  <td style={{ paddingLeft: '20px' }}>Net Cash from/(used in) Financing Activities</td>
                  <td style={{ textAlign: 'right', color: 'var(--success)' }}>{fmtLKR(cashFlowStatement.financing.netCashFinancing)}</td>
                </tr>

                <tr style={{ borderTop: '2px solid var(--panel-border)', fontWeight: 850 }}>
                  <td>NET INCREASE IN CASH AND CASH EQUIVALENTS</td>
                  <td style={{ textAlign: 'right', fontWeight: 850 }}>{fmtLKR(cashFlowStatement.netIncreaseInCash)}</td>
                </tr>
                <tr>
                  <td>Cash and Cash Equivalents at Beginning of Period</td>
                  <td style={{ textAlign: 'right' }}>{fmtLKR(cashFlowStatement.cashAtBeginning)}</td>
                </tr>
                <tr style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(16, 185, 129, 0.15))', borderTop: '2px solid var(--accent-primary)', borderBottom: '2px double var(--accent-primary)' }}>
                  <td style={{ fontWeight: 900, fontSize: '1rem' }}>CASH AND CASH EQUIVALENTS AT END OF PERIOD</td>
                  <td style={{ textAlign: 'right', fontWeight: 900, fontSize: '1rem', color: 'var(--success)' }}>{fmtLKR(cashFlowStatement.cashAtEndCalculated)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: GENERAL LEDGER & TRIAL BALANCE AUDIT */}
      {/* ========================================================================= */}
      {activeTab === 'trial_balance' && (
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div className="flex justify-between items-center mb-6" style={{ paddingBottom: '14px', borderBottom: '1px solid var(--panel-border)' }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Audit Ledger</div>
              <h2 className="h2" style={{ margin: 0, fontSize: '1.3rem' }}>General Ledger Trial Balance</h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Raw double-entry debit/credit postings across chart of accounts</p>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Account Name</th>
                  <th>Classification</th>
                  <th>SLFRS Category</th>
                  <th style={{ textAlign: 'right' }}>Total Debit</th>
                  <th style={{ textAlign: 'right' }}>Total Credit</th>
                  <th style={{ textAlign: 'right' }}>Net Balance</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '0.85rem' }}>
                {trialBalance.map(acc => (
                  <tr key={acc.id}>
                    <td><code>{acc.code}</code></td>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{acc.name}</td>
                    <td>
                      <span className="badge badge-secondary" style={{ fontSize: '0.68rem', textTransform: 'uppercase' }}>{acc.type}</span>
                    </td>
                    <td>
                      <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>{acc.statement_category}</span>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{acc.totalDebit > 0 ? fmtLKR(acc.totalDebit) : '—'}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{acc.totalCredit > 0 ? fmtLKR(acc.totalCredit) : '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: acc.net >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmtLKR(acc.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
